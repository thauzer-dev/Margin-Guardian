<div align="center">

# 🛡️ Margin Guardian

### Inteligência de rentabilidade, diagnósticos verificáveis e simulação financeira

**Observar → Investigar → Simular → Decidir**

![Status](https://img.shields.io/badge/status-MVP-237a57?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**Projeto demonstrativo desenvolvido para o GoHacks Talent — GoGroup**

[Portfólio](https://thauzer.tech) · [GitHub](https://github.com/thauzer-dev) · [LinkedIn](https://www.linkedin.com/in/enzothauzer/)

</div>

---

## 📌 O que é o Margin Guardian?

O **Margin Guardian** é uma aplicação de apoio à análise de rentabilidade comercial. Reúne painéis de indicadores, investigação de desvios e simulação de cenários para responder a três perguntas:

1. **O que está acontecendo?** Acompanhar margem, receita e diferenças entre períodos.
2. **Onde investigar?** Identificar produtos, categorias e fatores associados às variações observadas.
3. **O que muda se ajustarmos uma variável?** Simular preços, custos, comissões, metas e quantidades sem alterar os resultados realizados.

O MVP usa dados sintéticos e também permite importar arquivos CSV locais. Sua camada de **explicações verificáveis** é fundamentada em regras e evidências calculadas — **não utiliza um LLM ao vivo**.

> **Aviso:** ferramenta demonstrativa de apoio à decisão. Não substitui validações contábeis, comerciais ou a conciliação com sistemas de origem.

## ✨ Funcionalidades

### 📊 1. Visão Executiva

- KPIs financeiros e comerciais conforme o recorte selecionado.
- Comparação entre período atual, **três meses civis anteriores de referência (3M)** e mesmo intervalo do ano anterior, quando os dados oferecem cobertura suficiente.
- Filtros compartilhados de datas, categorias, tipos e SKUs.
- Priorização de sinais por severidade, diferença para a meta (*gap*) ou queda ante a referência 3M.
- Evolução de margem por dia, dezena ou agrupamento indicado na interface; análises exploratórias de concentração, preço e categorias.

### 🔎 2. Diagnóstico

- Investigação de desvios por SKU e categoria.
- Decomposição da variação de margem, incluindo efeitos de preço, CMV, mix e entrada de produtos, quando aplicáveis.
- Evidências rastreáveis, indicação de cobertura de dados e classificações interpretáveis de persistência.
- Exibição de eventos de compra como contexto, **sem tratá-los automaticamente como causas** das alterações.

### 🧮 3. Simulador

- Ajuste de preço, CMV, comissão, quantidade e metas.
- Recálculo dos resultados projetados segundo as premissas informadas.
- Separação entre margem bruta e resultado pós-comissão.
- Cópia do resumo de um cenário.
- Salvamento local de até 20 cenários por até 30 dias, sujeito à disponibilidade do armazenamento do navegador.

## 🚀 Como executar

### Opção A — Abrir a demonstração (mais simples)

**Não é necessário instalar Python, Node.js ou bibliotecas.**

1. No GitHub, escolha **Code → Download ZIP** ou clone o repositório.
2. Extraia o conteúdo para uma pasta.
3. Abra **`ABRIR_DEMONSTRACAO.html`** no navegador.
4. No Windows, você também pode usar **`iniciar_windows.bat`**.

**Atenção:** não mova o HTML para outra pasta isoladamente; a pasta **`dist/`** precisa permanecer ao lado do iniciador.

Se o Windows não abrir o arquivo corretamente, clique com o botão direito em `ABRIR_DEMONSTRACAO.html`, selecione **Abrir com** e escolha um navegador atualizado.

### Opção B — Servidor local Python (opcional)

Com Python instalado, abra o terminal na pasta do projeto:

```bash
python iniciar.py
```

Acesse o endereço HTTP exibido no terminal. O servidor é local (loopback), para desenvolvimento e demonstração; **não é um servidor de produção**.

> A interface aberta diretamente pelo HTML não depende da API opcional `/api/simulate`.

### Opção C — Clonar com Git

```bash
git clone https://github.com/thauzer-dev/margin-guardian.git
cd margin-guardian
```

Depois, siga a opção A ou B. **Substitua a URL caso o nome real do repositório seja diferente.**

## 🧭 Como usar

1. **Escolha uma base:** explore a base diária sintética v4.5, os casos didáticos anteriores ou importe seus CSVs.
2. **Defina o recorte:** selecione as datas e, se desejar, uma categoria, tipo ou SKU.
3. **Analise o Executivo:** observe KPIs, comparativos históricos, sinais priorizados e gráficos.
4. **Investigue no Diagnóstico:** confira os produtos sinalizados, efeitos calculados e as limitações da evidência.
5. **Teste no Simulador:** altere preço, custo, comissão ou outras premissas e compare os resultados estimados.
6. **Compartilhe:** copie um cenário, exporte o resumo CSV ou use a opção de impressão do navegador para **Salvar como PDF**.

### Bases demonstrativas

- **Diária sintética v4.5:** vendas fictícias de janeiro/2025 a outubro/2026, com variações diárias, sazonais e eventos intencionais de rentabilidade e qualidade de dados.
- **Casos didáticos:** versão mais controlada dos exemplos anteriores, mantida para comparação e regressão.
- **Meus CSVs:** informações carregadas e processadas localmente no navegador. **Recarregar a página descarta a base importada**; cenários salvos dependem do armazenamento local.

## 📥 Importação de CSV

A importação local exige **quatro arquivos CSV**, em UTF-8, separados por vírgula ou ponto e vírgula. Os nomes de colunas podem ser mapeados na interface.

| Arquivo lógico | Colunas esperadas |
|---|---|
| `products` | `sku`, `name`, `category`, `type`, `unit` |
| `sales` | `id`, `date`, `sku`, `quantity`, `revenue`, `cmv`, `discount`, `channel_bps`, `unit`, `event` |
| `purchases` | `id`, `date`, `sku`, `quantity`, `cost`, `unit` |
| `targets` | `sku`, `bps`, `start`, `end` |

**Convenções:**

- Datas em `AAAA-MM-DD`.
- Valores monetários em **centavos inteiros**: `1250` significa **R$ 12,50**.
- `cmv` representa o custo total da linha; `cost`, o custo unitário da compra.
- `revenue` é a receita líquida de desconto.
- `bps` e `channel_bps` são pontos-base: **100 = 1%**.
- A vigência das metas tem início inclusivo e fim exclusivo.
- Vendas (`sale`) são positivas; devoluções (`return`) usam quantidades/valores negativos; cancelamentos (`cancelled`) não entram nos agregados.

Ao importar, informe a **cobertura completa dos dados**, inclusive dias sem vendas, e, quando disponíveis, os totais de receita e CMV do ERP para conciliação. O painel apresenta registros aceitos, registros em quarentena e diferenças identificadas. Isso **não equivale a uma integração nem a uma conciliação automática com ERP**.

**Limites desta versão:** até 20 MB e 50 mil linhas por arquivo; até 55 mil linhas no conjunto; 500 produtos; e até três anos de cobertura. Não há importação direta de Excel: exporte os dados para CSV UTF-8.

Consulte **`examples/importacao/`** para arquivos de exercício incluídos na distribuição.

## 🏗️ Arquitetura

```text
                  BASE SINTÉTICA / CSV LOCAL
                             │
                             ▼
                  VALIDAÇÃO E QUALIDADE
                             │
                             ▼
              MOTOR DE MÉTRICAS FINANCEIRAS
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
         EXECUTIVO      DIAGNÓSTICO       SIMULADOR
             │               │               │
             └───────────────┼───────────────┘
                             ▼
                  EVIDÊNCIAS E DECISÕES
```

A interface utiliza **HTML, CSS e JavaScript** no navegador. A implementação de referência em **Python** apoia a geração de dados, a validação das fórmulas e a reprodução de verificações técnicas. As operações financeiras são determinísticas; as explicações não constituem inferência causal automática nem geração por modelo de linguagem em tempo real.

### Principais arquivos e diretórios

| Caminho | Finalidade |
|---|---|
| `ABRIR_DEMONSTRACAO.html` | Ponto de entrada para uso local |
| `iniciar_windows.bat` | Atalho de abertura no Windows |
| `dist/` | Interface e scripts preparados para a demonstração |
| `guardian/` | Módulos Python de cálculo, validação e geração |
| `iniciar.py` | Servidor HTTP local opcional |
| `build.py` | Construção/atualização dos artefatos |
| `verificar.py` | Execução da rotina de verificações |
| `tests/` | Testes automatizados |
| `examples/importacao/` | Dados CSV de exemplo |
| `docs/` | Metodologia, decisões de engenharia e guias |
| `reports/` | Relatórios e evidências de validação |

> A relação final deve refletir os arquivos efetivamente presentes na versão publicada.

## 🧪 Desenvolvimento e validação

Para executar a rotina de verificação, a partir da pasta raiz:

```bash
python verificar.py
```

Essa rotina é destinada à validação/desenvolvimento e pode regenerar dados, relatórios e artefatos da aplicação. Alguns testes de paridade dependem de **Node.js**; verificações de DOM podem requerer **`linkedom` 0.18.12** ou a variável `GUARDIAN_DOM_MODULE`. **Nada disso é necessário para apenas utilizar a demonstração.**

Os resultados de testes da entrega são documentados em `reports/validation.json`, `reports/VALIDACAO.md` e `reports/performance_v4_5.json`, quando incluídos no pacote publicado. Métricas de benchmark do motor não representam necessariamente tempo de carregamento da interface ou desempenho em produção.

## ⚠️ Limitações conhecidas

- Os dados padrão são **sintéticos**; o funcionamento com sistemas empresariais reais não foi homologado.
- Não há LLM ao vivo, integração ativa com ERP, autenticação multiempresa ou alertas externos automáticos.
- O diagnóstico mostra fatores e associações observáveis; **não comprova causalidade**.
- O simulador depende de hipóteses fornecidas pelo usuário; **não prevê elasticidade de demanda**.
- O resultado pós-comissão **não corresponde necessariamente à margem de contribuição completa** (podem faltar impostos, frete e outras despesas variáveis).
- Os cenários são locais ao navegador, sem sincronização em nuvem.
- A validação documentada não equivale a homologação completa em Windows, dispositivos móveis ou conformidade WCAG.

## 🛣️ Próximos passos

- Integrações com fontes corporativas após definição de contratos de dados.
- Validação com dados reais reconciliados e testes de usabilidade em navegadores/dispositivos.
- Aprimoramento de análises exploratórias e políticas de alerta específicas por contexto.
- Avaliação controlada de explicações geradas por modelos de linguagem, com evidências e mecanismos de verificação.
- Autenticação e armazenamento persistente em uma possível versão empresarial.

## 👨‍💻 Autor

**Enzo Thauzer** · Graduando em Ciência de Dados pela UFC

Interesses profissionais: **Business Intelligence, análise de dados, automação e engenharia de dados**.

Projeto desenvolvido com apoio de ferramentas de IA para ideação, desenvolvimento e revisão, com regras de negócio e resultados documentados para verificação.

- 🌐 [Portfólio](https://thauzer.tech)
- 💻 [GitHub](https://github.com/thauzer-dev)
- 💼 [LinkedIn](https://www.linkedin.com/in/enzothauzer/)

---

<div align="center">

**Margin Guardian** · *Dados financeiros mais claros. Decisões mais fundamentadas.*

</div>
