# Margin Guardian AI — Guia da revisão v4.4

**16/10/2026 · Evolução sobre a v4.3.1 · Dados fictícios**

Esta entrega atende aos cinco ajustes solicitados a partir dos prints: melhora a resolução temporal dos gráficos, torna o plano de investigação específico para cada SKU, conecta as entradas do simulador, melhora o compartilhamento e amplia as explicações verificáveis. A identidade visual e a execução sem dependências de produção foram preservadas.

## 1. Gráficos por dia ou dezena

| Seleção | Comportamento |
|---|---|
| 01 a 13/10/2026 | Um ponto por dia: 1 de Out, 2 de Out, …, 13 de Out. |
| 08 a 12/10/2026 | Somente esses cinco dias. |
| Julho e agosto | Blocos 1–10, 11–20 e 21–fim do mês. Rótulos no último dia de cada bloco. |
| 16/07 a 23/08 | Primeiro bloco 16–20/07; último bloco 21–23/08. Nenhum dia fora do filtro entra. |
| Virada de ano | Rótulos incluem o ano para evitar ambiguidade. |

A sugestão “30 de Jul” foi ajustada para **31 de Jul**, porque o terceiro bloco precisa incluir o dia 31. Em fevereiro ele termina em 28 ou 29. Isso evita perder vendas ou criar um bloco isolado de um dia.

As mudanças estão na trajetória executiva e na curva de preço líquido × custo de compra. Em seleções extensas, o gráfico permite rolagem horizontal para preservar os rótulos. A tabela de valores exatos informa os períodos de cada ponto; no executivo, também informa as janelas de referência de 3M/ano anterior.

**Regras preservadas:** receita e lucro são somados; margem é ponderada pela receita elegível. Não se faz média simples das margens diárias. Dia sem venda não vira margem zero; a linha se interrompe. Histórico incompleto não é inventado. A referência 3M é a dos meses civis completos anteriores ao mês inicial de cada ponto, não uma previsão diária. Valores de compra são observados até o fim de cada bloco; não reescrevem CMV realizado.

## 2. Da investigação à decisão

O cartão passou a apresentar dados do SKU em foco:

- Primeiro passo conforme qualidade, resultado após comissão e gap.
- Gap elegível e resultado registrado após comissão.
- Preço de referência para a meta, usando CMV médio e meta da última venda.
- CMV máximo por unidade para manter o preço médio e alcançar essa meta bruta.
- Cobertura de CMV, cobertura de meta e data/valor da última compra comparável.
- Ações para simular preço para a meta, CMV 5% menor ou meta após comissão.

Os preços/limites associados à meta ficam indisponíveis quando a meta não cobre todas as vendas elegíveis. As alternativas são hipóteses editáveis, não recomendações de reajuste nem promessas de demanda. O resultado após comissão não desconta todas as despesas da empresa.

O layout usa alinhamento pelo topo, sem obrigar o cartão vizinho a acompanhar a altura de uma narrativa longa. O mesmo princípio foi aplicado às premissas do simulador: conteúdo útil e altura natural, sem preencher espaço apenas com decoração.

## 3. Simulador conectado pelo último campo principal editado

“Valor líquido” pode significar receita ou resultado. Para evitar confusão, foram oferecidos dois campos com nomes e fórmulas explícitos.

| Campo principal editado | O que passa a definir o cálculo |
|---|---|
| Preço líquido unitário | Mantém esse preço e recalcula receita, CMV total, comissão, LB e margens. |
| Margem-alvo | Calcula o preço mínimo para atingir a meta bruta ou após comissão. |
| Receita líquida total desejada | Calcula o preço por unidade necessário para esse total, mantendo o volume. |
| Resultado após comissão desejado | Calcula o preço necessário para alcançar receita − CMV − comissão, mantendo volume, custo e taxa. |

Um indicador mostra o campo que está comandando o cenário. Ao alterar custo, comissão ou volume, o simulador respeita esse modo. Alterar o tipo de meta passa a comandar pela margem. O botão “Usar preço-referência da meta” faz o mesmo; editar preço novamente volta ao modo de preço.

Não há dois objetivos concorrentes ativos: o último campo principal é o objetivo vigente. A margem-alvo continua sendo uma referência quando o modo é preço ou total; ela não é prometida como atingida. O texto “meta alcançada” só aparece quando a margem calculada atende ao alvo.

### Exemplos e arredondamentos

- CMV R$ 120,00, margem bruta desejada de 20%: preço R$ 150,00.
- Mesmo CMV, comissão 10% e margem após comissão de 20%: preço R$ 171,43, arredondado para cima.
- Receita desejada de R$ 10,00 e volume de três unidades: preço R$ 3,34, receita obtida R$ 10,02. A diferença de R$ 0,02 aparece; não se cria quantidade fracionária para forçar o valor.
- O resultado após comissão pode ser negativo. O cálculo inverso considera o arredondamento da comissão total e encontra o menor preço em centavos que atinge o objetivo.

Os valores totais desejados exigem volume maior que zero. Entradas fora dos limites, casas decimais excessivas e combinação meta + comissão de 100% ou mais são recusadas. Preço, custo e quantidade mantêm os limites anteriores. Resultado impossível dentro desses limites não é preenchido silenciosamente.

### Informações extras nas premissas

O painel agora mostra margem calculada versus alvo, participação de CMV e comissão na receita e saldo unitário após comissão. Há sensibilidades isoladas: preço +1%, CMV −1% e comissão −1 ponto percentual, com o volume proposto fixo. Cada uma compara seu efeito no resultado após comissão; não se somam essas diferenças como se fossem um único cenário.

A sensibilidade de volume continua mostrando referência, conservador, proposto e otimista. O volume mínimo para preservar o LB de referência agora informa unidades inteiras; a perda de volume suportável considera esse arredondamento.

