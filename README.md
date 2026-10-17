# Margin Guardian AI — Simplificado v4.3.1

Painel executivo, diagnóstico e simulador de margem. Dados fictícios, execução local ou hospedagem estática, sem instalar bibliotecas para usar.

## Abrir no Windows

1. Extraia **todo o ZIP** para uma pasta.
2. Abra `ABRIR_DEMONSTRACAO.html` com Edge, Chrome ou Firefox, ou clique em `iniciar_windows.bat`.
3. Mantenha a pasta `dist` junto dos iniciadores. Não execute dentro do ZIP.

O iniciador abre um HTML pronto: não baixa pacotes e não exige Python. Se a associação de HTML do Windows não abrir o navegador, use botão direito → Abrir com. Não foi feito teste nativo no seu Windows; não há diagnóstico confirmado da falha antiga.

Demo publicada: https://margin-guardian-simplificado-thz.thauzerdark.chatgpt.site

## Revisão técnica v4.3.1

- Limiar de custo alinhado ao alerta configurado nos motores Python e JavaScript.
- Diagnóstico principal com prioridade explícita; fatos complementares também visíveis.
- Integridade global de compras, inclusive IDs repetidos entre SKUs e datas.
- Severidade considera o prejuízo bruto quando a meta falta ou cobre apenas parte das vendas.
- Índices de vendas, compras e vigências de metas; ordenação cronológica das evidências.
- Regravação UTF-8, verificação de Host/origem no servidor opcional e novas regressões.

Parecer completo, ressalvas e benchmark: `docs/AUDITORIA_V4_3_1.md`.

## Recursos da interface

- Novo painel executivo claro, navegação horizontal, azul-petróleo e verde; cores consistentes para atual / 3M / ano anterior.
- Intervalo **Entre**, com data inicial e final inclusivas, de 01/01/2025 a 13/10/2026. Pode usar dias avulsos. Datas inválidas não alteram a última análise válida.
- Busca por nome ou SKU, sem distinguir maiúsculas nem acentos, com sugestões dependentes da categoria, tipo e período. Digitar procura; clicar ou Enter seleciona.
- Botões **Essencial** e **Especial**, exclusivos. Clique novamente no ativo para voltar a todos. Sem botão ativo = todos os tipos.
- Filtros compartilhados entre as três abas e preservados durante a sessão. SKU incompatível com novo recorte é removido com aviso.
- Atual, 3M e ano anterior visíveis juntos; decomposição preço/custo/mix passa a respeitar os filtros.
- Histórico fictício ampliado, preservando as vendas originais de abril–outubro/2026.
- Intervalos personalizados recalculam evidências e textos de regras. As três amostras preparadas de IA só aparecem no intervalo ao qual pertencem.
- Payload da interface sem snapshots mensais duplicados; processamento local com índice por SKU e cache limitado.

## Regras dos comparativos

- **Atual:** data inicial até final, ambas inclusivas.
- **3M:** três meses civis completos antes do mês da data inicial. Para 08/09 a 08/10/2026, é 01/06 a 31/08/2026. É um total de três meses, não média mensal.
- **Ano anterior:** as duas datas inclusivas deslocadas em um ano; 29/02 vira 28/02 quando necessário. Mesmos produtos filtrados.
- Referência sem cobertura de toda a janela fica indisponível. Não se preenche história ausente.
- Margem e variação em pontos percentuais podem ser comparadas entre janelas de diferentes durações, considerando a composição. Percentual de crescimento de receita só aparece para ano anterior com igual número de dias e receita-base positiva. Não mede crescimento de períodos equivalentes em dias úteis.

Detalhes funcionais e decisões: `docs/GUIA_V4_3.md`. O guia funcional da v4.3 permanece válido; esta revisão está detalhada no parecer v4.3.1.

## Três abas

**Executivo:** receita disponível, margem ponderada, lucro bruto elegível, gaps, cobertura, comparativos simultâneos, decomposição e ranking de investigação.

**Diagnóstico:** foco em um SKU dentro do recorte global, contexto histórico, narrativas identificadas, fórmulas, registros de origem e compras comparáveis. “Trocar produto” muda o foco da investigação e do simulador; não substitui o filtro global da carteira.

**Simulador:** mesmo produto em foco, preço/CMV unitários médios, meta bruta ou pós-comissão, volume e sensibilidades; cópia do cenário. Os cartões históricos mostram realizado. A tabela de cenários mostra hipóteses. Alterar filtros reinicia premissas; alternar abas preserva as premissas desta sessão.

## IA: opção adotada

Motor determinístico + explicação limitada a evidências. Três respostas JSON produzidas anteriormente com apoio do assistente, validadas e rotuladas. Nos demais recortes, texto automático de regras. Não há LLM ao vivo, aprendizado automático, chave de API nem envio de dados a provedores. A miniavaliação de 12 fixtures testa a barreira, não a precisão de um LLM comercial.

## Desenvolver e verificar

Python 3.10+; Node 18+ somente para testes JS. Nenhuma dependência Python de produção.

```bash
python iniciar.py                 # servidor local opcional
python iniciar.py --no-browser    # não abre navegador
python build.py                   # gera a base fictícia e o payload
python -m unittest discover -s tests -v
python verificar.py               # testes e relatórios; requer Node
```

O servidor escuta somente em `127.0.0.1`, portas 8501–8520, com `/api/health` e `POST /api/simulate`. Centavos para preço/custo, pontos-base para meta/taxa e quantidade inteira. A interface usa JS no modo local e publicado. A API aceita a origem HTTP exata do Host local (`127.0.0.1:porta` ou `localhost:porta`). `Origin: null` é recusado; o HTML aberto como arquivo não precisa dessa API. Clientes locais sem cabeçalho Origin podem usá-la.

Teste de eventos/DOM opcional: instale `linkedom@0.18.12` somente no ambiente de desenvolvimento e execute `node tests/ui_dom.cjs`. Para uma instalação externa, defina `GUARDIAN_DOM_MODULE` com seu caminho; `verificar.py` também reconhece essa variável. Isso não equivale a teste visual em navegador.

Resultados reais em `reports/validation.json` e `reports/VALIDACAO.md`. A execução nativa Windows e a conferência visual de desktop/celular ainda precisam ser realizadas.

## Arquivos

- `guardian/`: validação, calendário, agregação, decomposição, simulador e contrato de narrativa.
- `dist/engine.js`: cálculo de intervalos a partir dos registros validados pelo Python.
- `dist/app.js`, `style.css`, `index.html`: interface pronta, sem build de frontend.
- `data/`: base fictícia gerada e respostas preparadas de IA.
- `tests/`: regressão financeira/API, paridade JS/Python e interações DOM.
- `docs/`: guia, arquitetura, escopo e roteiro de apresentação.
- `reports/`: validação e avaliação de IA reproduzíveis.

## Limites

2580 linhas de venda e 440 compras sintéticas, 20 SKUs, quatro categorias. Não importa seus arquivos nem se conecta a ERP. Sem autenticação, multiempresa, banco compartilhado, reajuste automático, previsão de demanda ou preço ótimo. Gap não é perda ou ganho garantido. Compra não reescreve CMV de venda. Resultado pós-canal não é lucro líquido. A extensão anterior a abril/2026 foi gerada só para demonstrar comparativos.
