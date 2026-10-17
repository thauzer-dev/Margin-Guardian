# Margin Guardian AI — Parecer da auditoria e revisão v4.3.1

**Entrega: 14/10/2026 · Base revisada: v4.3 · Candidatura prevista: 16/10/2026**

A auditoria identificou problemas reais. Esta revisão corrige o comportamento tanto no Python quanto no JavaScript, explicita decisões matemáticas já corretas e separa medições executadas de verificações ainda pendentes. Não foi necessário reconstruir o sistema: foram reaproveitados a interface, os filtros compartilhados, o histórico, o simulador e o contrato de narrativa.

## 1. Parecer ponto a ponto

| Item da auditoria | Avaliação | Decisão nesta entrega |
|---|---|---|
| 1.1 — Limiar de custo fixo em narrative.py | Procede. Também existia no JavaScript. | Fato de custo acompanha o alerta parametrizado; exige compra comparável e variação disponível. |
| 1.2 — Prioridade das narrativas | Procede como ambiguidade de produto e inconsistência entre caminhos. | Hierarquia explícita e igual nos dois motores: negativa → meta → custo → preço. Complementares ficam visíveis. |
| 1.3 — Duplicidade global de compras | Procede. Filtrar antes de verificar deixava conflitos entre SKUs e datas sem diagnóstico global. | Validação global de compras, quarentena de linhas inválidas e bloqueio explícito da comparação afetada. |
| 1.4 — Origin null ao abrir file:// | Observação válida, mas não é defeito do fluxo atual. | Mantida a recusa. O HTML usa o motor JS local; API é opcional, pelo mesmo endereço HTTP. Host também é validado. |
| 1.5 — Leitura sem UTF-8 | Correção válida. A afirmação de CP1252 como padrão universal do Windows é excessiva. | Leitura e gravação explícitas em UTF-8, inclusive fixtures e saídas de Node; regressão com padrão CP1252 simulado. |
| 2.1 — Datas inclusivas/exclusivas | Convenção já correta; não era erro de cálculo. | Preservada e documentada na interface, no código e no roteiro. |
| 2.2 — Entrada e saída de SKUs | A identidade descrita faz sentido. Saída já integra mix. | Fórmula preservada; texto explicativo e caso explícito de entrada/saída com conciliação Python/JS. |
| 2.3 — Severidade quando falta meta | Procede. A mesma falha existia no JS. | Materialidade usa o maior entre gap e prejuízo bruto; também protege metas parcialmente cobertas. |
| 3 — Indexar vendas, compras e metas | Faz sentido. O ganho fixo de 20× e a descrição O(N) para toda a análise não estão demonstrados. | Índices aplicados; benchmark local mediu 2,32× em 50 mil vendas, com resultados financeiros iguais. |
| Checklist — Windows, celular e manifesto | São verificações distintas. | Manifesto regenerado e conferido no ZIP. Windows nativo e layout em navegador real permanecem pendentes. |

## 2. Narrativas: uma prioridade, sem esconder evidências

O diagnóstico principal é escolhido por `negative`, `target`, `cost`, `price`. A ordem de inserção dos fatos e a ordem de `ai_prepared.json` não decidem mais a precedência. IDs preparados duplicados são recusados.

Cada fato recebe sua própria resposta validada. Uma resposta preparada de custo não ultrapassa uma situação abaixo da meta; continua aparecendo como fato complementar, com seu rótulo de origem. Assim, a amostra H1 de custo continua acessível quando o fato principal é a meta. As três amostras existentes continuam verificadas. Não houve criação de novas amostras nem chamada a modelo ao vivo.

A regra de custo passou a acompanhar `Alta de custo de compra`. Exemplo testado: regra de 8% e aumento de 9% produzem alerta e fato; regra de 25% e aumento de 20% não produzem esse fato. Evita-se duplicar o limiar financeiro em um segundo módulo.

Arquivos: `guardian/narrative.py`, `build.py`, `dist/engine.js`, `dist/app.js`.

## 3. Compras: integridade global e recorte temporal

O ID identifica uma **linha de compra única na base**, não apenas o número de uma nota que possa se repetir em vários itens. Uma futura integração deverá criar essa chave, por exemplo a partir de documento + item, antes de entregar dados ao motor.

