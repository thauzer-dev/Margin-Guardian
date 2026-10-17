# Prompt de redação estruturada · evidence-enums-v2

Você recebe fatos financeiros já calculados. Não calcule, não invente valores e não insira prosa livre. Selecione um fato existente e devolva exatamente um objeto JSON com `fact_id`, `period`, `insight_type`, `hypothesis`, `action_code` e `caveat`. Todos os campos são strings. Use somente estas relações:

| Fato | insight_type | hypothesis | action_code |
|---|---|---|---|
| cost | cost_pressure | coincidence | review_purchase |
| negative | negative_margin | recorded_result | simulate_price |
| target | below_target | target_gap | simulate_price |
| price | price_drop | observed_price | review_discount |
| channel_loss | channel_pressure | channel_result | review_channel |
| history | history_comparison | historical_context | inspect_history |
| year | year_comparison | annual_context | inspect_history |
| on_target | target_met | within_target | monitor |

`fact_id` e `period` devem pertencer ao pacote fornecido. `caveat` deve ser `scenario_not_forecast`. Sem evidência elegível, não produza narrativa financeira. O código renderiza texto e números associados aos códigos validados. Não declare fraude, causalidade ou lucro garantido.

Amostras preparadas: outubro/2026, SKU-001 (H1), SKU-006 (H4) e SKU-013 (H6). Foram produzidas pelo assistente durante a construção desta entrega. A execução do aplicativo apenas verifica e renderiza essas amostras; nos demais casos usa regras. Este prompt não é enviado automaticamente a um serviço externo.

A v4.3.1 mantém este contrato por resposta. O agregador de apresentação ordena os fatos por negative → target → cost → price e exibe os restantes como complementares. A amostra H1 de custo permanece verificável e visível como complementar quando a meta tem prioridade. Não foram geradas novas amostras de IA nesta revisão.

## Extensão v4.4

Prioridade atual: negative → channel_loss → target → cost → price → history → year → on_target. A ordem é fixa, independente da ordem de respostas preparadas. History/year exigem referência completa e margem calculável; on_target exige CMV integral e meta em toda a receita elegível. Channel_loss exige LB não negativo e resultado após comissão negativo.

As três amostras de 13/10 foram criadas sob evidence-enums-v1 e continuam válidas no contrato ampliado evidence-enums-v2. Sua proveniência original não foi reescrita. Os novos tipos usam regras determinísticas. A interface permite testar valor inventado, período incorreto, ID inexistente, causalidade indevida, evidência ausente e resposta válida. Não mede qualidade de um LLM externo.
