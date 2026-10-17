/* Teste de DOM e eventos, sem alegar teste visual em navegador.
   npm install --no-save linkedom@0.18.12 (somente desenvolvimento). */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require(process.env.GUARDIAN_DOM_MODULE||'linkedom');
const {window,document}=parseHTML(fs.readFileSync('dist/index.html','utf8'));
// LinkeDOM não fornece alguns comportamentos de formulário/navegador.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this.querySelector('option[selected]')?.getAttribute('value')??this.querySelector('option[selected]')?.textContent??this.querySelector('option')?.getAttribute('value')??'';},set(v){for(const o of this.querySelectorAll('option')){if((o.getAttribute('value')??o.textContent)===String(v))o.setAttribute('selected','');else o.removeAttribute('selected');}}});
Object.defineProperty(window.HTMLInputElement.prototype,'valueAsNumber',{get(){return this.value===''?NaN:Number(this.value);}});
window.HTMLElement.prototype.focus=function(){};
const errors=[],session=new Map();
const context=vm.createContext({window,document,console:{error:e=>errors.push(String(e)),log:console.log},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},navigator:{clipboard:{writeText:async()=>{}}},setTimeout,clearTimeout});
for(const p of ['math.js','engine.js','demo-data.js','insights.js','importer.js','workflow.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+p,'utf8'),context,{filename:p});
const text=()=>document.getElementById('view').textContent;
let passed=0;function check(name,fn){fn();passed++;console.log('OK',name);}
function change(id,value){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new window.Event('change'));}
function click(sel){const el=document.querySelector(sel);assert.ok(el,sel);el.click();}
function input(id,value){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new window.Event('input'));}
function key(k){const e=new window.Event('keydown');e.key=k;document.getElementById('sku-search').dispatchEvent(e);}
function activeState(){return JSON.parse(session.get('guardian-v43'));}
function selectSku(q){input('sku-search',q);key('ArrowDown');key('Enter');}
check('Executivo abre com 4 KPIs e 3 referências visíveis',()=>{assert.equal(document.querySelectorAll('.kpi').length,4);assert.equal(document.querySelectorAll('.comparison').length,3);assert.match(text(),/Ano anterior/);});
check('SKU busca ignora acentos',()=>{input('sku-search','cafe');assert.equal(document.querySelectorAll('[data-option]').length,2);assert.equal(document.getElementById('sku-search').getAttribute('aria-expanded'),'true');});
check('Escape fecha as sugestões',()=>{key('Escape');assert.equal(document.getElementById('sku-list').hidden,true);});
check('Busca por código e seleção por teclado',()=>{selectSku('sku-001');assert.equal(activeState().sku,'SKU-001');assert.match(document.getElementById('selection-count').textContent,/1 produtos/);});
check('Categoria incompatível remove SKU e avisa',()=>{change('category','Tecnologia');assert.equal(activeState().sku,'');assert.match(document.getElementById('notice').textContent,/não pertence/);});
check('Categoria limita sugestões de produto',()=>{input('sku-search','');const opts=[...document.querySelectorAll('[data-option]')];assert.ok(opts.length>0);assert.ok(opts.every(el=>el.textContent.includes('Tecnologia')));});
check('Essencial filtra produtos e dados',()=>{const before=text();click('[data-type="Essencial"]');assert.equal(activeState().type,'Essencial');assert.notEqual(text(),before);input('sku-search','');assert.ok([...document.querySelectorAll('[data-option]')].every(el=>el.textContent.includes('Essencial')));});
check('Especial troca seleção exclusiva',()=>{click('[data-type="Especial"]');assert.equal(activeState().type,'Especial');assert.equal(document.querySelector('[data-type="Essencial"]').getAttribute('aria-pressed'),'false');});
check('Segundo clique limpa tipo',()=>{click('[data-type="Especial"]');assert.equal(activeState().type,'');});
check('Datas arbitrárias e inclusivas aplicadas',()=>{change('date-start','2026-09-08');change('date-end','2026-10-08');assert.match(document.querySelector('.comparison.current').textContent,/08\/09\/2026 a 08\/10\/2026/);});
check('Data invertida mantém análise válida',()=>{const before=text();change('date-start','2026-10-10');assert.equal(activeState().start,'2026-09-08');assert.equal(text(),before);assert.match(document.getElementById('date-error').textContent,/último intervalo válido/);change('date-start','2026-09-08');});
check('Data fora da cobertura é recusada',()=>{change('date-end','2026-12-01');assert.equal(activeState().end,'2026-10-08');assert.equal(document.getElementById('date-error').hidden,false);change('date-end','2026-10-08');});
check('Abas mantêm datas, categoria e comparativos',()=>{click('[data-tab="diagnostic"]');assert.equal(document.getElementById('category').value,'Tecnologia');assert.equal(document.getElementById('date-start').value,'2026-09-08');assert.equal(document.querySelectorAll('.comparison').length,3);});
check('Intervalo personalizado usa regras e evidência do intervalo',()=>{assert.match(text(),/Texto automático de regras/);assert.match(text(),/2026-09-08\/2026-10-08/);});
check('Reset preserva aba e restaura filtros',()=>{click('#reset');assert.equal(activeState().tab,'diagnostic');assert.equal(activeState().category,'');assert.equal(activeState().start,'2026-10-01');});
check('Narrativa preparada só no intervalo original',()=>{change('detail-sku','SKU-001');assert.match(text(),/Amostra estruturada/);});
check('Meta tem prioridade e alta de custo continua visível',()=>{const entries=[...document.querySelectorAll('.narrative-entry')];assert.ok(entries.length>=2);assert.equal(entries[0].getAttribute('data-fact-kind'),'target');assert.ok(entries.some(e=>e.getAttribute('data-fact-kind')==='cost'&&e.textContent.includes('Amostra estruturada')));});
check('Barreira rejeita campo inventado',()=>{click('#test-barrier');assert.match(document.getElementById('barrier-result').textContent,/Recusada/);});
check('Diagnóstico preenche simulador e mantém referências',()=>{click('[data-simulate]');assert.equal(document.querySelectorAll('.comparison').length,3);assert.equal(document.getElementById('sim-p').value,'180.00');});
check('Alterar preço recalcula resultado',()=>{const before=document.getElementById('simulation-results').textContent;input('sim-p','200');assert.notEqual(document.getElementById('simulation-results').textContent,before);});
check('Trocar aba preserva premissa válida do cenário',()=>{click('[data-tab="executive"]');click('[data-tab="simulator"]');assert.equal(document.getElementById('sim-p').value,'200.00');});
check('Meta + taxa inválida mostra mensagem',()=>{change('sim-goal','channel');input('sim-t','80');assert.match(document.getElementById('simulation-results').textContent,/menos de 100%/);});
check('Restaurar cenário',()=>{click('#reset-sim');assert.equal(document.getElementById('sim-p').value,'180.00');});
check('Filtro global reinicia premissas e preserva aba',()=>{click('[data-type="Especial"]');assert.equal(activeState().tab,'simulator');assert.equal(activeState().type,'Especial');assert.equal(document.querySelector('[data-type="Especial"]').getAttribute('aria-pressed'),'true');});
check('Custo ausente bloqueia simulação, preserva contexto',()=>{click('#reset');selectSku('sku-005');assert.match(text(),/custo elegível indisponível/);assert.equal(document.getElementById('sim-p'),null);assert.equal(document.querySelectorAll('.comparison').length,3);assert.match(document.querySelector('.comparison.year').textContent,/Indisponível/);});
check('Busca sem correspondência é explícita',()=>{input('sku-search','naoexiste');assert.match(document.getElementById('sku-list').textContent,/Nenhum produto/);key('Escape');});
check('Seleção de data sem vendas tem recuperação',()=>{click('#reset');change('date-start','2026-10-04');change('date-end','2026-10-04');assert.match(text(),/Nenhuma venda/);assert.ok(document.querySelector('[data-clear]'));});
check('Recuperação de seleção vazia',()=>{click('[data-clear]');assert.equal(activeState().start,'2026-10-01');assert.ok(document.getElementById('sim-p'));});
check('Histórico insuficiente aparece sem estimar',()=>{change('date-start','2025-02-01');change('date-end','2025-02-28');assert.match(document.querySelector('.comparison.year').textContent,/Histórico insuficiente/);});
check('Atalho aplica intervalo e abas usam mesmo estado',()=>{click('[data-preset="90"]');assert.equal(activeState().start,'2026-07-16');assert.equal(activeState().end,'2026-10-13');click('[data-tab="executive"]');assert.match(document.querySelector('.comparison.current').textContent,/16\/07\/2026 a 13\/10\/2026/);});
check('Persistência salva filtros na sessão',()=>{assert.equal(activeState().start,document.getElementById('date-start').value);assert.equal(activeState().tab,'executive');});
check('Nenhuma exceção JS',()=>assert.deepEqual(errors,[]));


