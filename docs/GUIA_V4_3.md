# Margin Guardian AI

> Atualizado pela revisão técnica v4.3.1 em 14/10/2026. Recursos visuais preservados; consulte `AUDITORIA_V4_3_1.md` para as novas regras, narrativas complementares e medições.
Preparado para Thz • 14 de outubro de 2026

A versão 4.3 transforma o projeto em um painel executivo com filtros compartilhados e comparações históricas visíveis. Este guia explica o que foi implementado, como usar, quais decisões sustentam os cálculos e o que ainda precisa ser validado antes da candidatura em 16/10/2026.

### Visual recomendado

Recomendo uma interface clara, com azul-petróleo na navegação e verde nas ações. A navegação horizontal libera espaço para os números. Atual, 3M e ano anterior têm posições e cores consistentes; rótulos e datas permitem compreender as diferenças sem depender apenas de cor.

A reformulação foi aplicada. Os números aparecem estáveis, sem contagem animada. Cartões históricos, tabelas alinhadas e avisos de qualidade ficam próximos dos resultados a que se referem.

### Pedidos e entrega

| Pedido | Implementação na versão 4.3 |
| --- | --- |
| Datas no estilo Entre | Início e fim livres dentro da base, ambos inclusivos. |
| Busca de SKU | Digitação por nome ou código, sugestões e teclado. |
| Filtros em cascata | Categoria e tipo limitam os produtos disponíveis. |
| Essencial e Especial | Dois botões exclusivos com clique para limpar. |
| Comparações sem seletor | Atual, 3M e ano anterior visíveis nas três abas. |
| Mesmos filtros entre abas | Estado único, preservado durante a sessão. |
| IA e melhorias | Evidências por intervalo, decomposição filtrada e fallback identificado. |

Entrega: projeto completo em ZIP, demonstração publicada e este documento. O núcleo financeiro e o simulador da v4.2 foram reaproveitados; a interface e a seleção temporal foram reformuladas.

## Datas e comparativos históricos

Os dois campos de data reproduzem o comportamento funcional de “Entre”: a análise inclui o primeiro e o último dia. É possível consultar um único dia, atravessar meses ou selecionar um ano parcial. Há atalhos para mês atual, últimos 90 dias e ano atual.

### Definições usadas

| Janela | Regra | Exemplo com seleção de 08/09 a 08/10/2026 |
| --- | --- | --- |
| Atual | Datas informadas, inclusive os extremos. | 08/09/2026 a 08/10/2026 |
| 3M | Três meses civis completos antes do mês da data inicial. | 01/06/2026 a 31/08/2026 |
| Ano anterior | Mesmos extremos inclusivos, deslocados em um ano. | 08/09/2025 a 08/10/2025 |

3M é um total acumulado de três meses, não uma média mensal nem uma janela móvel de 90 dias. Essa escolha evita incluir parte do período analisado na referência. Se o início mudar de mês, o trimestre de referência também muda.

### Leitura correta dos impactos

Os cartões mostram margem, receita, lucro bruto elegível e cobertura CMV em cada janela. A diferença de margem é expressa em pontos percentuais. Por exemplo, de 30% para 25% significa −5 pp, não −5%.

A receita dos 3M aparece como contexto, sem percentual de crescimento contra um intervalo de outra duração. No ano anterior, o crescimento de receita exige igual número de dias e receita-base positiva. Isso não corrige diferenças de dias úteis, feriados ou sazonalidade.

### Calendário e cobertura

No deslocamento anual, 29/02 vira 28/02 quando o ano de referência não for bissexto. Se as durações mudarem, a interface informa o ajuste e não mostra crescimento percentual de receita. Datas inválidas ou invertidas mantêm a última análise válida e exibem uma mensagem.

A base demonstra 01/01/2025 a 13/10/2026. Uma referência que ultrapasse essa cobertura fica “Histórico insuficiente”. Não se estima o passado ausente. Dias sem venda dentro da cobertura são diferentes de falta de histórico: podem ter receita zero e margem indisponível.

O histórico anterior a abril/2026 foi acrescentado com dados fictícios para permitir a demonstração anual. As 780 vendas originais de abril a outubro/2026 foram preservadas.

## Filtros interativos e navegação

### Categoria e tipo de produto

