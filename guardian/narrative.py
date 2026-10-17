"""A IA seleciona relações permitidas; números são renderizados dos fatos pelo código.

Não aceita prosa arbitrária. A barreira verifica semântica finita, IDs e período.
Ela não prova causalidade nem valida toda linguagem natural.
"""

PRIORITY = ("negative", "channel_loss", "target", "cost", "price", "history", "year", "on_target")

PROMPT_VERSION = "evidence-enums-v2"
POLICY = {
    "channel_loss": ("channel_pressure", "channel_result", "review_channel"),
    "history": ("history_comparison", "historical_context", "inspect_history"),
    "year": ("year_comparison", "annual_context", "inspect_history"),
    "on_target": ("target_met", "within_target", "monitor"),
    "cost": ("cost_pressure", "coincidence", "review_purchase"),
    "negative": ("negative_margin", "recorded_result", "simulate_price"),
    "target": ("below_target", "target_gap", "simulate_price"),
    "price": ("price_drop", "observed_price", "review_discount"),
}
TEXT = {
    "channel_result": "O lucro bruto não cobre a comissão registrada das linhas elegíveis. Resultado pós-comissão não é lucro líquido: faltam impostos, frete e demais despesas.",
    "historical_context": "A referência reúne três meses civis completos anteriores ao mês inicial. A diferença de margem descreve períodos com composição e duração possivelmente diferentes; não isola uma causa.",
    "annual_context": "A comparação anual usa as datas correspondentes do ano anterior e o mesmo SKU. Calendário e composição podem mudar; a variação não comprova uma tendência futura.",
    "within_target": "As linhas elegíveis cobertas atendem à meta de margem bruta no recorte. Isso não garante rentabilidade após todas as despesas nem resultado futuro.",
    "coincidence": "A alta de compra pressiona a margem teórica com preço constante. Não demonstra, sozinha, mudança no CMV das vendas.",
    "recorded_result": "O CMV registrado supera a receita das linhas elegíveis. O cálculo descreve essas vendas; não prevê resultados futuros.",
    "target_gap": "O resultado elegível fica abaixo da meta definida. O gap não representa perda realizada nem recuperação garantida.",
    "observed_price": "O preço líquido observado caiu. Descontos só podem ser atribuídos quando registrados na origem.",
}
ACTIONS = {
    "review_channel": "Conferir a base de comissão e testar uma meta pós-comissão no simulador.",
    "inspect_history": "Revisar preço, CMV e composição das vendas nas duas janelas antes de atribuir a variação a uma causa.",
    "monitor": "Acompanhar compras, descontos e comissão para verificar se a margem se mantém.",
    "review_purchase": "Conferir a compra e testar alternativas de custo e preço.",
    "simulate_price": "Simular preço, comissão e volume antes de decidir.",
    "review_discount": "Revisar descontos registrados e testar o preço líquido.",
}


def facts_for(item, period):
    cur = item["current"]
    facts = {}

    def put(kind, values):
        fid = f"{item['sku']}|{period}|{kind}"
        facts[fid] = dict(id=fid, period=period, kind=kind, values=values)

    if cur["eligible_count"] and cur["margin"] is not None:
        if cur["margin"] < 0:
            put(
                "negative",
                dict(
                    margin=cur["margin"],
                    gross=cur["gross"],
                    revenue=cur["eligible_revenue"],
                ),
            )
        if cur["gross"] >= 0 and cur["gross"] - cur["commission"] < 0:
            put("channel_loss", dict(gross=cur["gross"], commission=cur["commission"], channel=cur["gross"]-cur["commission"]))
        if cur["gap"]:
            put(
                "target",
                dict(
                    gap=cur["gap"],
                    margin=cur["margin"],
                    target_value=cur["target_value"],
                ),
            )
        p = item["purchase"]
        if p["valid"] and p["change"] is not None and "Alta de custo de compra" in item["alerts"]:
            put(
                "cost",
                dict(
                    previous=p["previous"]["cost"],
                    current=p["current"]["cost"],
                    change=p["change"],
                ),
            )
        if "Queda de preço líquido" in item["alerts"]:
            put(
                "price",
                dict(
                    revenue=cur["eligible_revenue"],
                    quantity=cur["eligible_quantity"],
                    discount=cur["discount"],
                ),
            )
    if cur["eligible_count"] and cur["margin"] is not None:
        for kind, key in (("history", "three"), ("year", "year")):
            ref = item.get(key, {})
            if item.get("reference_complete", {}).get(key) and ref.get("margin") is not None:
                put(kind, dict(margin=cur["margin"], reference=ref["margin"], delta=cur["margin"]-ref["margin"], coverage=ref["coverage"]))
        if (cur["coverage"] == 1 and cur["target_revenue"] == cur["eligible_revenue"]
                and cur["target_revenue"] > 0 and cur["gap"] == 0 and cur["margin"] >= 0):
            put("on_target", dict(margin=cur["margin"], target=cur["target_value"]/cur["target_revenue"], gross=cur["gross"]))
    return facts


