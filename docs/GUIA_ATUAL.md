# Margin Guardian — Guia da v4.5 e avaliação dos últimos ajustes

Atualização: 16/10/2026. Autor do projeto: Enzo Thauzer, com apoio de ChatGPT/Codex. Documento vigente da entrega. O nome histórico “Margin Guardian AI” permanece nos pacotes anteriores; a interface agora identifica a capacidade disponível como **Explicações verificáveis**.

## 1. Avaliação da análise recebida

A crítica central faz sentido: o contrato semântico anterior só permitia escolher combinações previamente definidas. Portanto, a aprovação de uma resposta não demonstrava inteligência ou qualidade de um modelo. A base antiga também era muito uniforme para demonstrar análise exploratória. Os problemas de leitura, repetição e ausência de importação tinham efeito direto na utilidade.

A revisão corrige a apresentação dessa capacidade, melhora os dados e o fluxo de uso, sem transformar recomendações de longo prazo em promessas de recursos já existentes. Não há um LLM ao vivo nesta versão.

Alguns pontos precisaram de adaptação:

- **Texto livre validado apenas por números e palavras proibidas não é seguro o suficiente.** Uma frase pode usar números verdadeiros com relação, sinal, sujeito ou conclusão errados. Essa proposta continua exigindo avaliação semântica, conjunto de casos e revisão humana; não foi adotada como garantia de factualidade.
- **Uma linha de meta única na dispersão seria enganosa**, pois metas agora variam por categoria e vigência. A tabela da dispersão mostra a meta coberta de cada SKU; o gráfico por categoria apresenta sua própria meta ponderada.
- **“Ano anterior invertido” não define uma regra reproduzível.** Foi substituído por uma condição clara de queda contra as duas referências.
- **Não se deve recolher todos os comparativos históricos**, porque você solicitou sua presença permanente. Atual, 3M e ano anterior permanecem visíveis nas três abas. Os novos visuais exploratórios e fatos excedentes ficam em detalhes.
- **Não se deve inventar margem em dias vazios.** A seleção diária preserva lacunas. Na seleção automática de um único mês, menos de metade dos dias com movimento aciona blocos de até sete dias. A mudança é informada e reversível.

## 2. Como abrir e conferir

Extraia todo o ZIP. Abra `ABRIR_DEMONSTRACAO.html` ou execute `iniciar_windows.bat`. O iniciador só abre o HTML; não instala pacotes, não inicia treinamento e não depende de Python. A pasta `dist` precisa permanecer ao lado dele.

Se a associação de HTML estiver incorreta, use Abrir com no arquivo HTML. O servidor Python é opcional: `python iniciar.py`. Ele escuta apenas em loopback. A interface aberta por arquivo não depende de `/api/simulate`; a recusa de `Origin: null` permanece no servidor.

**Limite de validação:** não houve teste nativo Windows nem inspeção visual nesta revisão. A correção do código e os testes de DOM não comprovam o funcionamento da associação de arquivos no computador do usuário.

## 3. Bases disponíveis

### Diária · sintética v4.5

É a base inicial. Todo o intervalo de janeiro/2025 a outubro/2026 é produzido pelo mesmo processo: variação de volume por dia da semana e sazonalidade ilustrativa, pequenos movimentos de preço/custo, dois canais de comissão e metas por categoria com nova vigência em julho/2026. Não há reaproveitamento de abril para preencher o histórico.

Os eventos H1–H8 são intencionais: custo em alta com preço quase estável; mudança de mix; CMV ausente; compra nova sem mudança equivalente do CMV vendido; desconto; margem negativa crônica; forte variação de pequeno impacto; caixa versus unidade sem conversão. Há também devoluções, cancelamentos e CMV parcial em outros SKUs.

Isso torna a demonstração mais variada, mas **não torna os dados reais nem valida as regras para uma empresa**. O processo não foi estimado de um ERP. A ausência de salto artificial na emenda é testada no gerador, junto com cobertura diária, variação de margem e preservação das histórias.

### Casos didáticos · base anterior

Preserva os números e as três amostras estruturadas antigas, para regressão e rastreabilidade. A uniformidade dessa base continua intencional e explicitamente identificada. As amostras não são atribuídas à base diária ou aos CSVs importados.

### Meus CSVs

