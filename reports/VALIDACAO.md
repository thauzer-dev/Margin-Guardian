# Validação v4.3.1 — 14/10/2026

Resultado efetivamente executado em Linux, Python 3.12.14 e Node 24.19.0. Os números abaixo incluem casos dentro dos testes; não devem ser somados como testes independentes.

- **82 testes Python/API aprovados.**
- **16 vetores** compartilhados de simulação e **105 combinações** de agregação JS/Python.
- **10 intervalos arbitrários**, cobrindo **200 pares intervalo/SKU**, quatro janelas por par: atual, anterior, 3M e ano anterior. Confronto de valores monetários, margens, evidências, alertas, compras e premissas.
- **180 decomposições filtradas** confrontadas com Python e reconciliadas à variação total.
- **32 verificações DOM/eventos** aprovadas: busca, teclado, filtros em cascata, datas, persistência, abas, histórico incompleto e simulador.
- **12 fixtures adversariais de narrativa** e **3 amostras preparadas** verificadas. Não é benchmark de LLM.
- `dist/demo-data.js`: **578.083 bytes**. Snapshots mensais duplicados removidos do payload; sem chamadas remotas na abertura.

Relatório estruturado: `validation.json`. Proveniência: `ai_provenance.json`. Reproduzir com `python verificar.py` (Node necessário; teste DOM requer linkedom ou `GUARDIAN_DOM_MODULE`).

Foram acrescentados 23 testes Python/API e uma verificação DOM em relação à v4.3. Incluem regras de custo parametrizadas, precedência independente da ordem do JSON, fatos complementares, IDs globais de compra, erros de campos, metas ausentes/parciais, limite de materialidade, ordenação cronológica, entrada/saída de SKUs, UTF-8 sob padrão simulado CP1252 e Host/Origin.

Medição comparativa em `performance_v4_3_1.json`: 50.000 vendas sintéticas, 20 SKUs, mediana de três execuções de `analyze`: 646,96 ms na v4.3 e 279,11 ms na v4.3.1 (2,32× nesta medição). Agregados financeiros e premissas comparados são iguais. Não é teste de abertura nem teste de carga empresarial.

## Limites da verificação

Não houve execução nativa Windows nem teste visual em navegador real. Os testes DOM exercitam estrutura e eventos, não layout, navegador móvel, calendário nativo ou leitor de tela. O tempo da suíte não mede tempo de abertura no computador do usuário. Sem teste de carga empresarial, dados reais ou integração ERP. Esses aceites permanecem explícitos.
