# Arquitetura e decisões — v4.3.1

A v4.3 reaproveita o núcleo da v4.2: centavos/pontos-base, elegibilidade de CMV, compras comparáveis, simulador, barreira semântica de narrativa e decomposição. A interface e o mecanismo de seleção temporal foram reformulados. O histórico de versões anteriores não deve ser tratado como relatório atual.

## Fluxo técnico

`guardian/data.py` gera dados fictícios → validação Python → `build.py` anexa a meta vigente a cada registro e verifica respostas preparadas → `dist/demo-data.js` contém registros validados, metadados e textos permitidos → `dist/engine.js` agrega os intervalos selecionados → `dist/app.js` compartilha filtros e renderiza as três abas.

O frontend não é um importador de dados arbitrários: consome o contrato validado pelo build. O módulo Python `analyze` permanece como referência independente. Os testes confrontam todos os SKUs e quatro janelas em dez intervalos, inclusive janela vazia, dia único e cruzamento de ano. A decomposição filtrada tem 180 combinações comparadas. Os snapshots mensais usados internamente para validar as amostras não são enviados em duplicidade ao navegador.

O motor JS indexa registros por SKU e limita o cache a 64 intervalos. Os filtros não fazem requisições. Não há fontes externas, CDN, instalação de pacotes, framework ou chamada de modelo na abertura. Node e linkedom são ferramentas de desenvolvimento opcionais para o usuário final.

## Estado e escopo

O estado global guarda início/fim inclusivos, categoria, tipo exclusivo, SKU, aba, produto em foco e agrupamento. `sessionStorage` mantém o recorte na sessão quando permitido; sua indisponibilidade não impede o uso. A chave v4.3 evita interpretar o formato antigo como o novo. Não é sincronização entre computadores.

Categoria limita tipos disponíveis e sugestões de SKU. O tipo limita produtos. O período limita opções com movimento. Alterações reconciliam seleções inválidas com aviso. As referências históricas usam o mesmo universo de SKUs filtrados, incluindo produtos sem movimento atual quando o filtro é de carteira/categoria: isso preserva o efeito de mix e saída de produtos. O seletor de foco de Diagnóstico/Simulador oferece apenas produtos com movimento atual.

“Trocar produto” é foco de investigação, não um filtro oculto da carteira. Um SKU escolhido na barra global restringe todas as abas. Mudanças globais reiniciam premissas do simulador. Alternar abas conserva premissas enquanto a sessão permanece aberta.

## Calendário e integridade

A interface recebe datas inclusivas; o cálculo usa `[início, fim + 1 dia)`, em UTC, sem horário local. 3M = três meses civis anteriores ao mês inicial. Ano anterior = extremos inclusivos deslocados em um ano, limitando 29/02 a 28/02. Referências fora da cobertura completa não produzem variação exibida. Queda histórica e confiança alta exigem cobertura 3M completa.

Receita disponível inclui linhas sem CMV. LB = receita elegível − CMV elegível. Margem = LB / receita elegível, se positiva. Cobertura usa valores absolutos para acomodar devoluções. Ausência de CMV não vira custo zero. Gaps sem meta elegível são indisponíveis, não zero.

Gap líquido = máx(0, soma de metas monetárias − soma de LB das linhas cobertas). Gap por SKU aplica o máximo antes da soma. A decomposição de variação em preço, custo, mix e entrada usa os produtos filtrados; é identidade matemática, não causa comprovada. Preço é aplicado antes do custo. Receita líquida negativa por SKU ou quantidade elegível não positiva impede a decomposição unitária. Arredondamento visual pode produzir diferenças de 0,1 pp na soma dos rótulos.

Compras são ordenadas por data e chave; valores posteriores ao fim do recorte não entram na comparação. A identidade dos itens é validada globalmente: um ID duplicado em qualquer data bloqueia a comparação dos SKUs envolvidos. Erros de data também bloqueiam; outros erros de compras só bloqueiam quando anteriores ao fim consultado. Unidade incompatível e chave duplicada recusam comparação. Compra nova não substitui CMV registrado. Não implementamos PEPS/custo médio.

## IA e simulação

Três respostas preparadas têm IDs vinculados a SKU e outubro/2026. Só são reutilizadas para 01–13/10/2026; intervalos personalizados geram novos IDs e fallback de regras. O rótulo distingue os modos. Números são inseridos pelo código. O vocabulário é finito: fato, tipo de insight, hipótese, ação e ressalva. Não é um verificador universal de texto livre nem chamada ao vivo.

Simulação por SKU usa preço e CMV unitários médios arredondados a centavos. Meta e taxa vêm da última venda no recorte e são editáveis. Na demo a taxa por SKU é constante; não equivale a reconstruir um livro contábil com taxas variáveis. Preço de referência é arredondado para cima. Impostos, frete, despesas fixas, devoluções e elasticidade não entram no cenário. Sensibilidades conservadora/otimista são hipóteses de volume.

## Revisão da auditoria v4.3.1

Python agrupa vendas e compras por SKU uma vez por análise; o navegador monta os índices uma vez por criação do motor. Metas têm índice de vigências por SKU e busca binária; vigências sobrepostas são recusadas. Os registros de venda são ordenados por data e ID, garantindo premissas da última venda mesmo com entrada fora de ordem. Não existe importador geral nem promessa de complexidade linear para todas as etapas.

Materialidade: o impacto é o maior entre gap positivo e prejuízo bruto absoluto. O total de referência soma receitas elegíveis positivas por SKU da carteira analisada. Margem negativa só passa de Crítico a Alto se impacto × 200 < total, com total positivo. Meta ausente/parcial não apaga prejuízo.

Diagnóstico principal: negative → target → cost → price, ordenado explicitamente. Uma amostra preparada de prioridade menor não ultrapassa um fato mais crítico por regras; aparece como complementar. Todas as respostas passam pela mesma barreira de evidência. A ordem de ai_prepared.json não muda a decisão.
