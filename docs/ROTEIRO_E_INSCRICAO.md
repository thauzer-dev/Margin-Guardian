# Roteiro de três minutos

1. **0:00–0:30 — Executivo.** Mostre dados fictícios, receita, margem ponderada e cobertura. Explique por que crescimento de receita não assegura rentabilidade.
2. **0:30–1:00 — Histórico.** Mostre atual, 3M e ano anterior simultaneamente e use a busca por SKU. Mostre as datas, a diferença de duração e a composição por categoria.
3. **1:00–1:45 — Diagnóstico.** Investigue SKU-001, confira o custo em alta, a fórmula e a origem. Troque para SKU-006: a compra recente muda a margem teórica, não a realizada.
4. **1:45–2:15 — IA.** Mostre o rótulo de texto previamente produzido. Abra o teste de resposta incorreta; explique a recusa e o fallback. Não diga que a demo chama um modelo ao vivo.
5. **2:15–2:45 — Simulador.** A partir de um produto elegível, altere a meta para pós-comissão, teste preço e volume e copie as premissas. Não interprete a simulação como previsão.
6. **2:45–3:00 — Método.** Abra a página do projeto, mencione os resultados medidos e as limitações. Encerre com o próximo passo: dados reais e validação com usuários.

## Texto-base para a candidatura

Construí o Margin Guardian AI, um protótipo demonstrativo que conecta visão executiva, diagnóstico de margem e simulação de decisões sobre uma base sintética. O objetivo é tornar visível onde a margem está sob pressão e permitir conferir as evidências antes de testar alternativas de preço, custo, comissão e volume.

Usei ChatGPT/Codex para analisar o escopo, implementar o sistema, elaborar testes e preparar três respostas estruturadas para a demonstração. Os números são calculados por código; a camada de IA só pode referenciar fatos, períodos e ações autorizados. A interface distingue textos preparados previamente de textos automáticos de regras e não faz chamadas a um provedor em tempo real.

A validação inclui 82 testes Python/API, 16 vetores de simulação compartilhados com JavaScript, 105 combinações de agregação entre front e back e 32 verificações de interação no DOM, dez intervalos arbitrários e 180 decomposições filtradas. Uma mini-avaliação com 12 respostas controladas testa recusa, correção e fallback; ela não mede a precisão de um LLM comercial. O projeto usa dados fictícios e ainda precisa de validação empresarial e conferência visual em dispositivos reais.

Acesse a demonstração e sua página “Sobre o projeto” pelo endereço da entrega. Confirme o formato e os limites do formulário antes de usar este texto; nenhuma candidatura foi enviada automaticamente.

## Perguntas da auditoria

- Datas: a pessoa escolhe extremos inclusivos; a interface adiciona um dia ao fim antes de chamar o motor semiaberto.
- Saída de SKU: a participação na receita cai a zero; o impacto pertence ao mix.
- Narrativas: margem negativa → meta → custo → preço; os fatos restantes continuam visíveis.
- Performance: a medição de 50 mil vendas foi 2,32× mais rápida; não prometer 20× nem escala empresarial.
- Windows/celular: ainda requerem validação real; os testes executados foram de código e DOM em Linux.