Processados apenas no navegador. Recarregar a página descarta essa base. Trocar a base reinicia filtros e premissas para evitar misturar produtos e resultados de origens diferentes.

## 4. Fluxo de decisão e visualizações

O Executivo inicia com uma leitura do recorte, KPIs e fila de sinais. O resumo usa números do motor: margem, variação contra 3M, maior pressão matemática e quantidade de SKUs que concentram pelo menos 80% do gap positivo. Não atribui causalidade.

A fila pode ser ordenada por **severidade e gap**, **maior gap** ou **maior queda contra 3M**. Empates usam gap e SKU. Variação sem histórico não recebe uma queda fictícia. Não foi criado índice composto com pesos arbitrários.

A cascata mostra margem da referência → preço → CMV → mix → entrada → atual, acompanhada de valores exatos. As duas referências permanecem visíveis. A identidade fecha antes do arredondamento de exibição.

Na trajetória: dias dentro de um único mês; blocos 1–10, 11–20 e 21–fim quando o recorte atravessa meses; início/fim parciais respeitados. O terceiro bloco termina no dia real do mês, inclusive 31 ou fevereiro. Rótulos são espaçados, com rolagem horizontal quando necessário. Referências constantes de margem aparecem como valores anotados, não como retas repetitivas. A opção diária continua disponível para a base esparsa.

“Explorar concentração, preço e histórico por categoria” abre Pareto do gap, dispersão preço × margem com tamanho relacionado à receita, mapa de calor de 12 meses, minigráficos por categoria e margem × meta coberta. Os números estão em tabelas/textos, além das cores. Minigráficos usam escala local: comparam a forma da trajetória, não a amplitude entre categorias. Meses sem cobertura completa não são estimados; o último mês pode ser parcial.

No Diagnóstico, marcadores indicam compras ocorridas nos blocos mostrados, e o texto lista datas/custos e desconto registrado. Esses eventos não provam a causa da alteração de margem. Um marcador de compra não transforma custo de aquisição em CMV realizado.

## 5. Classificação de persistência

A classificação é uma leitura adicional e não substitui severidade, cobertura ou regras de alerta:

| Condição | Leitura |
|---|---|
| Sem margem elegível | Sem CMV elegível |
| Margem não negativa e meta não cobre toda a receita elegível atual | Meta sem cobertura completa |
| Referência 3M/anual incompleta ou sem margem | Histórico insuficiente |
| Cobertura de CMV inferior a 95% em qualquer uma das três janelas | Cobertura limitada |
| Sem margem negativa/gap atual, mas desvio em uma referência | Em recuperação |
| Sem desvio atual ou nas referências | Sem desvio atual |
| Desvio atual e margem a até 1 pp de ambas as referências | Crônico |
| Desvio atual e queda de pelo menos 3 pp contra ambas as referências | Deterioração nova |
| Desvio atual e também em pelo menos uma referência | Recorrente |
| Demais desvios atuais | Desvio atual |

A ordem acima importa. “Novo” significa deterioração observada contra os agregados de referência; não prova que seja o primeiro episódio da história. “Crônico” não estima duração nem causa. Os limites de 95%, 1 pp e 3 pp são heurísticas explícitas, não significância estatística.

## 6. Explicações e simulação

As explicações mostram um fato principal e até dois complementares; os demais ficam disponíveis em detalhes. A mesma ação não é repetida entre fatos. Evidências, período e origem continuam consultáveis. O rótulo da amostra antiga é “Amostra estruturada · verificada”; os demais textos são de regras.

O simulador preserva a lógica anterior: editar preço, meta, receita líquida total ou resultado após comissão define o preço; CMV, quantidade e comissão recalculam conforme o último campo principal alterado. O realizado permanece intacto. O total informado pode exigir ajuste ao centavo, que aparece na tela. Meta bruta e pós-comissão continuam distintas.

“Copiar cenário” fecha o resumo quando a cópia dá certo, mostra confirmação temporária e mantém fechamento manual. Se o navegador bloquear a área de transferência, o texto fica disponível para seleção manual. Alterar premissas invalida a confirmação anterior.

“Salvar neste navegador” guarda premissas, resultados, filtros e identificador da base, até 20 cenários. Eles expiram em 30 dias; a limpeza física é feita ao reabrir o painel. É possível excluir um ou todos antes disso. Não há nuvem, conta ou sincronização. Um cenário de outra base não pode ser restaurado automaticamente. Navegadores podem bloquear ou limpar esse armazenamento; nesse caso use o resumo copiável.

