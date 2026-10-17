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
