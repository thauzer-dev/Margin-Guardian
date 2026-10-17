"""Inteiros em centavos, taxas em pontos-base; vetores compartilhados com JS."""

VERSION = "cents-bps-v1"


def integer(value, name, low, high):
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not low <= value <= high
    ):
        raise ValueError(f"{name} fora do intervalo permitido.")
    return value


def simulate(p, c, q, t=0, m=3000, goal="gross"):
    integer(p, "Preço", 1, 100_000_000)
    integer(c, "Custo", 0, 100_000_000)
    integer(q, "Quantidade", 0, 1_000_000)
    integer(t, "Comissão", 0, 9999)
    integer(m, "Meta", 0, 9999)
    if goal not in ("gross", "channel"):
        raise ValueError("Escolha meta bruta ou pós-canal.")
    denominator = 10000 - m - (t if goal == "channel" else 0)
    if denominator <= 0:
        raise ValueError("Comissão + meta pós-canal devem somar menos de 100%.")
    revenue, cmv = p * q, c * q
    if max(revenue, cmv) > 100_000_000_000:
        raise ValueError("Cenário excede o limite de cálculo exato.")
    commission = (revenue * t + 5000) // 10000
    return dict(
        revenue=revenue,
        cmv=cmv,
        gross=revenue - cmv,
        commission=commission,
        channel=revenue - cmv - commission,
        gross_margin=(p - c) / p,
        channel_margin=(p * (1 - t / 10000) - c) / p,
        reference_price=(c * 10000 + denominator - 1) // denominator,
        version=VERSION,
    )


def price_for_amount(p, c, q, t=0, m=3000, goal="gross", *, amount, kind="revenue"):
    """Menor preço em centavos que atinge o total, com comissão arredondada."""
    if kind not in ("revenue", "channel"):
        raise ValueError("Escolha receita líquida ou resultado pós-comissão.")
    integer(amount, "Valor desejado", 1 if kind == "revenue" else -100_000_000_000, 100_000_000_000)
    simulate(p, c, q, t, m, goal)
    if q == 0:
        raise ValueError("Informe volume maior que zero para definir um valor total.")
    low, high = 1, min(100_000_000, 100_000_000_000 // q)
    def value(price):
        return simulate(price, c, q, t, m, goal)[kind]
    if not value(low) <= amount <= value(high):
        raise ValueError("Valor desejado fora do intervalo alcançável com estas premissas.")
    while low < high:
        mid = (low + high) // 2
        if value(mid) >= amount:
            high = mid
        else:
            low = mid + 1
    achieved = value(low)
    return dict(price=low, achieved=achieved, difference=achieved-amount)
