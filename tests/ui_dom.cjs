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
for(const p of ['math.js','engine.js','demo-data.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+p,'utf8'),context,{filename:p});
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
check('Narrativa preparada só no intervalo original',()=>{change('detail-sku','SKU-001');assert.match(text(),/IA produzida previamente/);});
check('Meta tem prioridade e alta de custo continua visível',()=>{const entries=[...document.querySelectorAll('.narrative-entry')];assert.ok(entries.length>=2);assert.equal(entries[0].getAttribute('data-fact-kind'),'target');assert.ok(entries.some(e=>e.getAttribute('data-fact-kind')==='cost'&&e.textContent.includes('IA produzida previamente')));});
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
console.log(JSON.stringify({ui_dom_checks:passed,browser_visual_test:false}));
