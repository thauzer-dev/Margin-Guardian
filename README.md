# Margin Guardian — v4.5

Painel executivo, diagnóstico e simulador. Explicações verificáveis por regras; sem modelo de IA ao vivo. Duas bases sintéticas e importação local de quatro CSVs.

## Abrir

1. Extraia **todo o ZIP**.
2. Abra `ABRIR_DEMONSTRACAO.html` ou clique em `iniciar_windows.bat`.
3. Mantenha a pasta `dist` junto dos iniciadores.

Não precisa instalar pacotes nem executar Python para usar. Se a associação de HTML não abrir, botão direito → Abrir com → Edge, Chrome ou Firefox. Python instalado não interfere nesse iniciador. Não execute dentro do ZIP.

Demo: https://margin-guardian-simplificado-thz.thauzerdark.chatgpt.site

## O que mudou

- Base diária sintética, metas por categoria/vigência e cobertura parcial de CMV; casos antigos preservados separadamente.
- Resumo executivo verificável, distinção de padrão novo/recorrente/crônico e fila com três ordenações.
- Cascatas, Pareto, dispersão, mapa de calor, minigráficos por categoria e margem × meta.
- Gráficos diários/dezenais, alternativa semanal para séries esparsas e referências constantes anotadas.
- Importação CSV local, mapeamento de colunas, qualidade antes de aplicar e conciliação com totais informados.
- Cenários salvos no navegador, exportação CSV e resumo preparado para impressão/Salvar como PDF.
- Explicações com até três fatos inicialmente visíveis e ações sem repetição.

**Guia vigente:** `docs/GUIA_ATUAL.md`. Inclui avaliação dos 27 achados, decisões, pendências e roteiro. Fórmulas: `docs/CONTRATO_CALCULO.md`. Mudanças: `CHANGELOG.md`. Documentos antigos estão em `docs/historico/` e não descrevem a interface atual.

## Importação

Abra “Importar CSVs e conferir a qualidade”. Use `products`, `sales`, `purchases`, `targets`. CSV UTF-8 com vírgula ou ponto e vírgula. Moeda em centavos inteiros; taxas em bps. Declare a cobertura completa dos arquivos, valide e só então aplique. O exemplo em `examples/importacao/` tem totais esperados e pode ser usado imediatamente.

Os arquivos ficam na memória desta aba. Não são enviados ao servidor nem guardados automaticamente. Recarregar descarta a importação. Cenários são salvos apenas quando você clica no botão; expiram em 30 dias e são removidos ao reabrir. Podem ser excluídos antes disso. Sem sincronização entre computadores.

## Desenvolver

Python 3.10+ e Node 18+ para validação. Produção não usa dependências Python/JS externas.

```bash
python iniciar.py                 # servidor HTTP opcional, somente loopback
python build.py                   # regenera as duas bases sintéticas
python verificar.py               # testes, relatórios e manifesto
python benchmark.py               # medição do motor com 50 mil vendas
```

DOM opcional: linkedom 0.18.12, somente desenvolvimento. Defina `GUARDIAN_DOM_MODULE` para uma instalação externa ou instale-o no ambiente de testes. `verificar.py` executa `tests/ui_dom.cjs` e `tests/ui_revision45.cjs` quando disponível. O modelo em `ci/verify.yml` pode ser instalado em um repositório GitHub; não representa CI já executada.

## Estrutura

- `guardian/`: motor Python, validação, simulador, decomposição, narrativa e gerador diário.
- `dist/`: aplicação pronta. `math.js`/`engine.js` calculam; `insights.js` explica; `importer.js` valida CSV; `workflow.js` integra importação, exportação e cenários; `app.js` mantém as abas.
- `tests/`: regressões, contratos, paridade e eventos DOM.
- `reports/`: resultados efetivamente executados e limites de validação.
- `examples/importacao/`: quatro CSVs fictícios e totais de conferência.

## Limites

Sem homologação com ERP real, modelo de IA ao vivo, autenticação/multiempresa, banco compartilhado, alertas externos ou recomendação automática de preço. Pós-comissão não é lucro líquido nem margem de contribuição completa. Não há impostos, frete, PEPS, elasticidade estimada ou significância estatística.

Windows nativo, celular real, inspeção visual em navegador e auditoria WCAG completa continuam pendentes. DOM não mede layout. Importação Excel direta não existe: exporte as quatro tabelas em CSV UTF-8. PDF usa a impressão do navegador; não há gerador PDF autônomo.
