"""Fonte de verdade da demo: agrega populações elegíveis, sem estimar CMV."""

from calendar import monthrange
from bisect import bisect_right
from collections import defaultdict
from . import __version__
from .decompose import decompose
from datetime import date, timedelta

from .data import validate, validate_purchases

SUM_FIELDS = (
    "revenue",
    "eligible_revenue",
    "cmv",
    "quantity",
    "eligible_quantity",
    "target_value",
    "target_revenue",
    "target_gross",
    "discount",
    "commission",
    "count",
    "eligible_count",
)


def target_index(data):
    """Indexa vigências por SKU, sem alterar a base; sobreposições são recusadas."""
    grouped = defaultdict(list)
    for target in data["targets"]:
        start, end = date.fromisoformat(target["start"]), date.fromisoformat(target["end"])
        if end <= start or isinstance(target["bps"], bool) or not isinstance(target["bps"], int) or not 0 <= target["bps"] < 10000:
            raise ValueError("Vigência ou percentual da meta inválido.")
        grouped[target["sku"]].append(target)
    index = {}
    for sku, rows in grouped.items():
        rows.sort(key=lambda t: t["start"])
        if any(a["end"] > b["start"] for a, b in zip(rows, rows[1:])):
            raise ValueError("Vigências de metas sobrepostas.")
        index[sku] = ([t["start"] for t in rows], rows)
    return index


def target_for(data, sku, day, *, index=None):
    index = target_index(data) if index is None else index
    starts, rows = index.get(sku, ([], []))
    position = bisect_right(starts, day) - 1
    if position >= 0 and day < rows[position]["end"]:
        return rows[position]["bps"]
    return None


def aggregate(rows, data, *, targets=None):
    targets = target_index(data) if targets is None else targets
    a = {k: 0 for k in SUM_FIELDS}
    a["abs_revenue"] = 0
    a["abs_covered"] = 0
    for r in rows:
        a["revenue"] += r["revenue"]
        a["quantity"] += r["quantity"]
        a["count"] += 1
        a["abs_revenue"] += abs(r["revenue"])
        a["discount"] += r["discount"]
        if not r["eligible"]:
            continue
        a["eligible_revenue"] += r["revenue"]
        a["cmv"] += r["cmv"]
        a["eligible_quantity"] += r["quantity"]
        a["eligible_count"] += 1
        a["abs_covered"] += abs(r["revenue"])
        a["commission"] += round_half_up(r["revenue"] * r["channel_bps"], 10000)
        target = target_for(data, r["sku"], r["date"], index=targets)
        if target is not None:
            a["target_value"] += round_half_up(r["revenue"] * target, 10000)
            a["target_revenue"] += r["revenue"]
            a["target_gross"] += r["revenue"] - r["cmv"]
    return finish(a)