def validate(response, facts, period):
    if not facts:
        raise ValueError("Sem evidência financeira elegível")
    required = {
        "fact_id",
        "period",
        "insight_type",
        "hypothesis",
        "action_code",
        "caveat",
    }
    if not isinstance(response, dict) or set(response) != required:
        raise ValueError("Esquema inválido ou números/prosa não autorizados")
    if any(not isinstance(v, str) for v in response.values()):
        raise ValueError("Campos devem conter códigos textuais")
    fact = facts.get(response["fact_id"])
    if not fact:
        raise ValueError("ID de evidência inexistente")
    if response["period"] != period or fact["period"] != period:
        raise ValueError("Referência temporal incorreta")
    expected = POLICY[fact["kind"]]
    if (
        tuple(response[k] for k in ("insight_type", "hypothesis", "action_code"))
        != expected
    ):
        raise ValueError("Relação semântica, causalidade ou ação não autorizada")
    if response["caveat"] != "scenario_not_forecast":
        raise ValueError("Ressalva obrigatória ausente")
    return response


def ordered_facts(facts):
    """Prioridade explícita; independe da ordem de dicionários ou JSON preparados."""
    return sorted(facts.values(), key=lambda f: (PRIORITY.index(f["kind"]), f["id"]))


def select_narrative(facts, period, prepared=()):
    """Um fato principal e os demais visíveis como complementares, mesma hierarquia."""
    by_id = {}
    for response in prepared:
        if response["fact_id"] in by_id:
            raise ValueError("Narrativa preparada duplicada.")
        by_id[response["fact_id"]] = response
    entries = []
    for fact in ordered_facts(facts):
        response = by_id.get(fact["id"])
        mode = "prepared" if response else "rules"
        response = response or fallback({fact["id"]: fact}, period)
        validate(response, facts, period)
        entries.append(dict(mode=mode, response=response))
    primary = entries[0] if entries else dict(mode="quality", response=None)
    return dict(**primary, facts=facts, supporting=entries[1:])


def fallback(facts, period):
    if not facts:
        return None
    fact = ordered_facts(facts)[0]
    kind, hypothesis, action = POLICY[fact["kind"]]
    return dict(
        fact_id=fact["id"],
        period=period,
        insight_type=kind,
        hypothesis=hypothesis,
        action_code=action,
        caveat="scenario_not_forecast",
    )


def run(generator, facts, period):
    attempts = []
    if not facts:
        return dict(
            mode="quality",
            response=None,
            attempts=[dict(accepted=False, reason="Sem evidência financeira elegível")],
        )
    for attempt in range(2):
        try:
            response = generator(attempt, attempts)
            validate(response, facts, period)
            attempts.append(dict(accepted=True, reason="Esquema e evidências válidos"))
            return dict(mode="verified", response=response, attempts=attempts)
        except (ValueError, TypeError, KeyError, TimeoutError) as error:
            attempts.append(dict(accepted=False, reason=str(error)))
    return dict(mode="rules", response=fallback(facts, period), attempts=attempts)