A validação agora verifica: ID textual não vazio e único, SKU cadastrado, data ISO válida, custo inteiro não negativo, quantidade inteira positiva e unidade informada. Booleanos não são aceitos como números. A compatibilidade da unidade continua exigida nas duas compras comparadas; não há conversão automática de caixa para unidade.

Linhas inválidas entram no relatório de qualidade. Não se escolhe silenciosamente uma das cópias nem se usa um par antigo para mascarar uma compra inválida conhecida. Compras não alteram o CMV registrado nas vendas.

A identidade é global: duplicatas em qualquer data bloqueiam a comparação dos SKUs envolvidos, mesmo que uma cópia esteja depois do período. Isso é um diagnóstico da integridade da base completa disponível, não uso de custo futuro no cálculo. Para outros erros, só compras anteriores ao fim consultado bloqueiam a comparação; uma data inválida também bloqueia, pois não há recorte temporal confiável. Uma compra futura única com custo inválido é reportada globalmente, mas não invalida um par histórico válido.

Arquivos: `guardian/data.py`, `guardian/engine.py`, `dist/engine.js`.

## 4. Materialidade e severidade

A regra considera:

- Prejuízo bruto = máximo entre zero e o negativo do lucro bruto elegível.
- Impacto = máximo entre gap positivo e prejuízo bruto.
- Base de materialidade = soma das receitas elegíveis positivas por SKU da carteira analisada.

Um item com margem negativa só é rebaixado de **Crítico** para **Alto** quando a base é positiva e o impacto é **estritamente menor que 0,5%** dela. A comparação usa `impacto × 200 < base`, sem depender de arredondamento de percentual. Igual a 0,5% permanece Crítico.

Isso resolve tanto a meta ausente quanto o caso em que poucas vendas têm meta e o restante concentra prejuízo. Não se interpreta meta ausente como resultado financeiro zero. O caso H7/SKU-017 continua Alto, como pretendido. Essa regra de priorização não equivale a avaliar a viabilidade comercial de um produto.

## 5. Datas e decomposição: o que foi preservado

A seleção **08/09/2026 a 08/10/2026**, inclusiva na tela, chega ao motor como **[2026-09-08, 2026-10-09)**. O dia 08/10 entra; o dia 09/10 não. O intervalo semiaberto facilita a contagem de dias e evita dupla contagem entre períodos consecutivos. Não se alterou essa convenção nem os comparativos sempre visíveis.

No mix, `mix_i = (w1 − w0) × (m0_i − M0)`. Quando um SKU sai, `w1 = 0`, então seu efeito é `−w0 × (m0_i − M0)`. Acrescentar novamente esse mesmo efeito em uma barra de saída contaria duas vezes, a menos que toda a decomposição fosse redefinida. Não havia necessidade de redefini-la nesta revisão.

Caso verificado: referência com um produto de margem 80% e outro de 20%, receitas iguais; o primeiro sai e entra um de margem 60%, também com receitas iguais no atual. Margem da carteira: 50% → 40%. Efeito da saída no mix: −15 pp; entrada: +5 pp; total: −10 pp, conciliado nos dois motores. Decomposição é uma identidade matemática, não prova de causalidade.

## 6. Desempenho: resultado medido, sem promessa de 20×

Python agora agrupa vendas e compras por SKU uma vez por análise. Metas são agrupadas e ordenadas por vigência, com busca binária. Sobreposições são recusadas. JavaScript monta seus grupos em uma passagem e mantém o cache de 64 intervalos. A última venda é obtida pela ordem de data/ID, mesmo se a entrada estiver embaralhada.

A varredura de vendas deixa de multiplicar toda a base pelo número de produtos: após agrupar, cada janela percorre os grupos correspondentes. Ainda há validação, ordenação, agregação e buscas de meta. Portanto, O(W×N) descreve melhor a etapa de seleção, sem o fator P; o custo total não é simplesmente O(N), nem eliminar 20 varreduras implica aplicação inteira 20 vezes mais rápida.

Medição no mesmo ambiente Linux, Python 3.12.14, três execuções sequenciais por tamanho/versão, mediana, 20 SKUs e 440 compras. As vendas foram repetidas com IDs únicos até cada tamanho; janela de 01/01 a 13/10/2026. Mediu-se `analyze`, incluindo a validação; geração de dados ficou fora do cronômetro.