**O realizado não muda.** Os cartões históricos vêm dos registros. A referência da simulação é recalculada com médias unitárias arredondadas e pode diferir em centavos do agregado real. Meta ausente/parcial e CMV parcial recebem avisos; zero no campo de meta não é tratado como prova de meta cadastrada.

Alternar abas preserva o cenário desta sessão. Alterar o filtro global ou trocar de produto reinicia premissas para não aplicar o cenário de um SKU a outro. Não há salvamento de cenários entre sessões.

## 4. Copiar cenário, visualizar e fechar

“Copiar cenário” copia um **resumo legível**, incluindo produto, período, modo de cálculo, premissas, resultados, sensibilidades e limites.

- Cópia bem-sucedida: o painel de resumo fecha; uma confirmação aparece por quatro segundos e pode ser dispensada imediatamente.
- “Ver resumo”: abre o texto quando desejado. “Fechar resumo” ou Escape o recolhe.
- JSON fica em uma seção de detalhes dentro do painel, útil para conferência técnica.
- Se o navegador impedir a cópia automática — situação possível ao abrir um arquivo local — aparece o resumo para seleção manual, com instrução para Ctrl+C/Copiar e botão de fechar.
- Alterar uma premissa fecha o resumo e invalida a confirmação antiga. Cenário inválido não pode ser copiado.
- Uma cópia que termina depois de trocar de aba não tenta atualizar elementos removidos nem mostra confirmação em outra tela.

## 5. Explicações ampliadas e testes da IA

O contrato agora contempla oito tipos de fato, sempre vinculados ao SKU e ao período:

| Fato | Condição / interpretação |
|---|---|
| Margem negativa | Lucro bruto elegível negativo. |
| Pressão da comissão | LB não negativo, mas insuficiente para cobrir a comissão registrada. |
| Abaixo da meta | Gap positivo sobre vendas cobertas por meta. |
| Alta de compra | Alerta de custo configurado e duas compras comparáveis. |
| Queda de preço líquido | Alerta do motor sobre a variação de preço. |
| Contexto 3M | Margens disponíveis e referência completa de três meses. |
| Comparação anual | Margens disponíveis e referência anual completa. |
| Meta atendida | Margem não negativa, gap zero, CMV integral e meta em toda a receita elegível. |

A prioridade segue essa ordem; os fatos complementares permanecem visíveis. Comparações podem mostrar melhora, queda ou estabilidade, sem transformar diferença em causa. Sem CMV elegível, não há narrativa financeira fabricada. Sem sinais enquadrados, o texto informa a ausência de diagnóstico em vez de declarar que o produto está saudável.

A área “Como a explicação se comporta?” oferece seis testes: valor inventado, período errado, ID inexistente, causalidade sem evidência, ausência de evidência e resposta válida. Cada teste exibe aceitação/recusa e sua razão. A troca de caso limpa o resultado anterior.

**Limite da IA:** os novos fatos usam regras determinísticas. Continuam existindo três respostas preparadas pelo assistente no intervalo original. Não foram adicionados LLM ao vivo, chave de API, previsão de demanda, inferência causal ou novas amostras geradas. O contrato foi ampliado para `evidence-enums-v2`, preservando a proveniência original v1 das amostras.

## 6. Pontos de atenção tratados na revisão

1. Fim de mês real e intervalo parcial, incluindo fevereiro bissexto e virada de ano.
2. Margem ponderada e ausência de dados, sem converter vazios em zero.
3. Objetivos concorrentes no simulador resolvidos por um único campo principal ativo.
4. Diferenças de centavos no cálculo inverso informadas ao usuário.
5. Arredondamento de volume mínimo para não superestimar a queda suportável.
6. Estado de erro limpo ao recuperar um preço pelo slider ou trocar o campo principal.
7. Preservação das vendas realizadas, do recorte global e das premissas ao alternar abas.
8. Bloqueio de cópia desatualizada e proteção da operação assíncrona após navegação.
9. Distinção entre receita líquida, LB, resultado após comissão e lucro líquido.
10. Meta ausente/parcial visível, sem apresentar zero como cadastro válido.
11. Responsividade por CSS, foco visível e respeito à preferência de movimento reduzido; sem alegar homologação visual ou conformidade WCAG integral.

## 7. Verificação e entrega

**94 testes Python/API e 67 verificações de eventos/DOM aprovados em Linux.** A suíte contém os testes anteriores mais calendário, inversão de totais, novos fatos, mudanças sincronizadas e cópia/fechamento. Permanecem os 16 vetores de simulação, 105 agregações comparadas, dez intervalos/200 pares intervalo-SKU, 180 decomposições e 12 fixtures controladas de narrativa. Essas contagens se sobrepõem; não devem ser somadas como testes independentes.

Os prints enviados foram lidos como referências. A execução nativa Windows e a conferência do layout em navegador desktop/mobile real não puderam ser realizadas neste ambiente. O teste DOM verifica estrutura e eventos, não tamanho renderizado, calendário nativo, permissões reais da área de transferência ou comportamento de leitor de tela. A cópia automática tem alternativa manual justamente para esses ambientes.

O benchmark da v4.3.1 permanece como registro histórico, sem ser atribuído à v4.4. Não foi feita uma nova promessa de ganho de desempenho.

Para usar: extraia todo o ZIP e abra `ABRIR_DEMONSTRACAO.html` ou `iniciar_windows.bat`. Para validar o código: `python verificar.py` com Node disponível; o teste DOM requer linkedom 0.18.12 ou `GUARDIAN_DOM_MODULE`. Não é necessário instalar essas ferramentas para abrir a demonstração pronta.