A categoria selecionada restringe os produtos, os tipos disponíveis e os resultados. Os botões Essencial e Especial funcionam como seleção exclusiva: clicar em um ativa esse tipo; clicar no outro troca o tipo; clicar novamente no ativo volta a todos. Sem botão ativo significa todos os tipos.

Se um novo período ou uma nova categoria tornar o SKU escolhido incompatível, o sistema remove a seleção do SKU e informa a mudança. Isso evita uma tela vazia causada por uma combinação impossível. Tipos sem produtos no recorte ficam desabilitados.

### Busca por nome ou SKU

Digite parte do nome ou do código. “cafe” encontra “Café” e “Cápsulas de café”; “sku-001” encontra o código correspondente. A busca ignora acentos e diferença entre maiúsculas e minúsculas. As sugestões respeitam período, categoria e tipo.

Digitar apenas procura: o filtro é aplicado ao clicar em uma sugestão ou pressionar Enter. Setas para cima e para baixo percorrem as opções; Esc fecha a lista. O botão × remove o produto selecionado. Uma busca sem correspondência informa que nenhum produto foi encontrado no recorte.

### Estado compartilhado

O recorte global acompanha Executivo, Diagnóstico e Simulador. Quando o navegador permite, ele é guardado em sessionStorage durante a sessão, inclusive ao recarregar a página. Não há sincronização entre dispositivos ou armazenamento permanente de cenários.

“Trocar produto”, dentro do Diagnóstico e do Simulador, muda o produto em foco e acompanha essas duas abas. Esse controle não cria um filtro oculto da carteira. Para restringir também o Executivo a um SKU, use a barra global.

Mudar qualquer filtro global reinicia as premissas do simulador para o novo recorte. Trocar apenas de aba preserva as premissas. “Limpar filtros” restaura as datas iniciais da demonstração e todos os produtos, mantendo a aba em que você está.

### Exemplo de uso

Selecione Tecnologia, ative Essencial, digite um SKU e escolha a sugestão. Observe os três cartões de período. Abra Diagnóstico e depois Simulador: categoria, tipo, SKU e datas permanecem. Troque para uma categoria incompatível: o sistema limpa o SKU e apresenta o aviso.

## O que mudou em cada aba

### Visão executiva

Quatro indicadores mostram receita disponível, margem bruta, lucro bruto elegível e falta para a meta por SKU. A cobertura CMV informa a parcela dos movimentos com custo válido. O gap líquido da carteira aparece separado da soma dos gaps por produto.

Atual, 3M e ano anterior aparecem lado a lado. A decomposição mostra preço líquido, CMV unitário, mix e entrada de SKUs contra as duas referências. Corrigimos a v4.2, que usava a carteira inteira nessa decomposição: agora todos os efeitos respeitam os filtros.

A curva mensal também traz as duas referências. Cada ponto respeita o intervalo selecionado, inclusive meses parciais. Com apenas um mês selecionado, há um ponto; amplie as datas para analisar trajetória. As tabelas por categoria, tipo ou produto e o ranking de sinais exibem as margens históricas sem abrir outro cenário.

### Diagnóstico

O histórico do produto em foco fica visível antes das evidências. A investigação mantém fórmulas, origem das linhas, identificação da hipótese, ação condicionada e separação entre compras e CMV realizado. O seletor de foco oferece produtos com movimento no recorte.

Preço líquido e última compra comparável são apresentados como grandezas distintas. Caixa e unidade sem conversão continuam bloqueando a comparação. Sem CMV, o diagnóstico mostra a pendência e não inventa uma margem.

### Simulador

Os cartões de histórico realizado ficam acima do cenário. A tabela Atual × proposto e as sensibilidades conservadora e otimista continuam separadas desses históricos. Você pode mudar preço, custo, quantidade, comissão e meta, além de copiar as premissas e os resultados.

O volume de equilíbrio mostra a quantidade necessária para preservar o lucro bruto de referência, quando matematicamente aplicável. É um cálculo condicionado ao preço e custo definidos; não prevê quantas unidades serão vendidas.

### Melhorias adicionais adotadas

Retiramos animações nos números, tornamos a seleção incompatível recuperável e limitamos o cache de intervalos. Textos e comparativos usam o mesmo recorte; custo ausente, meta indisponível e histórico incompleto permanecem visíveis como limitações dos dados.

## Cálculos e trilha de IA

