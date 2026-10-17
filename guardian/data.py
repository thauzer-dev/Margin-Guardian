"""Contrato explícito e gerador de histórias, sem biblioteca externa."""

import random
from collections import Counter
from datetime import date

AS_OF = "2026-10-13"
CATEGORY = ["Alimentos"] + ["Tecnologia"] * 2 + ["Alimentos"] + ["Tecnologia"] * 4 + ["Casa"] * 4 + ["Cuidados"] * 4 + ["Alimentos", "Tecnologia", "Casa", "Cuidados"]
STORIES = {
    "H1": "Custo em alta, preço estável",
    "H2": "Mix migra para menor margem",
    "H3": "CMV ausente",
    "H4": "Compra nova ainda não vendida",
    "H5": "Desconto registrado em alta",
    "H6": "Margem realizada negativa",
    "H7": "Grande variação, pequeno impacto",
    "H8": "Caixa e unidade sem conversão",
}


def generate(seed=2026):
    rng = random.Random(seed)
    names = [
        "Café especial 500 g",
        "Teclado básico",
        "Teclado mecânico",
        "Chá orgânico",
        "Fone sem fio",
        "Mouse ergonômico",
        "Cabo USB-C",
        "Carregador rápido",
        "Luminária de mesa",
        "Garrafa térmica",
        "Organizador",
        "Jogo de toalhas",
        "Creme hidratante",
        "Shampoo natural",
        "Sabonete vegetal",
        "Protetor solar",
        "Cápsulas de café",
        "Suporte de notebook",
        "Vela aromática",
        "Sérum facial",
    ]
    cats = ["Alimentos", "Tecnologia", "Casa", "Cuidados"]
    assigned = {
        0: "H1",
        1: "H2",
        2: "H2",
        4: "H3",
        5: "H4",
        8: "H5",
        12: "H6",
        16: "H7",
        17: "H8",
    }
    products = []
    sales = []
    purchases = []
    targets = []
    for i, name in enumerate(names):
        cat = CATEGORY[i]
        sku = f"SKU-{i + 1:03d}"
        products.append(
            dict(
                sku=sku,
                name=name,
                category=cat,
                type="Essencial" if i % 2 == 0 else "Especial",
                unit="UN",
                story=assigned.get(i, ""),
            )
        )
        targets.append(dict(sku=sku, bps=3000, start="2025-01-01", end="2027-01-01"))
        price = 15000 if i in (0, 5) else rng.randrange(30, 150) * 100
        basecost = int(price * (0.65 if i != 1 else 0.9))
        if i == 2:
            basecost = int(price * 0.5)
        for month in range(4, 11):
            cost = basecost
            if i == 0:
                cost = [9000, 9000, 9500, 10000, 10500, 10500, 12600][month - 4]
            if i == 12:
                cost = int(price * 1.12)
            if i == 16:
                cost = int(price * (0.60 if month < 10 else 1.5))
            purchasecost = int(cost * 1.35) if i == 5 and month == 10 else cost
            purchases.append(
                dict(
                    id=f"P-{sku}-{month}",
                    date=f"2026-{month:02}-01",
                    sku=sku,
                    quantity=100,
                    cost=purchasecost,
                    unit="CX" if i == 17 else "UN",
                )
            )
            for day in (3, 8, 13, 18, 23, 28):
                when = f"2026-{month:02}-{day:02}"
                if when > AS_OF:
                    continue
                q = rng.randrange(10, 35)
                if i == 1:
                    q = 8 + (month - 4) * 12
                if i == 2:
                    q = max(6, 80 - (month - 4) * 12)
                if i == 16:
                    q = 1
                discount = int(price * 0.15) * q if i == 8 and month >= 9 else 0
                sales.append(
                    dict(
                        id=f"S-{sku}-{month}-{day}",
                        date=when,
                        sku=sku,
                        quantity=q,
                        revenue=price * q - discount,
                        cmv=None if i == 4 else cost * q,
                        discount=discount,
                        channel_bps=1000 if i % 2 else 500,
                        unit="UN",
                        event="sale",
                    )
                )
    # Extensão explicitamente sintética; preserva todos os registros de abr–out/2026.
    # RNG separado evita alterar os casos de demonstração e suas evidências.
    prior_rng = random.Random(seed + 43)
    original_sales, original_buys = list(sales), list(purchases)
    for year, months in [(2025, range(1, 13)), (2026, range(1, 4))]:
        for month in months:
            for product in products:
                sku = product["sku"]
                template = next(r for r in original_buys if r["sku"] == sku)
                purchases.append({**template, "id": f"H-P-{sku}-{year}-{month}",
                                  "date": f"{year}-{month:02}-01"})
                for r in original_sales:
                    if r["sku"] != sku or not r["date"].startswith("2026-04"):
                        continue
                    q = prior_rng.randrange(10, 35) if sku != "SKU-017" else 1
                    unit_price = r["revenue"] // r["quantity"]
                    unit_cost = r["cmv"] // r["quantity"] if r["cmv"] is not None else None
                    sales.append({**r, "id": f"H-S-{sku}-{year}-{month}-{r['date'][-2:]}",
                                  "date": f"{year}-{month:02}-{r['date'][-2:]}", "quantity": q,
                                  "revenue": unit_price * q,
                                  "cmv": unit_cost * q if unit_cost is not None else None})
    sales.sort(key=lambda r: (r["date"], r["id"]))
    purchases.sort(key=lambda r: (r["date"], r["id"]))
    return dict(
        history_start="2025-01-01",
        synthetic_history="Jan/2025–mar/2026 gerados para demonstrar referências anuais; não são dados reais.",
        products=products,
        sales=sales,
        purchases=purchases,
        targets=targets,
        seed=seed,
        as_of=AS_OF,
        stories=STORIES,
        rules={
            "cost_increase": 0.10,
            "margin_drop": 0.03,
            "price_stable": 0.01,
            "price_drop": 0.05,
        },
    )


