/* DOM/event checks only; no claim of real browser, layout or Windows validation. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require(process.env.GUARDIAN_DOM_MODULE||'linkedom');
const {window,document}=parseHTML(fs.readFileSync('dist/index.html','utf8'));
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this.querySelector('option[selected]')?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??'';},set(v){for(const o of this.querySelectorAll('option')){if(o.getAttribute('value')===String(v))o.setAttribute('selected','');else o.removeAttribute('selected');}}});
Object.defineProperty(window.HTMLInputElement.prototype,'valueAsNumber',{get(){return this.value===''?NaN:Number(this.value);}});
window.HTMLElement.prototype.focus=function(){};
let exported=null;const errors=[],session=new Map(),local=new Map();
const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
const context=vm.createContext({window,document,console:{error:e=>errors.push(String(e)),log:console.log},sessionStorage:storage(session),localStorage:storage(local),navigator:{clipboard:{writeText:async()=>{}}},setTimeout,clearTimeout,Blob,TextEncoder,URL:{createObjectURL:b=>{exported=b;return 'blob:test';},revokeObjectURL:()=>{}}});
for(const p of ['math.js','engine.js','demo-data.js','daily-data.js','insights.js','importer.js','workflow.js','app.js'])vm.runInContext(fs.readFileSync('dist/'+p,'utf8'),context,{filename:p});
const $=id=>document.getElementById(id),run=s=>vm.runInContext(s,context),click=s=>document.querySelector(s).click(),change=(id,v)=>{$(id).value=v;$(id).dispatchEvent(new window.Event('change'));};
let count=0;function test(name,fn){fn();count++;console.log('OK',name);}
(async()=>{
 test('Base diária padrão e referências sempre visíveis',()=>{assert.equal($('dataset-choice').value,'daily');assert.equal(document.querySelectorAll('.comparison').length,3);assert.equal(run('history(selectedItems()).filter(h=>h.margin!=null).length'),13);assert.ok(document.querySelector('.waterfall'));assert.match(document.querySelector('.executive-summary').textContent,/sintéticos/);});
 test('Fila executiva vem antes dos comparativos',()=>{const s=$('view').innerHTML;assert.ok(s.indexOf('Comece por estes sinais')<s.indexOf('comparison-section'));assert.equal(run('I.rank(selectedItems(),state.order)[0].sku'),'SKU-013');});
 const advanced=document.querySelector('.advanced-analytics');advanced.open=true;advanced.dispatchEvent(new window.Event('toggle'));
 test('Visuais analíticos têm valores e não geram coordenadas inválidas',()=>{assert.ok(document.querySelector('.pareto-chart'));assert.ok(document.querySelector('.scatter'));assert.equal(document.querySelectorAll('.bullet').length,4);assert.ok(!document.getElementById('advanced-charts').innerHTML.includes('NaN'));assert.match(document.getElementById('advanced-charts').textContent,/12 meses/);});
 change('signal-order','gap');test('Ordem da fila pode mudar',()=>assert.equal(run('state.order'),'gap'));
 click('[data-tab="diagnostic"]');change('detail-sku','SKU-013');
 test('Crônico usa evidências atuais e anteriores',()=>{assert.match(document.querySelector('.decision-card').textContent,/Crônico/);assert.equal(document.querySelectorAll('.comparison').length,3);assert.ok(document.querySelector('[data-fact-kind="negative"]'));});
 change('dataset-choice','legacy');test('Base antiga usa agregação semanal explícita',()=>{assert.equal(run('history(selectedItems())[0].grain'),'week');assert.match($('view').textContent,/menos de 50%/);});
 change('chart-grain','daily');test('Opção diária preserva lacunas reais',()=>{assert.equal(run('history(selectedItems()).length'),13);assert.equal(run('history(selectedItems())[3].margin'),null);});
 change('dataset-choice','daily');click('[data-tab="simulator"]');
 $('saved-name').value='Revisão local';click('#save-scenario');
 test('Cenário salvo localmente com retenção e identificação da base',()=>{const r=JSON.parse(local.get('guardian-scenarios-v1'));assert.equal(r.length,1);assert.equal(r[0].name,'Revisão local');assert.ok(r[0].expires>Date.now());assert.equal(r[0].dataset_hash,run('D.dataset_hash'));});
 const old=run('simInput.p');$('sim-p').value='999';$('sim-p').dispatchEvent(new window.Event('input'));click('[data-load-saved]');
 test('Restaurar cenário recupera premissas',()=>assert.equal(run('simInput.p'),old));
 click('#export-summary');const csv=await exported.text();test('Exportação tem filtros e unidades explícitas',()=>{assert.match(csv,/Receita centavos/);assert.match(csv,/2026-10-13/);});
 const files={products:'Código;name;category;type;unit\nP1;Produto importado;Casa;Essencial;UN',sales:'id;date;sku;quantity;revenue;cmv;discount;channel_bps;unit;event\nS1;2026-10-02;P1;2;20000;10000;0;500;UN;sale\nS2;2026-10-03;P1;1;10000;;0;500;UN;sale',purchases:'id;date;sku;quantity;cost;unit\nP1;2026-10-01;P1;10;5000;UN',targets:'sku;bps;start;end\nP1;3000;2025-01-01;2027-01-01'};
 for(const [kind,text] of Object.entries(files)){const el=$('csv-'+kind);Object.defineProperty(el,'files',{value:[{size:text.length,text:async()=>text}],configurable:true});await el.onchange({target:el});}
 change('map-products-sku','Código');change('coverage-start','2026-10-01');change('coverage-end','2026-10-13');$('erp-revenue').value='300';$('erp-cmv').value='100';
 await window.GuardianWorkflow.preview();
 test('Prévia concilia sem aplicar automaticamente',()=>{assert.equal(run('D.dataset_kind'),'daily');assert.equal($('apply-import').disabled,false);assert.match($('quality-preview').textContent,/66,7%/);assert.match($('reconciliation').textContent,/diferença R\$\s*0,00/);});
 await window.GuardianWorkflow.applyImport();test('Cobertura deve ser declarada para habilitar referências',()=>assert.equal(run('D.dataset_kind'),'daily'));
 $('coverage-confirm').checked=true;await window.GuardianWorkflow.applyImport();
 test('Importação muda base e apaga seleções antigas',()=>{assert.equal(run('D.dataset_kind'),'import');assert.equal(run('state.sku'),'');assert.equal(run('selectedItems()[0].current.revenue'),30000);assert.equal(run('selectedItems()[0].current.gross'),10000);assert.match(document.querySelector('.badge.demo').textContent,/CSV/);assert.match($('view').textContent,/Histórico insuficiente/);});
 click('[data-preset="90"]');test('Atalho respeita início da cobertura importada',()=>assert.equal(run('state.start'),'2026-10-01'));
 test('Cenário de outra base não é restaurável',()=>assert.equal(document.querySelector('[data-load-saved]').disabled,true));
 change('coverage-start','2026-10-05');await window.GuardianWorkflow.preview();
 test('Validação sem vendas válidas não troca base ativa',()=>{assert.equal($('apply-import').disabled,true);assert.equal(run('D.dataset_kind'),'import');assert.match($('quality-preview').textContent,/Nenhuma venda/);});
 click('#clear-saved');test('Cenários locais podem ser excluídos',()=>assert.equal(local.has('guardian-scenarios-v1'),false));
 test('Nenhuma exceção de interface',()=>assert.deepEqual(errors,[]));
 console.log(JSON.stringify({ui_revision45:count,browser_visual_test:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