### Regras financeiras preservadas

| Indicador | Definição e cuidado |
| --- | --- |
| Receita disponível | Soma das vendas válidas, inclusive linhas sem CMV. |
| Lucro bruto elegível | Receita das linhas com CMV válido menos o CMV dessas mesmas linhas. |
| Margem realizada | Lucro bruto elegível dividido pela receita elegível positiva. Não é média simples das margens dos SKUs. |
| Cobertura CMV | Receita absoluta movimentada com CMV válido dividida pela receita absoluta movimentada válida. |
| Gap por SKU | Máximo entre zero e a falta para a meta em cada SKU; depois somam-se os gaps positivos. |
| Gap líquido | Máximo entre zero e a falta para a meta agregada; admite compensação entre itens. |

Dinheiro usa centavos e taxas usam pontos-base. Última compra não reescreve o custo das vendas. Meta sem cobertura não vira zero. O resultado pós-canal desconta comissão, mas não inclui todas as despesas e não equivale a lucro líquido.

### Como ler a decomposição

Os efeitos conciliam a variação da margem antes do arredondamento visual. Preço é aplicado antes de custo; outra ordem pode distribuir a interação de modo diferente. A decomposição é matemática, não prova causal. Receita líquida negativa por SKU ou quantidade elegível não positiva impede essa decomposição unitária.

### IA escolhida para esta etapa

Adotamos cálculo determinístico com explicações vinculadas a evidências. Três respostas estruturadas já produzidas com apoio de IA são validadas e aparecem como “IA produzida previamente”. Elas só são reutilizadas no intervalo original de 01 a 13/10/2026.

Em intervalos personalizados, o sistema cria fatos com IDs do novo período e mostra “Texto automático de regras”. O contrato permite apenas fato, período, tipo, hipótese, ação e ressalva autorizados. Os números vêm do código, não de texto livre. Sem evidência, a resposta é um alerta de qualidade.

Não há LLM ao vivo, API paga, chave ou envio de dados a provedor. Essa trilha mantém a demonstração offline e verificável. Uma integração futura deve gerar a partir do mesmo contrato, validar a resposta no servidor e preservar o fallback; os testes atuais não medem a precisão de um provedor.

## Arquitetura e execução

### Fluxo da aplicação

O Python gera e valida a base fictícia. O build associa a meta vigente a cada registro e valida as respostas preparadas. O navegador recebe esses registros e calcula os intervalos com o motor JavaScript. Os testes comparam os dois motores. A interface não importa dados arbitrários nem substitui uma validação de origem.

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| ABRIR_DEMONSTRACAO.html | Entrada local, abre a interface pronta. |
| iniciar_windows.bat | Abre o HTML; sem instalação ou download de pacotes. |
| guardian/ | Validação, calendário, agregação, decomposição, simulação e narrativa em Python. |
| build.py | Regenera dados, fatos, metadados e payload da interface. |
| dist/engine.js e math.js | Intervalos e fórmulas no navegador, com paridade testada. |
| dist/app.js e style.css | Filtros compartilhados, três abas e novo visual. |
| tests/ e reports/ | Testes reproduzíveis e resultados da execução. |
| docs/ | Guia, decisões, escopo e roteiro de apresentação. |

### Otimizações aplicadas

A interface usa um índice de registros por SKU e cache limitado a 64 intervalos. Os snapshots mensais duplicados foram retirados do arquivo enviado ao navegador, que ficou com 578.083 bytes. Não há fonte externa, CDN ou chamada remota para calcular filtros e cenários.

A base contém 20 SKUs, quatro categorias, 2.580 linhas de venda e 440 compras fictícias. Isso sustenta a demonstração, mas não comprova desempenho com milhões de linhas ou uso simultâneo empresarial. O tempo da suíte de testes não é uma medição de abertura no Windows.

### Como abrir o ZIP

Extraia todo o conteúdo e abra ABRIR_DEMONSTRACAO.html no navegador. No Windows, também pode clicar no BAT. Mantenha a pasta dist junto do iniciador. Se não abrir, use botão direito no HTML e escolha o navegador. Python é opcional: “python iniciar.py” oferece um servidor local em 127.0.0.1.

## Validação e critérios de aceite

A validação foi executada em Linux com Python 3.12.14 e Node 24.19.0. Os casos abaixo pertencem à suíte e não devem ser somados como se fossem contagens independentes.