## 7. Importação e conciliação

Selecione os quatro CSVs em UTF-8, separados por vírgula ou ponto e vírgula. Cabeçalhos com nomes diferentes podem ser mapeados. Arquivos sem registros ainda devem conter seus cabeçalhos.

| Arquivo | Colunas |
|---|---|
| products | sku, name, category, type, unit |
| sales | id, date, sku, quantity, revenue, cmv, discount, channel_bps, unit, event |
| purchases | id, date, sku, quantity, cost, unit |
| targets | sku, bps, start, end |

Valores monetários são **centavos inteiros**, sem R$, separador de milhar ou casas decimais. `cmv` é o custo total da linha; `cost` é custo unitário de compra. `revenue` já é líquido de descontos. `channel_bps` e `bps` usam 100 = 1%. Datas: AAAA-MM-DD. Vigência da meta tem fim exclusivo. Venda é `sale` com quantidade/receita positivas; devolução é `return` com sinais negativos; cancelamento é `cancelled` e fica fora dos agregados.

Tipos aceitos: Essencial/Especial. SKUs usam até 64 caracteres ASCII (letras/números, ponto, hífen, barra, dois-pontos ou sublinhado). Unidades têm até 20 letras/números/ponto/hífen/sublinhado. Esses limites evitam identificadores ambíguos e conteúdo executável em interfaces/exportações.

Declare o início/fim da cobertura completa, inclusive dias sem vendas. Sem essa declaração, a ausência de linhas não prova ausência de movimento. O sistema mostra linhas recebidas, aceitas, em quarentena, cancelamentos, cobertura CMV e ocorrências. Produtos inválidos e metas ambíguas bloqueiam a aplicação; linhas inválidas de venda ficam em quarentena. CMV ausente mantém a receita, mas exclui a linha da margem. Erros de compra impedem uma comparação aparentemente válida entre registros remanescentes.

Informe os totais de receita e CMV do ERP para **o período declarado inteiro**, em reais. O painel compara com os registros aceitos e mostra a diferença. Não há reconciliação automática com ERP nem explicação inventada para diferenças. Mesmo uma diferença zero não resolve CMV parcial, cancelamento ou quarentena. Exporte as ocorrências completas em CSV para investigação.

Limites desta versão local: 20 MB por arquivo, até 50 mil linhas por arquivo, 55 mil no conjunto, 500 produtos e até três anos de cobertura. Os totais absolutos de receita/CMV/desconto são limitados a R$ 1 bilhão para preservar aritmética inteira no navegador. Erros mantêm a base anterior ativa. A importação de Excel direto ainda não existe: exporte as tabelas em CSV UTF-8.

Use `examples/importacao/` para um exercício reproduzível. O aceite “arquivo real em menos de cinco minutos” **não foi validado**, porque não foi fornecido um ERP real com totais conciliáveis.

## 8. Exportações

“Exportar resumo CSV” respeita os filtros e inclui valores com unidades explícitas, comparativos disponíveis, classificação e identificador da base. Textos com início interpretável como fórmula são neutralizados; valores numéricos negativos continuam numéricos.

“Resumo para PDF / impressão” prepara um relatório compacto com recorte, KPIs e cinco prioridades. Use **Salvar como PDF** no diálogo do navegador. Não é um gerador PDF autônomo e não foi validado visualmente em diferentes sistemas. Nomes/filtros muito longos podem produzir mais de uma página.

## 9. Resposta aos 27 achados