def validate_purchases(data):
    """Integridade global por ID de item de compra, inclusive entre SKUs e datas.

    IDs duplicados são ambíguos em toda a base e ficam em quarentena. Outros
    erros bloqueiam a comparação somente quando visíveis até o fim consultado;
    uma data inválida não pode ser atribuída a um período com segurança.
    """
    products = {p["sku"]: p for p in data["products"]}
    entries = data.get("purchases", [])
    counts = Counter(r.get("id") for r in entries if isinstance(r, dict)
                     and isinstance(r.get("id"), str) and r["id"].strip())
    rows_by_sku, issues_by_sku, issues = {}, {}, []
    for position, raw in enumerate(entries):
        r = raw if isinstance(raw, dict) else {}
        reasons = []
        key, sku, day = r.get("id"), r.get("sku"), r.get("date")
        duplicate = isinstance(key, str) and counts[key] > 1
        if not isinstance(key, str) or not key.strip():
            reasons.append("ID de compra ausente ou inválido")
        if duplicate:
            reasons.append("Compra com chave duplicada na base")
        if not isinstance(sku, str) or sku not in products:
            reasons.append("SKU da compra não cadastrado")
        try:
            date_valid = isinstance(day, str) and date.fromisoformat(day).isoformat() == day
        except ValueError:
            date_valid = False
        if not date_valid:
            reasons.append("Data da compra inválida")
        if any(isinstance(r.get(k), bool) or not isinstance(r.get(k), int)
               or r[k] < (1 if k == "quantity" else 0) for k in ("cost", "quantity")):
            reasons.append("Custo ou quantidade da compra inválido")
        if not isinstance(r.get("unit"), str) or not r["unit"].strip():
            reasons.append("Unidade da compra ausente ou inválida")
        if reasons:
            issue = dict(entity="purchase", id=key, sku=sku, date=day,
                         position=position, date_valid=date_valid, duplicate=duplicate,
                         reasons=reasons)
            issues.append(issue)
            if isinstance(sku, str):
                issues_by_sku.setdefault(sku, []).append(issue)
        else:
            rows_by_sku.setdefault(sku, []).append(dict(r))
    for rows in rows_by_sku.values():
        rows.sort(key=lambda r: (r["date"], r["id"]))
    return dict(rows_by_sku=rows_by_sku, issues_by_sku=issues_by_sku, issues=issues)


def validate(data, *, purchase_validation=None):
    products = {p["sku"]: p for p in data["products"]}
    if len(products) != len(data["products"]):
        raise ValueError("SKU repetido no cadastro.")
    issues = []
    valid = []
    duplicates = {
        key
        for key, count in Counter(r["id"] for r in data["sales"]).items()
        if count > 1
    }
    for raw in data["sales"]:
        r = dict(raw)
        reasons = []
        if r["id"] in duplicates:
            reasons.append("Chave de item duplicada")
        if r["sku"] not in products:
            reasons.append("SKU não cadastrado")
        try:
            date.fromisoformat(r["date"])
        except (ValueError, TypeError):
            reasons.append("Data inválida")
        for key in ("quantity", "revenue", "channel_bps", "discount"):
            if isinstance(r.get(key), bool) or not isinstance(r.get(key), int):
                reasons.append("Campo numérico inválido: " + key)
        if not reasons:
            event = r.get("event")
            if event == "cancelled":
                continue
            if event not in ("sale", "return"):
                reasons.append("Evento desconhecido")
            elif event == "sale" and (r["quantity"] <= 0 or r["revenue"] <= 0):
                reasons.append("Venda deve ter volume e receita positivos")
            elif event == "return" and (r["quantity"] >= 0 or r["revenue"] >= 0):
                reasons.append("Devolução exige volume e receita negativos")
            if not 0 <= r["channel_bps"] < 10000:
                reasons.append("Taxa inválida")
            if r["unit"] != products[r["sku"]]["unit"]:
                reasons.append("Unidade da venda incompatível")
        if reasons:
            issues.append(dict(id=r["id"], sku=r["sku"], reasons=reasons))
            continue
        cost = r.get("cmv")
        r["eligible"] = (
            isinstance(cost, int)
            and not isinstance(cost, bool)
            and (cost >= 0 if r["event"] == "sale" else cost <= 0)
        )
        if not r["eligible"]:
            issues.append(
                dict(id=r["id"], sku=r["sku"], reasons=["CMV ausente ou inválido"])
            )
        valid.append(r)
    audit = purchase_validation if purchase_validation is not None else validate_purchases(data)
    return valid, issues + audit["issues"]
