# Registro de erros e decisões sobre IA

## Desenvolvimento — ocorrências reais desta entrega

| Data | O que ocorreu | Como foi detectado | Correção | Proteção |
|---|---|---|---|---|
| 13/10/2026 | O primeiro gerador de H1 subia o custo gradualmente, mas a última alta era menor que o limiar de 10%; a narrativa preparada referia um fato de alta que não existia | `build.py` recusou a narrativa porque o ID não constava do pacote de evidências | Ajuste explícito da história sintética H1 para última alta de 20%, mantendo o limiar; sem alterar regra para aceitar texto inválido | Teste H1 e validação de todas as amostras preparadas em cada build |
| 13/10/2026 | H2 compartilhava categoria com H1, dificultando demonstrar queda causada apenas pela composição | Revisão do cenário: H1 altera custo, H2 deve manter margens individuais estáveis | H2 movida para grupo com margens realizadas estáveis; narrativa permanece cautelosa sobre mix | Teste compara margens individuais e margem ponderada do par H2 |
| 13/10/2026 | A primeira curva executiva mostrava só margem realizada, embora o seletor também oferecesse comparação | Conferência do blueprint contra a implementação | Curva pontilhada com referência selecionada por mês; histórico incompleto fica sem ponto | Paridade das agregações e verificação dos filtros da interface |

São registros de problemas identificados, não exemplos inventados de falhas de um provedor. O log da v2.1 é histórico e não foi reutilizado como medição desta versão.

## Execução — avaliação controlada

`reports/ai_evaluation.json` registra as 12 fixtures: decisão de cada tentativa, motivo de recusa, modo final e resposta estruturada. Algumas respostas são propositalmente incorretas; isso testa a barreira, não demonstra que um LLM específico cometeu esses erros.

`reports/ai_provenance.json` registra os IDs das três amostras preparadas e verificadas e o hash do dataset. `data/ai_prepared.json` preserva as respostas e autoria. Não há chaves ou dados reais nesses arquivos.

## Revisão v4.3 — 14/10/2026

- A decomposição da v4.2 era da carteira inteira, mesmo com filtros. A v4.3 a recalcula no recorte e verifica 180 combinações contra Python.
- A base começava em abril/2026, insuficiente para comparar ano anterior. Histórico sintético separado foi acrescentado desde janeiro/2025, sem alterar os registros originais de vendas; janelas anteriores à cobertura continuam indisponíveis.
- Snapshots mensais não serviam para intervalos arbitrários. O novo motor por registros é confrontado com Python em dez intervalos.
- Uma colisão de nomes entre a função de validação de dados e a de narrativa interrompeu o primeiro build da revisão. O import passou a usar alias explícito; a suíte e o build final passaram.
- Agora as amostras preparadas só aparecem no intervalo exato original. Recortes personalizados usam evidências novas e rótulo de regras, evitando reaproveitar uma narrativa temporalmente incorreta.