def round_half_up(n, d):
    return (1 if n >= 0 else -1) * ((abs(n) + d // 2) // d)


def finish(a):
    a = dict(a)
    a["gross"] = a["eligible_revenue"] - a["cmv"] if a["eligible_count"] else None
    a["margin"] = (
        a["gross"] / a["eligible_revenue"] if a["eligible_revenue"] > 0 else None
    )
    a["coverage"] = a["abs_covered"] / a["abs_revenue"] if a["abs_revenue"] else None
    a["gap"] = (
        max(0, a["target_value"] - a["target_gross"])
        if a["target_revenue"] > 0
        else None
    )
    return a


def combine(aggregates):
    return finish(
        {
            k: sum(a[k] for a in aggregates)
            for k in SUM_FIELDS + ("abs_revenue", "abs_covered")
        }
    )


def windows(start, end):
    """Janelas semiabertas [start, end); a UI converte o fim inclusivo antes de chamar."""
    s, e = date.fromisoformat(start), date.fromisoformat(end)
    if e <= s:
        raise ValueError("Período vazio ou invertido.")
    previous = (s - (e - s), s)
    def year_before(day):
        return day.replace(year=day.year - 1, day=min(day.day, monthrange(day.year - 1, day.month)[1]))
    # Translada os dois extremos inclusivos. 29/02 vira 28/02 quando necessário.
    year = (year_before(s), year_before(e - timedelta(days=1)) + timedelta(days=1))
    first = s.replace(day=1)
    month = first.year * 12 + first.month - 1 - 3
    return dict(
        current=[s.isoformat(), e.isoformat()],
        previous=[x.isoformat() for x in previous],
        year=[x.isoformat() for x in year],
        three=[date(month // 12, month % 12 + 1, 1).isoformat(), first.isoformat()],
    )


def purchases_for(data, product, end, *, index=None):
    index = validate_purchases(data) if index is None else index
    errors = index["issues_by_sku"].get(product["sku"], [])
    blocked = [e for e in errors if e["duplicate"] or not e["date_valid"] or e["date"] < end]
    if blocked:
        reasons = sorted({reason for e in blocked for reason in e["reasons"]})
        return dict(valid=False, reason="; ".join(reasons))
    rows = [r for r in index["rows_by_sku"].get(product["sku"], []) if r["date"] < end]
    last = rows[-2:]
    if any(r["unit"] != product["unit"] for r in last):
        return dict(
            valid=False,
            reason="Unidades incompatíveis: comparação recusada (caixa × unidade).",
        )
    if any(
        not isinstance(r["cost"], int)
        or isinstance(r["cost"], bool)
        or r["cost"] < 0
        or r["quantity"] <= 0
        for r in last
    ):
        return dict(valid=False, reason="Custo ou quantidade da compra inválido")
    if len(last) < 2:
        return dict(valid=False, reason="Sem duas compras comparáveis")
    previous, current = last
    return dict(
        valid=True,
        previous=previous,
        current=current,
        change=current["cost"] / previous["cost"] - 1 if previous["cost"] > 0 else None,
    )


def analyze(data, start, end):
    """Analisa [start, end), com fim exclusivo. Não modifica registros de origem."""
    purchases = validate_purchases(data)
    rows, issues = validate(data, purchase_validation=purchases)
    targets = target_index(data)
    rows_by_sku = defaultdict(list)
    for row in rows:
        rows_by_sku[row["sku"]].append(row)
    for group in rows_by_sku.values():
        group.sort(key=lambda r: (r["date"], r["id"]))
    win = windows(start, end)
    complete = {
        name: limits[0] >= data.get("history_start", min((r["date"][:7] + "-01" for r in rows), default=start))
        and limits[1] <= (date.fromisoformat(data["as_of"]) + timedelta(days=1)).isoformat()
        for name, limits in win.items()
    }
    items = []
    rules = data.get(
        "rules",
        {
            "cost_increase": 0.10,
            "margin_drop": 0.03,
            "price_stable": 0.01,
            "price_drop": 0.05,
        },
    )
    for product in data["products"]:
        subsets = {
            name: [
                r
                for r in rows_by_sku[product["sku"]]
                if limits[0] <= r["date"] < limits[1]
            ]
            for name, limits in win.items()
        }
        a = {name: aggregate(part, data, targets=targets) for name, part in subsets.items()}
        cur = a["current"]
        purchase = purchases_for(data, product, end, index=purchases)
        alerts = []
        if cur["margin"] is not None:
            if cur["margin"] < 0:
                alerts.append("Margem negativa")
            elif cur["gap"] and cur["gap"] > 0:
                alerts.append("Abaixo da meta")
            if (
                complete["three"] and a["three"]["margin"] is not None
                and cur["margin"] - a["three"]["margin"] <= -rules["margin_drop"]
            ):
                alerts.append("Queda histórica")
        if (
            purchase["valid"]
            and purchase["change"] is not None
            and purchase["change"] >= rules["cost_increase"]
        ):
            alerts.append("Alta de custo de compra")
        price = (
            cur["eligible_revenue"] / cur["eligible_quantity"]
            if cur["eligible_quantity"] > 0
            else None
        )
        prev = a["previous"]
        oldprice = (
            prev["eligible_revenue"] / prev["eligible_quantity"]
            if prev["eligible_quantity"] > 0
            else None
        )
        if (
            price
            and oldprice
            and abs(price / oldprice - 1) < rules["price_stable"]
            and "Alta de custo de compra" in alerts
        ):
            alerts.append("Preço sem reação")
        if price and oldprice and price / oldprice < 1 - rules["price_drop"]:
            alerts.append("Queda de preço líquido")
        if cur["discount"] > 0:
            alerts.append("Desconto registrado")
        quality = []
        if cur["coverage"] is not None and cur["coverage"] < 1:
            quality.append("CMV parcial ou ausente")
        if not purchase["valid"]:
            quality.append(purchase["reason"])
        if not a["three"]["count"]:
            quality.append("Sem histórico 3M")
        if cur["count"] and not cur["target_revenue"]:
            quality.append("Meta indisponível para linhas elegíveis")
        sim = None
        if price and cur["eligible_quantity"] > 0:
            q = cur["eligible_quantity"]
            latest = subsets["current"][-1]
            sim = dict(
                p=round_half_up(cur["eligible_revenue"], q),
                c=round_half_up(cur["cmv"], q),
                q=q,
                t=latest["channel_bps"],
                m=target_for(data, product["sku"], latest["date"], index=targets) or 0,
                goal="gross",
            )
        items.append(
            dict(
                **product,
                **a,
                purchase=purchase,
                alerts=alerts,
                quality=quality,
                simulation=sim,
                severity="Crítico"
                if cur["margin"] is not None and cur["margin"] < 0
                else "Alto"
                if cur["gap"]
                else "Moderado",
                confidence="Alta"
                if cur["coverage"] == 1 and complete["three"] and a["three"]["count"] and purchase["valid"]
                else "Limitada",
                evidence_count=len(subsets["current"]),
                source_ids=[r["id"] for r in subsets["current"]],
                source_rows=subsets["current"],
            )
        )
    total = sum(max(0, i["current"]["eligible_revenue"]) for i in items)
    for i in items:
        cur = i["current"]
        # Sem meta (ou com meta parcial), o prejuízo bruto não pode desaparecer.
        impact = max(cur["gap"] or 0, max(0, -(cur["gross"] or 0)))
        if i["severity"] == "Crítico" and total > 0 and impact * 200 < total:
            i["severity"] = "Alto"
    return dict(
        windows=win,
        items=items,
        quality=issues,
        complete=complete,
    )


def snapshot(data):
    months = {}
    history = []
    for month in range(4, 11):
        start = f"2026-{month:02}-01"
        end = min(
            date(2026, month, monthrange(2026, month)[1]) + timedelta(days=1),
            date.fromisoformat(data["as_of"]) + timedelta(days=1),
        ).isoformat()
        key = start[:7]
        months[key] = analyze(data, start, end)
        months[key]["decomposition"] = {
            ref: decompose(months[key]["items"], ref) for ref in ("previous", "three")
        }
        history.append(
            dict(
                month=key,
                items=[
                    dict(
                        sku=i["sku"],
                        category=i["category"],
                        type=i["type"],
                        **i["current"],
                    )
                    for i in months[key]["items"]
                ],
            )
        )
    return dict(
        version=__version__,
        formula="cents-bps-v1",
        as_of=data["as_of"],
        seed=data["seed"],
        months=months,
        history=history,
        stories=data["stories"],
    )
