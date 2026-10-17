# Contrato de cálculo — cents-bps-v1 / aplicação v4.5

Esta é a referência conjunta das implementações Python e JavaScript. Não há geração automática de um motor a partir do outro. Alterações exigem atualizar ambos e executar as regressões compartilhadas.

- Moeda: centavos inteiros. Taxas: pontos-base inteiros; 100 bps = 1%. Quantidade inteira.
- UI: datas inclusivas. Motor: `[início, fim exclusivo)`. UI soma um dia ao fim.
- Receita disponível: vendas/devoluções aceitas. Cancelamentos não entram. Não subtrair desconto novamente: revenue já é líquido.
- Elegível: CMV inteiro com sinal compatível com venda/devolução. CMV ausente não vira zero; exclui a linha da margem/LB, mas mantém sua receita disponível.
- Cobertura CMV: soma absoluta da receita elegível / soma absoluta da receita aceita. Não é quantidade de linhas nem saldo líquido.
- LB elegível: receita elegível − CMV elegível. Margem: LB / receita elegível positiva; caso contrário indisponível.
- Comissão: arredondamento HALF_UP por linha, receita × channel_bps / 10000. Totais agregados são soma dessas comissões. O simulador calcula a comissão sobre o total simulado; no caso de múltiplas linhas pode haver diferença de centavos.
- Meta: vigência por SKU, início inclusivo/fim exclusivo; sobreposições recusadas. Valor-alvo arredondado HALF_UP por linha. Gap = máximo de zero e valor-alvo − LB das linhas com meta.
- Gap por SKU soma apenas gaps positivos. Gap agregado permite compensações. Ambos diferem de perda realizada.
- Severidade negativa: materialidade usa máximo entre gap e prejuízo bruto, contra 0,5% da receita elegível positiva de toda a carteira do período. Filtros de apresentação não recalibram essa base.
- 3M: três meses civis anteriores ao mês inicial. Ano anterior desloca as duas datas inclusivas em um ano, com 29/02 → 28/02 quando necessário. Referências incompletas não são estimadas.
- Decomposição: preço, custo, mix e entrada reconciliam exatamente a diferença de margem. Saídas fazem parte do mix. Ordem preço antes de custo; não é inferência causal. Receita/quantidade líquidas incompatíveis suspendem a decomposição.
- Simulador: preço e CMV unitários, quantidade, comissão, meta bruta/pós-comissão. O último campo principal editado (preço, margem, receita ou resultado pós-comissão) define o preço. Os demais insumos respeitam essa escolha.
- Preço-referência: arredondado para cima. Objetivo em reais: busca do menor preço em centavos que alcança o total; diferença explícita, sem alterar quantidade para forçar resultado.
- Compras: integridade global por ID; comparação entre duas últimas compras anteriores ao fim, mesmo SKU/unidade. Não substituem CMV de vendas.

As classificações de padrão usam os agregados calculados, com regras e limites descritos no guia. Não alteram os fatos financeiros. Classificação, agrupamento temporal e formatos CSV têm versões de comportamento documentadas na v4.5.