(async()=>{
 const value=id=>document.getElementById(id).value;
 const evaluate=source=>vm.runInContext(source,context);
 click('#reset');click('[data-tab="executive"]');
 check('Gráfico do mês mostra dias e mantém dia sem venda sem margem',()=>{
  evaluate("state.grain='daily';render()");
  const hist=JSON.parse(evaluate('JSON.stringify(history(selectedItems()))'));
  assert.equal(hist.length,13);assert.equal(hist[3].margin,null);
  assert.ok(document.querySelector('.chart').textContent.includes('13 de Out'));
  const total=hist.reduce((s,h)=>s+h.revenue,0);
  assert.equal(total,evaluate('M.aggregate(selectedItems().map(i=>i.current)).revenue'));
 });
 change('date-start','2026-07-01');change('date-end','2026-08-23');
 check('Gráfico de vários meses agrega por dezenas com período final parcial',()=>{
  const labels=JSON.parse(evaluate('JSON.stringify(history(selectedItems()).map(h=>h.label))'));
  assert.deepEqual(labels,['10 de Jul','20 de Jul','31 de Jul','10 de Ago','20 de Ago','23 de Ago']);
 });
 click('[data-tab="diagnostic"]');
 check('Gráfico de preço usa os mesmos blocos e não rótulos mensais',()=>{assert.match(document.querySelector('.chart').textContent,/31 de Jul/);assert.match(text(),/Dezenas do mês/);});
 click('#reset');change('detail-sku','SKU-001');
 check('Decisão usa números do SKU e três alternativas',()=>{assert.equal(document.querySelectorAll('.decision-card [data-simulate]').length,3);assert.match(document.querySelector('.decision-card').textContent,/1.260/);});
 check('Narrativa ampliada apresenta 3M e ano anterior com origem explícita',()=>{assert.ok(document.querySelector('[data-fact-kind="history"]'));assert.ok(document.querySelector('[data-fact-kind="year"]'));assert.match(text(),/sem geração ao vivo/);});
 for(const mode of ['period','identity','causality','missing','valid']){
  change('barrier-case',mode);click('#test-barrier');
  check('Barreira trata cenário '+mode,()=>assert.match(document.getElementById('barrier-result').textContent,mode==='valid'?/Aceita/:/Recusada/));
 }
 click('[data-setup="cost"]');
 check('Alternativa de CMV mantém preço original e reduz custo em 5%',()=>{assert.equal(value('sim-p'),'150.00');assert.equal(+value('sim-c'),119.7);});
 click('#reset-sim');
 const realized=JSON.parse(evaluate('JSON.stringify(selectedItem().current)'));
 input('sim-m','20');
 check('Margem-alvo ajusta preço e resultados automaticamente',()=>{assert.equal(value('sim-p'),'157.50');assert.match(document.getElementById('sim-driving').textContent,/Margem-alvo/);});
 input('sim-c','120');
 check('CMV recalcula preço mantendo a margem-alvo',()=>assert.equal(value('sim-p'),'150.00'));
 input('sim-t','10');change('sim-goal','channel');
 check('Meta após comissão considera a taxa no preço',()=>assert.equal(value('sim-p'),'171.43'));
 input('sim-m','30');input('sim-q','10');
 check('Margem e volume propagam totais',()=>{assert.equal(value('sim-p'),'200.00');assert.equal(value('sim-revenue'),'2000.00');assert.equal(value('sim-channel'),'600.00');});
 input('sim-revenue','1200');
 check('Receita líquida editável define preço sem alterar volume ou CMV',()=>{assert.equal(value('sim-p'),'120.00');assert.equal(value('sim-q'),'10');assert.equal(value('sim-channel'),'-120.00');assert.equal(+value('sim-c'),120);});
 input('sim-channel','100');
 check('Resultado após comissão editável usa preço mínimo e informa centavos',()=>{assert.equal(value('sim-p'),'144.45');assert.match(document.getElementById('sim-rounding').textContent,/0,05/);assert.match(document.getElementById('sim-driving').textContent,/Resultado após comissão/);});
 input('sim-t','20');
 check('Comissão alterada preserva resultado total solicitado',()=>{assert.equal(value('sim-p'),'162.50');assert.equal(+value('sim-channel'),100);});
 check('Simulação preserva o realizado do SKU',()=>assert.deepEqual(JSON.parse(evaluate('JSON.stringify(selectedItem().current)')),realized));
 input('sim-q','0');
 check('Total desejado com volume zero bloqueia resultados e cópia',()=>{assert.match(document.getElementById('simulation-results').textContent,/volume maior que zero/);assert.equal(document.getElementById('copy-scenario').disabled,true);});
 input('sim-q','10');input('sim-p','');
 check('Campo vazio tem erro explícito sem copiar cenário anterior',()=>{assert.equal(document.getElementById('copy-scenario').disabled,true);assert.equal(document.getElementById('sim-p').getAttribute('aria-invalid'),'true');});
 input('price-range','180');
 check('Slider recupera preço vazio e limpa erro antigo',()=>{assert.equal(value('sim-p'),'180.00');assert.equal(document.getElementById('copy-scenario').disabled,false);});
 input('sim-p','180.001');
 check('Mais de duas casas decimais é recusado',()=>assert.match(document.getElementById('sim-input-error').textContent,/2 casas/));
 input('sim-m','25');
 check('Margem recupera preço inválido ao se tornar campo principal',()=>{assert.equal(value('sim-p'),'218.19');assert.equal(document.getElementById('copy-scenario').disabled,false);});
 input('sim-revenue','');input('sim-p','200');
 check('Preço manual supera total incompleto que deixou de comandar o cálculo',()=>assert.equal(document.getElementById('copy-scenario').disabled,false));
 click('[data-tab="executive"]');click('[data-tab="simulator"]');
 check('Modo e valores do cenário sobrevivem à troca de aba',()=>{assert.equal(value('sim-p'),'200.00');assert.match(document.getElementById('sim-driving').textContent,/Preço líquido unitário/);});
 click('#show-scenario');
 check('Resumo legível abre sem expor JSON por padrão',()=>{assert.equal(document.getElementById('scenario-panel').hidden,false);assert.match(value('scenario-text'),/RECEITA LÍQUIDA/);assert.ok(document.querySelector('#scenario-panel details'));});
 click('#close-scenario');
 check('Resumo fecha por botão',()=>assert.equal(document.getElementById('scenario-panel').hidden,true));
 click('#show-scenario');const escape=new window.Event('keydown');escape.key='Escape';document.getElementById('scenario-panel').dispatchEvent(escape);
 check('Resumo fecha por Escape',()=>assert.equal(document.getElementById('scenario-panel').hidden,true));
 let copied='';context.navigator.clipboard.writeText=async t=>{copied=t;};
 click('#show-scenario');await document.getElementById('copy-scenario').onclick();
 check('Cópia bem-sucedida fecha resumo e confirma sem deixá-lo aberto',()=>{assert.equal(document.getElementById('scenario-panel').hidden,true);assert.equal(document.getElementById('copy-status').hidden,false);assert.match(copied,/CENÁRIO HIPOTÉTICO/);});
 click('#dismiss-copy');
 check('Confirmação da cópia pode ser dispensada',()=>assert.equal(document.getElementById('copy-status').hidden,true));
 context.navigator.clipboard.writeText=async()=>{throw Error('blocked');};
 await document.getElementById('copy-scenario').onclick();
 check('Cópia bloqueada oferece seleção manual e botão de fechar',()=>{assert.equal(document.getElementById('scenario-panel').hidden,false);assert.match(document.getElementById('copy-message').textContent,/Ctrl\+C/);});
 input('sim-p','210');
 check('Alterar premissa fecha resumo e remove confirmação desatualizada',()=>{assert.equal(document.getElementById('scenario-panel').hidden,true);assert.equal(document.getElementById('copy-status').hidden,true);});
 let resolveCopy;context.navigator.clipboard.writeText=()=>new Promise(resolve=>resolveCopy=resolve);
 const pending=document.getElementById('copy-scenario').onclick();click('[data-tab="executive"]');resolveCopy();await pending;
 check('Cópia pendente não atualiza elementos após trocar de aba',()=>{assert.equal(document.getElementById('copy-scenario'),null);assert.deepEqual(errors,[]);});
 check('Sem exceção JS nas novas interações',()=>assert.deepEqual(errors,[]));
 console.log(JSON.stringify({ui_dom_checks:passed,browser_visual_test:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
