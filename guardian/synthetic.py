"""Base diária sintética v1: mesma construção em toda a série, sem emendas.

Não calibra nem prevê demanda real. H1–H8 são intervenções didáticas explícitas.
O gerador antigo permanece como fixture de regressão, nunca como evidência real.
"""
import math
import random
from datetime import date, timedelta

from .data import generate, AS_OF


def generate_daily(seed=2026):
    legacy = generate(seed)
    rng = random.Random(seed + 450)
    out = {k: legacy[k] for k in ("products", "stories", "rules", "history_start", "as_of")}
    out.update(sales=[], purchases=[], targets=[], seed=seed,
               synthetic_history="Base diária inteiramente sintética, processo único desde jan/2025; eventos H1–H8 intencionais. Não validada com dados reais.")
    goals = {"Alimentos": 2800, "Tecnologia": 2600, "Casa": 3200, "Cuidados": 3500}
    first, last = date.fromisoformat(out["history_start"]), date.fromisoformat(AS_OF)
    for n, product in enumerate(out["products"]):
        sku, cat = product["sku"], product["category"]
        goal = goals[cat]
        out["targets"].extend([
            dict(sku=sku, bps=goal, start="2025-01-01", end="2026-07-01"),
            dict(sku=sku, bps=goal + 100, start="2026-07-01", end="2027-01-01"),
        ])
        price = 15000 if n in (0, 5) else (40 + n * 7) * 100
        if n == 16:
            price = 1200
        ratio = .90 if n == 1 else .50 if n == 2 else .65
        drift = 1.
        day = first
        while day <= last:
            stamp = day.isoformat()
            elapsed = (day - first).days
            # Pequeno passeio de custo; nenhum ramo especial em abril/2026.
            drift = max(.97, min(1.04, drift + rng.uniform(-.0007, .0008)))
            season = 1 + .10 * math.sin(2 * math.pi * (day.timetuple().tm_yday + n * 13) / 365.25)
            weekday = [.95, 1.02, 1.04, 1.08, 1.20, .75, .55][day.weekday()]
            q = max(1, round((8 + n % 5) * season * weekday * rng.uniform(.65, 1.35)))
            p = round(price * (1 + .00002 * elapsed) * rng.uniform(.992, 1.008))
            c = round(price * ratio * drift * rng.uniform(.995, 1.005))
            if n == 0:  # H1: degrau de custo em outubro, preço quase estável.
                c = round(10500 * drift * (1.22 if stamp >= "2026-10-01" else 1))
            if n in (1, 2):  # H2: migração de volume, não alteração de margem.
                progress = max(0, min(1, (day - date(2026, 7, 1)).days / 100))
                q = max(1, round(q * ((.5 + 2 * progress) if n == 1 else (2 - 1.6 * progress))))
            discount = round(p * .15) * q if n == 8 and stamp >= "2026-10-01" else 0
            if n == 12:  # H6: margem crônica próxima a -12%, com variação real.
                c = round(p * rng.uniform(1.116, 1.124))
            if n == 16:  # H7: prejuízo pequeno e materialidade limitada.
                q = 1
                c = round(p * (1.5 if stamp >= "2026-10-01" else .6))
            channel = "Direto" if rng.random() < .55 else "Marketplace"
            rate = 300 if channel == "Direto" else 1100
            row = dict(id=f"D-{sku}-{stamp}", date=stamp, sku=sku, quantity=q,
                       revenue=p*q-discount, cmv=c*q, discount=discount,
                       channel_bps=rate, channel=channel, unit="UN", event="sale")
            if n == 4 or (n in (3, 10, 14) and rng.random() < .06):
                row["cmv"] = None  # H3 total + cobertura parcial distribuída.
            out["sales"].append(row)
            if n not in (4, 16) and rng.random() < .012:
                out["sales"].append({**row, "id": row["id"]+"-R", "quantity": -1,
                                     "revenue": -(row["revenue"]//q), "cmv": -c,
                                     "discount": 0, "event": "return"})
            if rng.random() < .007:
                out["sales"].append({**row, "id": row["id"]+"-X", "event": "cancelled"})
            if day.day == 1:
                out["purchases"].append(dict(id=f"D-P-{sku}-{stamp}", date=stamp,
                    sku=sku, quantity=300, cost=round(c * (1.35 if n == 5 and stamp >= "2026-10-01" else 1)),
                    unit="CX" if n == 17 else "UN"))
            day += timedelta(days=1)
    out["sales"].sort(key=lambda r: (r["date"], r["id"]))
    out["purchases"].sort(key=lambda r: (r["date"], r["id"]))
    return out
