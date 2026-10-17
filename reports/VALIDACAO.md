# Validação executada — v4.5

Registro do ambiente: 2026-10-17 (Linux, Python 3.12.14).

- 100 testes Python/API aprovados.
- 85 verificações DOM/eventos aprovadas: 67 regressões e 18 verificações da revisão.
- 16 vetores de simulação, 105 cenários de agregação e 10 intervalos / 200 pares intervalo-SKU, com 180 decomposições filtradas da base didática.
- Paridade adicional da base diária: 20 SKUs × quatro janelas × dez campos.
- 15 verificações Node de CSV, qualidade, persistência de desvio e propriedades financeiras; executadas dentro de um teste Python.
- Propriedades: decomposição em 80 subconjuntos × duas referências; menor preço para 100 alvos em dois tipos de total.
- 12 casos controlados da barreira de narrativa e três amostras antigas verificadas. Não são avaliações de um LLM ao vivo.

As contagens de casos internos são subconjuntos das suítes, não devem ser somadas como testes independentes. Todos os scripts de produção passaram pela checagem sintática do Node. O verificador regenera dados e manifesto SHA-256.

## Fluxos novos cobertos

Base diária inicial e troca de base, classificações nova/crônica, fila por critério, visuais analíticos sem coordenadas NaN, granularidade automática/diária, importação de quatro arquivos com mapeamento, conciliação antes de aplicar, declaração de cobertura, manutenção da base após falha, limites do atalho de datas, salvamento/restauração/exclusão de cenários e recusa de cenário de outra base.

Casos de integridade: venda duplicada global, compra duplicada impedindo comparação remanescente, CMV parcial, devolução, cancelamento, unidade incompatível, número fora do contrato, metas sobrepostas, identificadores inseguros e neutralização de fórmula CSV.

## Medição de desempenho

50.000 vendas, 20 produtos, três repetições. Mediana Python (validação + análise): 144.62 ms. Mediana JS (criação do índice + análise de linhas previamente validadas): 38.03 ms. Bases equivalentes em tamanho, ordem de replicação diferente; não é comparação direta entre linguagens.

Payload didático: 580548 bytes. Payload diário: 3038792 bytes. São dados explícitos, sem dependência de servidor/API. A carga inicial é maior que na v4.4; não foi medido tempo de renderização real nem Core Web Vitals. Medição reproduzível em `benchmark.py`; resultado em `performance_v4_5.json`. A medição v4.3.1 é histórica.

## Limites explícitos

Não houve teste nativo Windows, inspeção visual em navegador, dispositivo móvel real, PDF impresso real, auditoria WCAG, avaliação humana de LLM, arquivo ERP real ou teste concorrente de carga. DOM não valida espaçamento, calendário nativo, leitor de tela ou permissão real de clipboard. Não há alegação de homologação operacional.

Reprodução: `python verificar.py` com Node disponível. Para DOM, disponibilize linkedom 0.18.12 e configure `GUARDIAN_DOM_MODULE`. Produção não precisa dessas dependências.