| Verificação | Resultado |
| --- | --- |
| Testes Python e API | 82 aprovados (v4.3.1). |
| Simulação e agregação | 16 vetores compartilhados e 105 combinações de agregação JS/Python. |
| Intervalos arbitrários | 10 intervalos; 200 pares intervalo/SKU; quatro janelas por par. |
| Decomposição filtrada | 180 combinações confrontadas com Python e conciliadas. |
| Interface e eventos DOM | 32 verificações de filtros, busca, teclado, abas, datas e simulador. |
| Contrato de narrativa | 12 fixtures controladas e 3 amostras preparadas verificadas. |

### Casos que mereceram proteção

Foram cobertos dia único, intervalo vazio de vendas, cruzamento de ano, fevereiro bissexto, histórico parcial, custo ausente, retorno de mercadoria e ausência de meta. As referências incompletas não sustentam variação exibida; histórico 3M completo também é exigido para confiança alta.

### Aceites ainda pendentes

Não houve teste nativo no Windows nem inspeção visual em navegador real. O teste DOM verifica estrutura e eventos; não garante aparência, calendário nativo, comportamento móvel ou experiência com leitor de tela. Essas verificações devem acontecer no computador e celular de apresentação.

Antes de apresentar: abra o ZIP extraído; percorra as três abas; teste data inicial e final; selecione categoria, tipo e SKU; confirme a persistência ao navegar; confira textos e números em tela pequena; copie um cenário; abra o link publicado em outro dispositivo.

### Reproduzir os testes

Na pasta do projeto, execute “python verificar.py”. Node é necessário para a paridade JS/Python. Para testar eventos DOM, instale linkedom 0.18.12 somente no ambiente de desenvolvimento ou informe GUARDIAN_DOM_MODULE. Nenhuma dessas instalações é necessária para usar a demonstração.

Os resultados estão em reports/validation.json e reports/VALIDACAO.md. Dados reais, integrações e escala empresarial continuam fora da validação desta entrega.

## Próximos ajustes e apresentação

### Plano sugerido até 16 de outubro

| Quando | Prioridade | Critério de conclusão |
| --- | --- | --- |
| 14/10 | Conferir abertura e novo fluxo no computador e no celular. | Datas, filtros, comparativos e cenários funcionam no dispositivo de apresentação. |
| 15/10 | Corrigir problemas observados e ensaiar a demonstração. | Roteiro de três minutos compreensível, sem desvios ou telas ilegíveis. |
| 16/10 | Conferir link e ZIP, revisar candidatura e enviar. | Arquivos e texto atendem ao formulário; envio realizado pelo usuário. |

Esse é um plano de trabalho sugerido, sem agendamento ou envio automático. Para o prazo, recomendo priorizar os defeitos que impeçam o uso e a clareza da apresentação, antes de adicionar dependências ou integrações.

### Evoluções ainda não implementadas

Primeiro, importação CSV com contrato mínimo, validação das unidades, metas e CMV e reconciliação contra a origem. Depois, cenários salvos com premissas e comparação entre decisões. Excel e exportação de relatórios podem seguir conforme a necessidade real de uso.

Geração de IA ao vivo fica como evolução opcional, dependente de provedor, custo e credencial no servidor. ERP, autenticação, multiempresa e previsão de demanda requerem outro escopo. Não apresentamos essas capacidades como existentes.

### Roteiro de demonstração

Comece no Executivo: mostre os dados fictícios e os três períodos já visíveis. Filtre uma categoria e um tipo; procure um SKU. Abra Diagnóstico para mostrar o fato, a fórmula e o período da evidência. Entre no Simulador, altere preço e volume e compare o resultado condicionado às premissas.

Ao explicar IA, mostre o rótulo do modo e o teste de recusa de uma resposta incorreta. Diga que o cálculo é determinístico e a demo não chama um LLM ao vivo. Encerre com a validação executada e o próximo passo de usar dados reais reconciliados.

### Onde consultar

O ZIP contém README.md, docs/GUIA_V4_3.md e os relatórios de validação. A página “Método e projeto”, acessível pelo painel, explica a participação da IA e os limites da demonstração.

Demonstração: https://margin-guardian-simplificado-thz.thauzerdark.chatgpt.site