| ID | Avaliação e tratamento |
|---|---|
| A-01 | Procede. Contrato continua determinístico, explicitamente apresentado como regras. Geração livre/LLM fica pendente de arquitetura e avaliação adequadas. |
| A-02 | Corrigido na interface: Explicações verificáveis; sem selo que sugira modelo ao vivo. Proveniência antiga preservada. |
| A-03 | Corrigido na nova base: variação de margem por SKU, exceto ausência deliberada de CMV. Base antiga preservada como caso didático. |
| A-04 | Corrigido na nova base: processo único desde janeiro/2025, sem emenda em abril. |
| A-05 | Corrigido na nova base: vendas diárias. |
| A-06 | Corrigido: metas por categoria e duas vigências. |
| A-07 | Corrigido: série diária preenchida na nova base; agregação semanal explícita quando esparsa, com opção diária. |
| A-08 | Corrigido: referências de margem constantes aparecem anotadas. |
| A-09 | Ajustado: rótulos espaçados e largura/rolagem. Confirmação visual real ainda pendente. |
| A-10 | Implementado: cascatas reconciliadas contra 3M e ano anterior. |
| A-11 | Ampliado: Pareto, dispersão, mapa de calor, minigráficos por categoria, margem × meta e marcadores de compra. Sparklines por SKU e marcadores automáticos de mudança de preço/desconto ficam para evolução. |
| A-12 | Corrigido: ações deduplicadas, três fatos inicialmente visíveis. |
| A-13 | Implementado: resumo por regras, com números do motor. |
| A-14 | Implementado: classificação auditável, com ressalvas de cobertura e histórico. |
| A-15 | Parcial: leitura conclusiva no topo e maior pressão na cascata; títulos neutros mantidos quando não há evidência suficiente para uma conclusão única. |
| A-16 | Implementado: três ordenações explícitas. Índice composto não adotado por falta de pesos justificados. |
| A-17 | Parcial: CSV local, mapeamento, qualidade, conciliação, exportação e cenários salvos. Excel direto, PDF autônomo e aceite com dados reais não entregues. |
| A-18 | Pendente: margem de contribuição completa requer contrato para impostos, frete e demais custos variáveis. Pós-comissão existente não foi renomeado como contribuição. |
| A-19 | Pendente: sem elasticidade modelada/estimada. Hipóteses manuais de volume continuam. Um parâmetro arbitrário não será apresentado como previsão. |
| A-20 | Pendente: alertas continuam com regras globais configuráveis no dataset. Não há calibração estatística nem limites específicos por categoria na interface. |
| A-21 | Melhorado: arquivos reformatados e novos módulos separados. Templates grandes das abas ainda podem ser extraídos em evolução futura. |
| A-22 | Mitigado: contrato de cálculo central e paridade ampliada para a base diária. Duas implementações permanecem; geração de código não foi introduzida. |
| A-23 | Corrigido: guia vigente, changelog e pasta de histórico. |
| A-24 | Pendente: navegador real, Windows, celular, auditoria WCAG e regressão visual não executados. DOM/eventos ampliados não substituem esses testes. |
| A-25 | Melhorado: resumo/KPIs/fila primeiro; exploração e evidências excedentes recolhidas; comparativos permanentes preservados conforme sua solicitação. |
| A-26 | Pendente: PEPS/custo médio futuro exige estoque inicial, lotes, entradas/saídas e política de custeio. Compras isoladas não sustentam essa projeção. |
| A-27 | Corrigido: CMV parcial distribuído em outros SKUs, além do caso totalmente ausente. |

As demais recomendações — anotações com responsável/prazo, mensagens externas, autenticação multiempresa, trilha de auditoria compartilhada, bandas estatísticas, intervalos de incerteza e testes de mutação — permanecem no planejamento. Não foram ativadas integrações externas ou alertas automáticos. O aplicativo é estático/local, não um serviço empresarial multiusuário.

## 10. Validação e roteiro de apresentação

Resultados executados em `reports/validation.json`, resumo em `reports/VALIDACAO.md`, benchmark do motor em `reports/performance_v4_5.json`. As contagens de paridade, vetores e casos internos são subconjuntos da suíte, não devem ser somadas como testes independentes. O benchmark mede o motor com 50 mil vendas; não mede renderização de navegador ou carga concorrente.

Roteiro sugerido: abrir a base diária; ler o resumo; comparar prioridade por severidade e por gap; investigar SKU-013 crônico e SKU-001 com deterioração; mostrar a cascata e suas limitações; simular preço/meta/receita; salvar e restaurar um cenário; importar os quatro CSVs de exemplo e mostrar por que a cobertura parcial permanece visível mesmo com conciliação zero; encerrar com os limites e a próxima validação real.

Não afirmar que o produto “descobre causas”, “prevê demanda”, “usa IA ao vivo” ou “está homologado no Windows”. Seu diferencial demonstrado nesta entrega é o fluxo de investigação e simulação com números verificáveis e limites explícitos.
