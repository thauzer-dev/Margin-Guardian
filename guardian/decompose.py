"""Decomposição da variação de margem da carteira em preço, custo, mix e entrada de SKUs.

Para cada SKU i, com participação w na receita elegível e margem m:
  mix_i   = (w1 - w0) * (m0_i - M0)
  taxa_i  = w1 * (m1_i - m0_i), dividida em preço e custo unitários.
A soma dos efeitos fecha exatamente com M1 - M0 (identidade verificada nos testes).
Na saída de SKU, w1=0: (-w0)*(m0_i-M0) já pertence ao efeito mix.
SKU sem referência entra como "entrada": sua taxa é medida contra a margem da carteira M0.
"""


def _unit(a):
    q = a["eligible_quantity"]
    return (a["eligible_revenue"] / q, a["cmv"] / q) if q else (None, None)


def decompose(items, ref="previous", top=3):
    cur = {i["sku"]: i["current"] for i in items}
    old = {i["sku"]: i[ref] for i in items}
    r1 = sum(a["eligible_revenue"] for a in cur.values())
    r0 = sum(a["eligible_revenue"] for a in old.values())
    if r1 <= 0 or r0 <= 0:
        return None
    if any(a["eligible_revenue"] < 0 or (a["eligible_revenue"] > 0 and a["eligible_quantity"] <= 0)
           for values in (cur, old) for a in values.values()):
        return None
    g1 = sum(a["gross"] or 0 for a in cur.values())
    g0 = sum(a["gross"] or 0 for a in old.values())
    m1_all, m0_all = g1 / r1, g0 / r0
    out = dict(price=0.0, cost=0.0, mix=0.0, entry=0.0)
    by_sku = {k: {} for k in out}
    names = {i["sku"]: i["name"] for i in items}
    for sku in cur:
        a1, a0 = cur[sku], old[sku]
        w1 = a1["eligible_revenue"] / r1 if a1["eligible_revenue"] > 0 else 0.0
        w0 = a0["eligible_revenue"] / r0 if a0["eligible_revenue"] > 0 else 0.0
        if not w1 and not w0:
            continue
        m1 = a1["gross"] / a1["eligible_revenue"] if w1 else None
        m0 = a0["gross"] / a0["eligible_revenue"] if w0 else None
        parts = {}
        if w0:
            parts["mix"] = (w1 - w0) * (m0 - m0_all)
        if w1 and w0:
            p1, c1 = _unit(a1)
            p0, c0 = _unit(a0)
            parts["price"] = w1 * ((1 - c0 / p1) - (1 - c0 / p0))
            parts["cost"] = w1 * ((1 - c1 / p1) - (1 - c0 / p1))
        elif w1:
            parts["entry"] = w1 * (m1 - m0_all)
        for k, v in parts.items():
            out[k] += v
            by_sku[k][sku] = v
    ranked = {
        k: [
            dict(sku=s, name=names[s], value=v)
            for s, v in sorted(by_sku[k].items(), key=lambda kv: kv[1])[:top]
            if v < 0
        ]
        for k in by_sku
    }
    return dict(
        ref=ref,
        margin_ref=m0_all,
        margin_cur=m1_all,
        total=m1_all - m0_all,
        effects=out,
        worst=ranked,
    )