| Vendas | v4.3 | v4.3.1 | Razão entre medianas |
|---:|---:|---:|---:|
| 2.580 | 20,26 ms | 11,17 ms | 1,81× |
| 50.000 | 646,96 ms | 279,11 ms | 2,32× |

Os agregados das quatro janelas e as premissas de simulação foram comparados e permaneceram iguais. Tempos individuais e assinatura dos valores comparados estão em `reports/performance_v4_3_1.json`. O código da medição está em `tests/benchmark_engine.py`; use `python tests/benchmark_engine.py CAMINHO_DO_PROJETO` para medir um checkout. A referência foi o commit `eec843a8a6ccbac498751ab0128de3d1758b105d` da v4.3.

Não houve medição de 500 mil vendas, múltiplos usuários, abertura no Windows, consumo de memória ou importação de arquivos reais. O tempo de execução varia por máquina. A frase de que o projeto está “muito acima da barra esperada” é uma avaliação subjetiva: não temos rubrica ou comparação com outras candidaturas para confirmá-la.

## 7. Windows, codificação e servidor opcional

`verificar.py` lê e grava a página em UTF-8. O teste simula uma leitura cujo padrão seria CP1252 e confirma que os acentos permanecem intactos. Isso verifica o problema de codificação; não substitui executar o pacote no Windows.

A ressalva à auditoria: CP1252 não é o padrão de todo Python no Windows em qualquer configuração. A versão, a localidade e o modo UTF-8 importam; Python 3.15 tornou o modo UTF-8 padrão, conforme PEP 686. A correção explícita continua sendo adequada para o suporte do projeto a Python 3.10+.

No servidor opcional, `localhost` e `127.0.0.1` são hosts diferentes para a política de mesma origem. Cada um pode ser usado com sua própria origem HTTP e a porta ativa. O servidor rejeita Host desconhecido, origem diferente, cabeçalhos de origem repetidos e `Origin: null`. Clientes locais sem Origin continuam aceitos. A validação de Host impede confiar apenas no valor de um Host arbitrário enviado pelo cliente. Isso não transforma o servidor demonstrativo em uma implantação empresarial.

Para usar o ZIP: extraia tudo e abra `ABRIR_DEMONSTRACAO.html` ou `iniciar_windows.bat`. O iniciador continua abrindo o HTML pronto, sem instalar bibliotecas nem exigir Python. Para testar a API, execute `python iniciar.py` e acesse o endereço HTTP exibido. Não foi confirmado um diagnóstico da falha antiga no computador do usuário.

Referências primárias/de implementação consultadas em 14/10/2026:

- Python, mudanças da 3.15: https://docs.python.org/3.15/whatsnew/3.15.html
- PEP 686: https://peps.python.org/pep-0686/
- MDN, cabeçalho Origin: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin
- MDN, política de mesma origem: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy

## 8. Verificação executada e pendências

**82 testes Python/API e 32 verificações de eventos/DOM aprovados em Linux.** São 23 testes Python/API e uma verificação DOM adicionais em relação à v4.3. A suíte inclui 16 vetores de simulação, 105 combinações de agregação, dez intervalos arbitrários/200 pares intervalo-SKU, 180 decomposições filtradas e 12 fixtures de narrativa. Essas contagens descrevem casos dentro da suíte; não são números a somar como testes independentes. Três amostras preparadas continuam verificadas.

`python verificar.py` regenera a base, executa os testes, atualiza relatórios e regrava o manifesto. Requer Node para as comparações JavaScript; a verificação DOM requer linkedom 0.18.12 ou a variável `GUARDIAN_DOM_MODULE`. A demonstração entregue não exige essas ferramentas.

Antes da apresentação, ainda é necessário:

1. No Windows real, extrair o ZIP em pasta com espaços e acentos, executar o BAT e abrir o HTML diretamente.
2. Conferir busca por SKU, calendário, troca de abas e simulação no Edge/Chrome/Firefox utilizados na apresentação.
3. Conferir layout em tela de celular, toque, rolagem e campos numéricos; o DOM simulado não mede responsividade.
4. Ensaiar a explicação de datas, saída de SKU, IA preparada versus regras e limites da simulação.

Não foram feitas liberação de Origin null, mudança da convenção de datas, adição duplicada de efeito de saída, afirmação de ganho de 20× ou declaração de homologação Windows/mobile. Os motivos estão expostos acima. O projeto segue demonstrativo, com dados fictícios e sem importação de planilhas ou integração ERP.
