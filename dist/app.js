'use strict';
let D=window.GUARDIAN_DAILY||window.GUARDIAN_DATA;
const M=window.GuardianMath,$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const brl=v=>v==null?'Indisponível':(v/100).toLocaleString('pt-BR',{
  style:'currency',currency:'BRL'
}),pct=v=>v==null?'Indisponível':(v*100).toLocaleString('pt-BR',{
  minimumFractionDigits:1,maximumFractionDigits:1
})+'%',num=v=>v==null?'—':v.toLocaleString('pt-BR',{
  maximumFractionDigits:0
}),pp=v=>v==null?'Indisponível':(v>0?'+':'')+(v*100).toLocaleString('pt-BR',{
  minimumFractionDigits:1,maximumFractionDigits:1
})+' pp',date=v=>new Date(v+'T12:00:00Z').toLocaleDateString('pt-BR',{
  timeZone:'UTC'
}),month=v=>new Date(v+'-01T12:00:00Z').toLocaleDateString('pt-BR',{
  month:'short',year:'numeric',timeZone:'UTC'
});
const periodLabel=win=>date(win[0])+' a '+date(new Date(new Date(win[1]+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10));
const E=window.GuardianEngine,I=window.GuardianInsights;
let engine=E.create(D);
let initial={
  tab:'executive',start:'2026-10-01',end:D.as_of,category:'',type:'',sku:'',selected:'SKU-001',group:'category',order:'severity'
};
let state={
  ...initial
},simInput=null,lastScenario='',filterMessage='';
try{
  const saved=JSON.parse(sessionStorage.getItem('guardian-v43')||'null');
  if(saved&&saved.start>=D.raw.history_start&&saved.end<=D.as_of&&saved.start<=saved.end){
    E.parse(saved.start);
    E.parse(saved.end);
    state={
      ...initial,...saved
    };
  }
}catch(e){
}
const titles={
  executive:['Sua margem, em perspectiva.','O resultado de hoje, com o contexto que faltava.'],diagnostic:['Do sinal à evidência.','Investigue a margem e compare o mesmo produto ao longo do tempo.'],simulator:['Explore antes de decidir.','Premissas claras para testar decisões, com o histórico sempre à vista.']
};
function snapshot(){
  return engine.analyze(state.start,E.add(state.end,1));
}
function persist(){
  try{
    sessionStorage.setItem('guardian-v43',JSON.stringify(state));
  }catch(e){
  }
}
function filter(i){
  return(!state.category||i.category===state.category)&&(!state.type||i.type===state.type)&&(!state.sku||i.sku===state.sku);
}
function selectedItems(){
  return snapshot().items.filter(filter);
}
function selectedItem(){
  const items=selectedItems().filter(i=>i.current.count);
  return items.find(i=>i.sku===state.selected)||items[0];
}
function choose(sku,tab){
  state.selected=sku;
  state.tab=tab;
  simInput=null;
  render();
  $('main').focus();
}
function notice(text,style=''){
  return `<div class="notice ${style}">${text}</div>`;
}
function kpi(label,value,note,featured=false){
  return `<div class="card kpi ${featured?'featured':''}"><label>${label}</label><div class="value">${value}</div><div class="small">${note}</div></div>`;
}
function empty(){
  return `<section class="card empty"><h2>Nenhuma venda nesta seleção.</h2><p class="muted">Amplie o período ou remova os filtros de categoria, tipo e produto.</p><button class="button" data-clear>Limpar filtros</button></section>`;
}
function growth(current,old){
  return current!=null&&old>0?pct(current/old-1):'Não aplicável';
}
function options(items,selected){
  return items.filter(i=>i.current.count).map(i=>`<option value="${esc(i.sku)}" ${i.sku===selected?'selected':''}>${esc(i.name)} · ${i.sku}</option>`).join('');
}
function chart(points,key='margin',other=null,isMoney=false,third=null){
  const available=points.flatMap(p=>[p[key],other?p[other]:null,third?p[third]:null]).filter(v=>v!=null&&Number.isFinite(v));
  if(!available.length)return '<p class="small">Sem histórico elegível para desenhar a curva.</p>';
  let min=Math.min(...available),max=Math.max(...available);
  const span=max-min||.1;
  min-=span*.25;
  max+=span*.25;
  const w=Math.max(650,points.length*76+110),h=250,left=64,right=22,top=22,bottom=36,x=i=>points.length===1?w/2:left+i*(w-left-right)/(points.length-1),y=v=>h-bottom-(v-min)/(max-min)*(h-top-bottom);
  let svg=`<div class="chart-scroll" tabindex="0" role="region" aria-label="Gráfico temporal. Role horizontalmente para ver todos os pontos."><svg style="min-width:${w}px" class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Histórico. Valores exatos disponíveis na tabela abaixo.">`;
  for(let i=0;
  i<4;
  i++){
    const val=min+(max-min)*i/3;
    svg+=`<line x1="${left}" y1="${y(val)}" x2="${w-right}" y2="${y(val)}" stroke="#e3e5ea"/><text x="${left-9}" y="${y(val)+4}" text-anchor="end">${esc(isMoney?brl(val):pct(val))}</text>`;
  }
  function line(k,color,dash){
    let segment=[];
    let out='';
    for(let i=0;
    i<=points.length;
    i++){
      const p=points[i];
      if(p&&p[k]!=null)segment.push(`${x(i)},${y(p[k])}`);
      else if(segment.length){
        out+=`<polyline points="${segment.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" ${dash?'stroke-dasharray="5 5"':'class="ln" pathLength="1"'}/>`;
        segment=[];
      }
    }return out;
  }
  const constant=k=>k&&points.some(p=>p[k]!=null)&&points.filter(p=>p[k]!=null).every(p=>p[k]===points.find(q=>q[k]!=null)[k]);
  const annotations=[];
  for(const [k,col,label] of [[other,'#6872a8','3M'],[third,'#976318','Ano anterior']]){
    if(!k)continue;
    if(!isMoney&&constant(k))annotations.push(label+': '+pct(points.find(p=>p[k]!=null)[k]));
    else svg+=line(k,col,true);
  } svg+=line(key,'#087f71',false);
  points.forEach((p,i)=>{
    if(p.events?.length)svg+=`<line x1="${x(i)}" x2="${x(i)}" y1="${top}" y2="${h-bottom}" stroke="#976318" stroke-dasharray="2 5"/><path tabindex="0" d="M ${x(i)-5} 17 L ${x(i)+5} 17 L ${x(i)} 26 Z" fill="#976318"><title>${esc(p.events.join(" · "))}</title></path>`;
    for(const [k,col] of [[other,'#6872a8'],[third,'#976318']])if(k&&p[k]!=null&&(isMoney||!constant(k)))svg+=`<circle cx="${x(i)}" cy="${y(p[k])}" r="3" fill="${col}"><title>${esc(k==='year'?'Ano anterior':'Referência')}: ${esc(isMoney?brl(p[k]):pct(p[k]))}</title></circle>`;
    if(i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/10))===0)svg+=`<text x="${x(i)}" y="${h-9}" text-anchor="middle">${esc(p.label)}</text>`;
    if(p[key]!=null)svg+=`<circle tabindex="0" cx="${x(i)}" cy="${y(p[key])}" r="4" fill="#087f71"><title>${esc(periodLabel([p.start,p.end]))}: ${esc(isMoney?brl(p[key]):pct(p[key]))} · Receita ${brl(p.revenue)} · LB ${brl(p.gross)} · volume ${num(p.quantity)}</title></circle>`;
  });
  return svg+'</svg></div>'+(annotations.length?'<p class="chart-reference">Referências constantes: '+annotations.map(esc).join(' · ')+'</p>':'');
}
const refs=[['three','3 meses anteriores'],['year','Ano anterior']];
function comparison(items,caption='Comparativos do recorte'){
  const snap=snapshot(),a=M.aggregate(items.map(i=>i.current));
  return `<section class="comparison-section" aria-label="Comparativos históricos"><div class="section-line"><div><p class="eyebrow">CONTEXTO SEM TROCAR DE CENÁRIO</p><h2>${esc(caption)}</h2></div><span class="small">Margens ponderadas pela receita</span></div><div class="comparisons"><article class="comparison current"><div class="compare-label"><i></i> Período selecionado</div><p class="small">${periodLabel(snap.windows.current)}</p><strong>${pct(a.margin)}</strong><span class="small">margem bruta realizada</span><div class="compare-metrics"><span>Receita <b>${brl(a.revenue)}</b></span><span>LB elegível <b>${brl(a.gross)}</b></span><span>Cobertura CMV <b>${pct(a.coverage)}</b></span></div></article>${refs.map(([ref,label])=>{const b=M.aggregate(items.map(i=>i[ref])),ok=snap.complete[ref],delta=ok&&a.margin!=null&&b.margin!=null?a.margin-b.margin:null,days=w=>(+E.parse(w[1])-E.parse(w[0]))/86400000,same=days(snap.windows.current)===days(snap.windows[ref]);return `<article class="comparison ${ref}"><div class="compare-label"><i></i> ${
    label
  }</div><p class="small">${
    periodLabel(snap.windows[ref])
  }</p><strong>${
    ok?pct(b.margin):'Histórico insuficiente'
  }</strong><span class="delta ${delta<0?'down':delta>0?'up':''}">${
    delta==null?'Variação indisponível':pp(delta)+' no período selecionado'
  }</span><div class="compare-metrics"><span>Receita <b>${
    ok?brl(b.revenue):'Indisponível'
  }</b></span><span>LB elegível <b>${
    ok?brl(b.gross):'Indisponível'
  }</b></span><span>Cobertura CMV <b>${
    ok?pct(b.coverage):'Indisponível'
  }</b></span></div><p class="small compare-note">${
    !ok?'A base não cobre a janela inteira. Nenhum histórico ausente é estimado.':ref==='three'?'Total acumulado de 3 meses civis; duração diferente da seleção em geral.':same?'Receita vs ano anterior: '+growth(a.revenue,b.revenue)+'.':'Calendário ajustado (29/02 → 28/02); durações diferentes, sem % de crescimento.'
  }</p></article>`;}).join('')}</div></section>`;
}
function history(items){
  const keys=new Set(items.map(i=>i.sku));
  let buckets=E.buckets(state.start,E.add(state.end,1));
  if(buckets[0]?.grain==='day'&&state.grain!=='daily'){
    const days=new Set(D.raw.sales.filter(r=>keys.has(r.sku)&&r.date>=state.start&&r.date<=state.end).map(r=>r.date));
    if(days.size/buckets.length<.5){
      buckets=[];
      for(let start=state.start;
      start<=state.end;
      ){
        const end=E.add(start,7)<E.add(state.end,1)?E.add(start,7):E.add(state.end,1);
        buckets.push({
          start,end,label:date(E.add(end,-1)).slice(0,5),grain:'week'
        });
        start=end;
      }
    }
  }
  return buckets.map(bucket=>{
    const s=engine.analyze(bucket.start,bucket.end),part=s.items.filter(i=>keys.has(i.sku));
    return {
      ...bucket,...M.aggregate(part.map(i=>i.current)),benchmark:s.complete.three?M.aggregate(part.map(i=>i.three)).margin:null,year:s.complete.year?M.aggregate(part.map(i=>i.year)).margin:null,referenceWindows:s.windows
    };
  });
}
function grainText(hist){
  return hist[0]?.grain==='day'?'Visão diária':hist[0]?.grain==='week'?'Blocos de até 7 dias: menos de 50% dos dias têm vendas. Selecione Diária para ver as lacunas.':'Dezenas do mês';
}
function drivers(items){
  const snap=snapshot();
  return `<section class="card drivers"><div class="card-head"><div><h2>O que explica a variação</h2><p class="small">Preço, custo e composição · calculados para os produtos filtrados</p></div><span class="tag green">Efeitos em pp</span></div><div class="grid equal">${refs.map(([ref,label])=>{const dc=snap.complete[ref]?E.decompose(items,ref):null;if(!dc)return `<div><h3>Atual × ${
    label.toLowerCase()
  }</h3><p class="small">Decomposição indisponível: histórico incompleto ou sem receita e quantidade elegíveis positivas.</p></div>`;const fx=[['Preço líquido',dc.effects.price],['CMV unitário',dc.effects.cost],['Mix de produtos',dc.effects.mix],['Entrada de SKUs',dc.effects.entry]],big=Math.max(.0001,...fx.map(([,v])=>Math.abs(v))),lead=fx.reduce((a,b)=>a[1]<b[1]?a:b);return `<div><div class="driver-title"><h3>Atual × ${
    label.toLowerCase()
  }</h3><b class="${dc.total<0?'down':'up'}">${
    pp(dc.total)
  }</b></div>${
    I.waterfall(dc)
  }<p class="small">${
    lead[1]<-1e-9?'Maior pressão: '+lead[0].toLowerCase()+'.':'Sem pressão negativa relevante.'
  } Efeitos conciliados à variação total antes do arredondamento.</p></div>`;}).join('')}</div><p class="small">Saídas de SKUs estão incluídas no mix. Decomposição matemática, não prova de causalidade. Preço antes do custo; outra ordem pode distribuir a interação de forma diferente.</p></section>`;
}
function executive(items){
  if(!items.some(i=>i.current.count))return empty();
  const a=M.aggregate(items.map(i=>i.current)),hist=history(items),below=items.some(i=>i.current.gap!=null)?items.reduce((s,i)=>s+(i.current.gap||0),0):null;
  const signals=I.rank(items.filter(i=>i.current.count&&i.alerts.length),state.order);
  const groups={
  };
  for(const i of items){
    const key=state.group==='sku'?i.name:i[state.group];
    (groups[key]??=[]).push(i);
  }const grouped=Object.entries(groups).map(([name,rows])=>({
    name,...M.aggregate(rows.map(i=>i.current)),three:M.aggregate(rows.map(i=>i.three)),year:M.aggregate(rows.map(i=>i.year))
  })).sort((x,y)=>(y.gap??-1)-(x.gap??-1));
  return `<section class="card executive-summary"><p class="eyebrow">LEITURA DO RECORTE · EXPLICAÇÕES VERIFICÁVEIS</p><h2>${esc(I.summary(items,snapshot().complete.three?E.decompose(items,'three'):null))}</h2><p class="small">Decomposição matemática, sem atribuição causal. ${D.dataset_kind==='import'?'Base importada localmente, conforme cobertura declarada.':'Dados inteiramente sintéticos; validação com dados reais ainda pendente.'}</p></section><section class="kpis">${kpi('Receita líquida disponível',brl(a.revenue),num(a.count)+' registros no período')}${kpi('Margem bruta realizada',pct(a.margin),'Receita elegível: '+brl(a.eligible_revenue),true)}${kpi('Lucro bruto elegível',brl(a.gross),'Receita elegível menos CMV registrado')}${kpi('Falta para a meta · por SKU',brl(below),'Gap líquido da carteira: '+brl(a.gap))}</section>`+(a.coverage!=null&&a.coverage<1?notice(`<strong>Qualidade dos dados:</strong> cobertura CMV de ${pct(a.coverage)}. ${num(a.count-a.eligible_count)} registros sem custo válido ficam fora da margem e do lucro bruto.`):'')+comparison(items)+drivers(items)+`
 <section class="card" style="margin-bottom:20px"><div class="card-head"><div><h2>${hist.filter(h=>h.margin!=null).length} períodos com margem observada</h2><p class="small">${grainText(hist)} · sem vendas não vira margem zero · 3M é referência de meses completos</p></div><label>Granularidade<select id="chart-grain"><option value="auto" ${state.grain!=='daily'?'selected':''}>Automática</option><option value="daily" ${state.grain==='daily'?'selected':''}>Diária dentro do mês</option></select></label></div>${chart(hist,'margin','benchmark',false,'year')}<div class="legend"><span><i></i>Realizada</span><span><i class="other"></i>3 meses anteriores</span><span><i class="year"></i>Ano anterior</span></div><details><summary>Ver valores exatos e datas de cada ponto</summary><div class="table-wrap"><table><thead><tr><th>Período do ponto</th><th>Realizada</th><th>3M / janela</th><th>Ano anterior / janela</th><th>LB</th></tr></thead><tbody>${hist.map(h=>`<tr><td>${
    periodLabel([h.start,h.end])
  }</td><td>${
    pct(h.margin)
  }</td><td>${
    pct(h.benchmark)
  }<small>${
    periodLabel(h.referenceWindows.three)
  }</small></td><td>${
    pct(h.year)
  }<small>${
    periodLabel(h.referenceWindows.year)
  }</small></td><td>${
    brl(h.gross)
  }</td></tr>`).join('')}</tbody></table></div></details></section>
 <section class="card" style="margin-bottom:20px"><div class="card-head"><div><h2>Onde a margem acontece</h2><p class="small">Mesmo recorte de produtos nas três janelas · ordenado por gap agregado</p></div><label>Agrupar<select id="group"><option value="category" ${state.group==='category'?'selected':''}>Categoria</option><option value="type" ${state.group==='type'?'selected':''}>Tipo</option><option value="sku" ${state.group==='sku'?'selected':''}>Produto</option></select></label></div><div class="table-wrap"><table><thead><tr><th>Grupo</th><th>Receita atual</th><th>Margem atual</th><th>3M</th><th>Ano anterior</th><th>Gap atual</th></tr></thead><tbody>${grouped.map(g=>`<tr><td><strong>${
    esc(g.name)
  }</strong></td><td>${
    brl(g.revenue)
  }</td><td><strong>${
    pct(g.margin)
  }</strong></td><td>${
    snapshot().complete.three?pct(g.three.margin):'Indisponível'
  }</td><td>${
    snapshot().complete.year?pct(g.year.margin):'Indisponível'
  }</td><td>${
    brl(g.gap)
  }</td></tr>`).join('')}</tbody></table></div></section>
 <section class="card"><div class="section-line"><div><p class="eyebrow">PRÓXIMO PASSO</p><h2>Comece por estes sinais</h2><p class="small">Até 5 prioridades · critério selecionável, sem índice opaco</p></div><label>Ordenar sinais<select id="signal-order"><option value="severity" ${state.order==='severity'?'selected':''}>Severidade e gap</option><option value="gap" ${state.order==='gap'?'selected':''}>Maior gap</option><option value="change" ${state.order==='change'?'selected':''}>Maior queda vs 3M</option></select></label></div><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Condição observada</th><th>Margem atual</th><th>3M</th><th>Ano anterior</th><th>Gap</th><th>Ação</th></tr></thead><tbody>${signals.slice(0,5).map(i=>`<tr><td><strong>${
    esc(i.name)
  }</strong><small>${
    i.sku
  } · ${
    esc(i.type)
  }</small></td><td><span class="tag ${i.severity==='Crítico'?'red':'amber'}">${
    i.severity
  }</span><small>${
    esc(I.classify(i).label)
  } · ${
    esc(i.alerts.slice(0,2).join(' · '))
  }</small></td><td>${
    pct(i.current.margin)
  }</td><td>${
    snapshot().complete.three?pct(i.three.margin):'Indisponível'
  }</td><td>${
    snapshot().complete.year?pct(i.year.margin):'Indisponível'
  }</td><td>${
    brl(i.current.gap)
  }</td><td><button class="link-button" data-investigate="${i.sku}">Investigar ↗</button></td></tr>`).join('')||'<tr><td colspan="7">Nenhum sinal nos filtros atuais.</td></tr>'}</tbody></table></div><p class="small" style="margin-top:12px">Gaps positivos por SKU não se compensam; o gap líquido da carteira permite compensação. Nenhum deles representa perda realizada.</p></section>
 <section class="card" style="margin-top:20px"><h2>Pendências de qualidade</h2><p class="small">Sem estimar valores ausentes</p><div class="quality-list">${items.filter(i=>i.current.count&&i.quality.length).map(i=>`<button class="quality-chip" data-investigate="${i.sku}">${
    esc(i.name)
  } · ${
    esc(i.quality[0])
  } ↗</button>`).join('')||'<span class="small">Nenhuma pendência para esta seleção.</span>'}</div></section>`;
}
function factText(f){
  if(!f)return '';
  const v=f.values;
  if(f.kind==='cost')return `O custo da última compra passou de ${brl(v.previous)} para ${brl(v.current)} (${pct(v.change)}), na mesma unidade.`;
  if(f.kind==='negative')return `O lucro bruto elegível foi ${brl(v.gross)}, com margem realizada de ${pct(v.margin)}.`;
  if(f.kind==='target')return `O gap elegível para a meta é ${brl(v.gap)}, com margem realizada de ${pct(v.margin)}.`;
  if(f.kind==='channel_loss')return `O LB de ${brl(v.gross)} menos ${brl(v.commission)} de comissão resulta em ${brl(v.channel)} após comissão.`;
  if(f.kind==='history'||f.kind==='year')return `Margem atual de ${pct(v.margin)} contra ${pct(v.reference)} ${f.kind==='history'?'nos três meses anteriores':'no ano anterior'}: ${pp(v.delta)}. Cobertura de CMV na referência: ${pct(v.coverage)}.`;
  if(f.kind==='on_target')return `Meta bruta atendida neste recorte: margem de ${pct(v.margin)} e meta ponderada de ${pct(v.target)}. Lucro bruto elegível: ${brl(v.gross)}.`;
  return `As vendas elegíveis somam ${brl(v.revenue)} em ${num(v.quantity)} unidades; desconto registrado de ${brl(v.discount)}.`;
}
const factNames={
  negative:'Margem negativa',channel_loss:'Pressão da comissão',target:'Distância para a meta',cost:'Movimento de compra',price:'Preço líquido',history:'Contexto de três meses',year:'Comparação anual',on_target:'Meta atendida'
};
function narrative(item){
  const n=item.narrative;
  if(!n.response)return notice(item.current.margin==null?'Sem margem elegível para uma explicação financeira. Corrija a origem do CMV; não estimamos o custo ausente.':'Não há sinal enquadrado nas regras deste recorte. Confira a cobertura da meta e as referências antes de concluir que o resultado está saudável.');
  const entries=[{
    mode:n.mode,response:n.response
  },...(n.supporting||[])];
  try{
    for(const e of entries)M.validateNarrative(e.response,n.facts,snapshot().period);
  }catch(e){
    return notice('Narrativa recusada pela barreira: '+esc(e.message),'error');
  }
  const seenActions=new Set();
  const cards=entries.map((e,index)=>{
    const r=e.response,label=e.mode==='prepared'?'Amostra estruturada · verificada':'Texto automático de regras';
    const action=seenActions.has(r.action_code)?'':D.actions[r.action_code];
    seenActions.add(r.action_code);
    return `<section class="narrative-entry" data-fact-kind="${esc(n.facts[r.fact_id].kind)}"><h3>${index===0?'Diagnóstico principal · ':''}${esc(factNames[n.facts[r.fact_id].kind])}</h3><span class="tag green">${label}</span><div class="fact"><p><strong>${esc(factText(n.facts[r.fact_id]))}</strong></p><p>${esc(D.narrative_text[r.hypothesis])}</p><p class="small">Evidência: ${esc(r.fact_id)}</p></div><p>${esc(action)}</p></section>`;
  });
  return cards.slice(0,3).join('')+(cards.length>3?'<details><summary>Mais '+(cards.length-3)+' evidências complementares</summary>'+cards.slice(3).join('')+'</details>':'')+'<p class="small">Fatos ordenados por prioridade; comparativos e meta atendida complementam o diagnóstico. Textos de regras ampliados, sem geração ao vivo. Alternativas condicionadas às premissas. Sem garantia de demanda, ganho ou causalidade.</p>';
}
function decisionCard(i){
  const a=i.current,base=i.simulation,p=i.purchase,covered=a.eligible_revenue>0?a.target_revenue/a.eligible_revenue:null;
  let price=null,cost=null;
  try{
    if(base&&covered===1){
      price=M.simulate(base).reference_price;
      cost=Math.floor(base.p*(10000-base.m)/10000);
    }
  }catch(e){
  }
  const channel=a.gross==null?null:a.gross-a.commission;
  const first=a.coverage!==1?'Resolver cobertura de CMV':channel!=null&&channel<0?'Investigar resultado após comissão':a.gap>0?'Comparar alternativas para a meta':'Monitorar margem e custo';
  return `<section class="card decision-card"><div class="card-head"><div><p class="eyebrow">PLANO PARA ${esc(i.sku)}</p><h2>Da investigação à decisão</h2></div><span class="tag ${i.severity==='Crítico'?'red':'amber'}">${esc(i.severity)}</span></div><div class="decision-lead"><span class="small">Primeiro passo</span><h3>${first}</h3><span class="tag green">${esc(I.classify(i).label)}</span><p>${esc(I.classify(i).action)}</p><p>${i.quality.length?esc(i.quality.join('; ')):'Custos comparáveis disponíveis. Confira as condições comerciais antes de aplicar uma mudança.'}</p></div><div class="decision-metrics"><div><span>Gap elegível</span><b>${brl(a.gap)}</b><small>Distância para a meta, não perda realizada</small></div><div><span>Após comissão</span><b class="${channel<0?'down':''}">${brl(channel)}</b><small>Resultado das vendas elegíveis</small></div><div><span>Preço para a meta</span><b>${brl(price)}</b><small>${covered===1?'Com CMV médio e meta da última venda':'Meta não cobre todas as linhas elegíveis'}</small></div><div><span>CMV máximo por unidade</span><b>${brl(cost)}</b><small>Para a meta bruta, mantendo preço médio</small></div></div><div class="evidence-checks"><h3>O que sustenta a decisão</h3><p><b>${num(a.eligible_count)} de ${num(a.count)}</b> vendas com custo elegível · cobertura ${pct(a.coverage)}.</p><p>Meta cobre <b>${pct(covered)}</b> da receita elegível.</p><p>${p.valid?'Última compra em '+date(p.current.date)+': '+brl(p.current.cost)+' por '+esc(i.unit)+'.':'Compra: '+esc(p.reason)}</p></div><div class="action-options"><h3>Teste uma alternativa</h3><button class="button" data-simulate="${i.sku}" ${!base?'disabled':''}>${covered===1?'Simular preço para a meta':'Simular com meta informada'} →</button><button class="button secondary" data-simulate="${i.sku}" data-setup="cost" ${!base?'disabled':''}>Testar CMV 5% menor</button><button class="button secondary" data-simulate="${i.sku}" data-setup="channel" ${!base?'disabled':''}>Testar meta pós-comissão</button></div><p class="small">Alternativas hipotéticas, sem reajuste automático. Compra nova não substitui o CMV das vendas. O preço calculado não garante demanda.</p></section>`;
}
function diagnostic(items){
  if(!items.some(i=>i.current.count))return empty();
  const i=selectedItem();
  state.selected=i.sku;
  const a=i.current,p=i.purchase,price=a.quantity>0?a.revenue/a.quantity:null,hist=history([i]);
  const timeline=hist.map(h=>{
    const it=engine.analyze(h.start,h.end).items.find(x=>x.sku===i.sku);
    return {
      ...h,events:D.raw.purchases.filter(r=>r.sku===i.sku&&r.date>=h.start&&r.date<h.end).map(r=>"Compra em "+date(r.date)+": "+brl(r.cost)+"/"+r.unit),price:h.quantity>0?h.revenue/h.quantity:null,purchase:it.purchase.valid?it.purchase.current.cost:null
    };
  });
  return comparison([i],'Histórico do produto em foco')+`<section class="card" style="margin-bottom:20px"><div class="card-head"><div><p class="eyebrow">Produto em foco: ${i.sku}${i.story?' (história '+i.story+')':''}</p><h2 class="detail-title">${esc(i.name)}</h2><p class="small">${esc(i.category)} · ${esc(i.type)} · unidade ${i.unit} · ${periodLabel(snapshot().windows.current)}</p></div><label>Trocar produto<select id="detail-sku">${options(items,i.sku)}</select></label></div><div class="pulse"><span>Realizada <b>${pct(a.margin)}</b></span><span>Meta coberta <b>${a.target_revenue>0?pct(a.target_value/a.target_revenue):'Indisponível'}</b></span><span>Gap <b>${brl(a.gap)}</b></span><span>Cobertura CMV <b>${pct(a.coverage)}</b></span><span>Confiança <b>${i.confidence}</b></span></div><div class="quality-list">${i.alerts.map(t=>`<span class="tag amber">${
    esc(t)
  }</span>`).join('')}</div></section>
 <div class="grid equal diagnostic-grid"><section class="card"><h2>O que os dados sustentam</h2><p class="small">Fato → hipótese limitada → alternativa de ação</p>${narrative(i)}<details><summary>Ver evidências e cálculo</summary><div class="formula">LB = ${brl(a.eligible_revenue)} − ${brl(a.cmv)} = ${brl(a.gross)}<br>Margem = LB ÷ receita elegível = ${pct(a.margin)}<br>Gap = máx(0; ${brl(a.target_value)} − ${brl(a.target_gross)}) = ${brl(a.gap)}</div><p class="small">${a.eligible_count} / ${a.count} registros elegíveis. Cobertura da meta: ${a.eligible_revenue>0?pct(a.target_revenue/a.eligible_revenue):'Indisponível'}. Valores ausentes não viram zero.</p><pre>${esc(JSON.stringify({period:snapshot().windows.current,source_ids:i.source_ids,source_rows:i.source_rows,facts:i.narrative.facts,dataset_hash:D.dataset_hash},null,2))}</pre></details></section>
 ${decisionCard(i)}</div>
 <div class="grid equal"><section class="card"><h2>Preço líquido × custo de compra</h2><p class="small">${i.unit} · ${grainText(hist)} · compra é custo de referência, não CMV realizado</p>${chart(timeline,'price','purchase',true)}<p class="small">Eventos registrados no recorte: ${D.raw.purchases.filter(r=>r.sku===i.sku&&r.date>=state.start&&r.date<=state.end).map(r=>date(r.date)+' · compra '+brl(r.cost)+'/'+esc(r.unit)).join('; ')||'nenhuma compra'}. Desconto nas vendas: ${brl(a.discount)}. Coincidência temporal não comprova causa.</p><div class="legend"><span><i></i>Preço líquido por unidade</span><span><i class="other"></i>Última compra comparável</span></div><details><summary>Ver linha do tempo e datas de compra</summary><div class="table-wrap"><table><thead><tr><th>Período</th><th>Preço</th><th>Custo compra</th><th>Compra em</th><th>Margem realizada</th></tr></thead><tbody>${timeline.map(h=>{const buy=engine.analyze(h.start,h.end).items.find(x=>x.sku===i.sku).purchase;return `<tr><td>${
    periodLabel([h.start,h.end])
  }</td><td>${
    brl(h.price)
  }</td><td>${
    brl(h.purchase)
  }</td><td>${
    buy.valid?date(buy.current.date):'Indisponível'
  }</td><td>${
    pct(h.margin)
  }</td></tr>`;}).join('')}</tbody></table></div></details></section>
 <section class="card"><h2>O efeito da última compra</h2><p class="small">Preço constante · somente mesmo SKU e unidade</p>${p.valid&&price?`<div class="delta-grid"><div><span class="small">Penúltima · ${
    date(p.previous.date)
  }</span><b>${
    brl(p.previous.cost)
  }</b><span class="small">Teórica: ${
    pct((price-p.previous.cost)/price)
  }</span></div><div><span class="small">Última · ${
    date(p.current.date)
  }</span><b>${
    brl(p.current.cost)
  }</b><span class="small">Teórica: ${
    pct((price-p.current.cost)/price)
  }</span></div></div><div class="fact"><strong>Custo ${
    pct(p.change)
  } · margem teórica ${
    pp((p.previous.cost-p.current.cost)/price)
  }</strong><p class="small">Preço fixado em ${
    brl(price)
  }. Essa variação não reescreve a margem realizada de ${
    pct(a.margin)
  }.</p></div>`:notice(esc(p.reason||'Preço líquido indisponível'))}<section class="ai-lab"><p class="eyebrow">EXPLICAÇÕES VERIFICÁVEIS</p><h3>Como a explicação se comporta?</h3><p class="small">${Object.keys(i.narrative.facts).length} fatos disponíveis neste SKU e período. Escolha um teste para ver o que a barreira aceita ou recusa. São respostas controladas, sem chamada a um modelo.</p><label>Cenário de validação<select id="barrier-case"><option value="invented">Valor inventado na resposta</option><option value="period">Período diferente do recorte</option><option value="identity">Produto ou evidência inexistente</option><option value="causality">Causa não sustentada pelos dados</option><option value="missing">Sem evidência elegível</option><option value="valid">Resposta válida e rastreável</option></select></label><button class="button secondary" id="test-barrier">Executar teste da barreira</button><div id="barrier-result" role="status"></div></section></section></div>`;
}
let simErr={
},simDraft={
},copyGeneration=0,copyTimer=null;
const driverNames={
  price:'Preço líquido unitário',margin:'Margem-alvo',revenue:'Receita líquida total',channel:'Resultado após comissão'
};
function simValue(key,defaultValue){
  return esc(Object.hasOwn(simDraft,key)?simDraft[key]:defaultValue);
}
function simulator(items){
  if(!items.some(i=>i.current.count))return empty();
  const i=selectedItem();
  state.selected=i.sku;
  if(!i.simulation)return comparison([i],'Histórico do produto em foco')+`<section class="card"><h2>${esc(i.name)}: custo elegível indisponível</h2>${notice('Não preenchemos CMV desconhecido. Selecione outro produto ou corrija a origem antes de simular.')}<label>Produto<select id="detail-sku">${options(items,i.sku)}</select></label></section>`;
  const base=i.simulation;
  if(!simInput){
    simErr={
    };
    simDraft={
    };
    let ref=base.p;
    try{
      ref=Math.max(base.p,M.simulate(base).reference_price);
    }catch(e){
    }simInput={
      ...base,p:ref,volumeDown:10,volumeUp:10,driver:'price',desired:null
    };
  }
  const s=simInput;
  return comparison([i],'Histórico realizado · antes de simular')+`<div class="sim-layout"><section class="card premise-card"><p class="eyebrow">Premissas do cenário</p><h2>${esc(i.name)}</h2><p class="small">${i.sku} · ${i.unit} · ${periodLabel(snapshot().windows.current)}</p><label>Trocar produto<select id="detail-sku">${options(items,i.sku)}</select></label>${i.current.coverage!==1?notice('A simulação usa somente vendas com custo elegível: cobertura de '+pct(i.current.coverage)+'.'):''}${i.current.target_revenue!==i.current.eligible_revenue?notice(i.current.target_revenue>0?'A meta cobre parte das vendas. A premissa usa a meta da última venda; confira e ajuste.':'Sem meta cadastrada para as vendas elegíveis. O campo de meta é uma premissa editável; 0% não representa uma meta cadastrada.'):''}<div class="scenario-guide"><strong>Escolha por onde começar</strong><p class="small">Edite preço, margem ou um valor total. O último desses campos editado define o preço. CMV, volume e comissão respeitam essa escolha. O realizado permanece intacto.</p><span id="sim-driving" class="tag green"></span></div>
 <div class="controls"><label class="wide">Preço líquido por ${i.unit} (R$)<input id="sim-p" type="number" min="0.01" max="1000000" step="0.01" value="${simValue('p',(s.p/100).toFixed(2))}" aria-describedby="sim-input-error"><input id="price-range" aria-label="Ajustar preço líquido" type="range" min="${Math.max(1,Math.floor(base.p*.5))/100}" max="${Math.max(Math.ceil(base.p*2),s.p)/100}" step="0.01" value="${s.p/100}"></label>
 <label>Meta escolhida<select id="sim-goal"><option value="gross" ${s.goal==='gross'?'selected':''}>Margem bruta</option><option value="channel" ${s.goal==='channel'?'selected':''}>Pós-comissão</option></select></label><label>Margem-alvo (%)<input id="sim-m" type="number" min="0" max="99.99" step="0.01" value="${simValue('m',s.m/100)}" aria-describedby="sim-input-error"></label>
 <label class="wide">Receita líquida total desejada (R$)<input id="sim-revenue" type="number" min="0.01" step="0.01" value="${simValue('revenue','')}" aria-describedby="sim-amount-note sim-input-error"></label><label class="wide">Resultado após comissão desejado (R$)<input id="sim-channel" type="number" step="0.01" value="${simValue('channel','')}" aria-describedby="sim-amount-note sim-input-error"></label></div><p id="sim-amount-note" class="small">Receita = preço × volume. Resultado após comissão = receita − CMV − comissão. Este resultado não é lucro líquido.</p><p id="sim-rounding" class="small" role="status"></p>
 <div class="premise-section"><h3>Custo, volume e canal</h3><div class="controls"><label>CMV unitário (R$)<input id="sim-c" type="number" min="0" max="1000000" step="0.01" value="${simValue('c',s.c/100)}" aria-describedby="sim-input-error"></label><label>Volume (${i.unit})<input id="sim-q" type="number" min="0" max="1000000" step="1" value="${simValue('q',s.q)}" aria-describedby="sim-input-error"></label><label>Comissão do canal (%)<input id="sim-t" type="number" min="0" max="99.99" step="0.01" value="${simValue('t',s.t/100)}" aria-describedby="sim-input-error"></label></div></div>
 <details open><summary>Hipóteses de volume</summary><div class="controls"><label>Queda conservadora (%)<input id="sim-down" type="number" min="0" max="100" step="1" value="${simValue('down',s.volumeDown)}" aria-describedby="sim-input-error"></label><label>Ganho otimista (%)<input id="sim-up" type="number" min="0" max="100" step="1" value="${simValue('up',s.volumeUp)}" aria-describedby="sim-input-error"></label></div></details>
 <p id="sim-input-error" class="field-error" role="alert" hidden></p><div class="action-options"><button id="use-reference" class="button secondary">Usar preço-referência da meta</button><button id="reset-sim" class="quiet">↺ Restaurar premissas do produto</button></div><div id="scenario-coach"></div></section>
 <section><div id="simulation-results" aria-live="polite"></div><section class="card scenario-assumptions"><div class="card-head"><div><p class="eyebrow">LEITURA DO CENÁRIO</p><h2>Premissas, limites e compartilhamento</h2></div><span class="tag amber">Hipótese</span></div><div class="assumption-grid"><div><h3>O que entra</h3><p class="small">Preço e CMV por unidade, quantidade inteira e comissão proporcional à receita. Os totais e a comissão são calculados em centavos.</p></div><div><h3>O que fica fora</h3><p class="small">Impostos, frete, despesas fixas, devoluções e elasticidade. Volume conservador e otimista são hipóteses suas, não previsões.</p></div></div><details><summary>Ver fórmulas e arredondamentos</summary><div class="formula">Receita = p × q<br>CMV = c × q<br>LB = (p − c) × q<br>Margem bruta = (p − c) ÷ p<br>Após comissão = Receita − CMV − comissão<br>Preço para meta bruta = c ÷ (1 − m)<br>Preço para meta pós-comissão = c ÷ (1 − t − m)</div><p class="small">Preço-referência arredondado para cima ao centavo. Comissão total arredondada HALF_UP. Ao definir um total, buscamos o menor preço em centavos que o alcança; a diferença é exibida. Margens são unitárias, inclusive com volume zero. Fórmula ${D.formula}.</p></details>
 <div class="share-actions"><button id="copy-scenario" class="button secondary">Copiar cenário</button><button id="show-scenario" class="quiet" aria-expanded="false" aria-controls="scenario-panel">Ver resumo</button></div><div id="copy-status" role="status" aria-live="polite" hidden><span id="copy-message"></span><button id="dismiss-copy" class="quiet" aria-label="Fechar confirmação de cópia">×</button></div><section id="scenario-panel" hidden><div class="section-line"><h3>Resumo para compartilhar</h3><button id="close-scenario" class="quiet">Fechar resumo ×</button></div><textarea id="scenario-text" rows="8" aria-label="Resumo do cenário para copiar" readonly></textarea><details><summary>Dados estruturados (JSON)</summary><pre id="scenario-json"></pre></details></section></section></section></div>`;
}
let scenarioData=null;
function invalidateCopy(){
  copyGeneration++;
  clearTimeout(copyTimer);
  lastScenario='';
  scenarioData=null;
  for(const id of ['scenario-panel','copy-status'])if($(id))$(id).hidden=true;
  if($('show-scenario'))$('show-scenario').setAttribute('aria-expanded','false');
  if($('copy-scenario'))$('copy-scenario').textContent='Copiar cenário';
}
function setScenarioPanel(open,restoreFocus=true){
  const panel=$('scenario-panel');
  if(!panel)return;
  panel.hidden=!open;
  $('show-scenario').setAttribute('aria-expanded',String(open));
  if(open){
    $('scenario-text').value=lastScenario;
    $('scenario-json').textContent=JSON.stringify(scenarioData,null,2);
  }else if(restoreFocus)$('show-scenario').focus();
}
function setDriver(driver,desired=null){
  simInput.driver=driver;
  simInput.desired=desired;
  for(const key of ['revenue','channel'])if(key!==driver){
    simErr[key]='';
    delete simDraft[key];
  }
  if(driver!=='price'){
    simErr.p='';
    delete simDraft.p;
  }
}
function syncDerived(key,value,active){
  if(key===active)return;
  delete simDraft[key];
  const el=$('sim-'+key);
  if(el)el.value=value;
}
function scenarioCoach(i,s,p,r){
  const label=s.goal==='gross'?'bruta':'pós-comissão',actual=s.goal==='gross'?p.gross_margin:p.channel_margin,met=actual+1e-12>=s.m/10000;
  let checks=[];
  for(const [name,change] of [['Preço +1%',{
    p:Math.ceil(s.p*1.01)
  }],['CMV −1%',{
    c:Math.floor(s.c*.99)
  }],['Comissão −1 pp',{
    t:Math.max(0,s.t-100)
  }]]){
    try{
      const x=M.simulate({
        ...s,...change
      });
      checks.push(`<div><span>${name}</span><b>${brl(x.channel-p.channel)}</b><small>no resultado após comissão</small></div>`);
    }catch(e){
    }
  }
  return `<div class="coach-heading"><p class="eyebrow">LEITURA EM TEMPO REAL</p><h3>${met?'Meta alcançada pelas premissas':'Ainda abaixo da margem-alvo'}</h3><p class="small">Margem ${label}: <b>${pct(actual)}</b> · meta ${pct(s.m/10000)} · diferença ${pp(actual-s.m/10000)}.</p></div><div class="mini-ledger"><div><span>CMV / receita</span><b>${pct(s.c/s.p)}</b></div><div><span>Comissão / receita</span><b>${pct(s.t/10000)}</b></div><div><span>Saldo unitário após comissão</span><b>${brl(s.p-s.c-s.p*s.t/10000)}</b></div></div><h3 class="coach-subtitle">Uma mudança por vez</h3><p class="small">Sensibilidade local, com o volume proposto fixo. Não soma efeitos e não redefine suas premissas.</p><div class="micro-scenarios">${checks.join('')}</div><p class="small">${p.channel<0?'O cenário deixa resultado negativo após comissão; aumentar volume nessas condições amplia o valor negativo.':p.gross>r.gross&&p.channel<r.channel?'O LB melhora, mas o resultado após comissão piora. Confira a taxa do canal.':'Compare o saldo com as despesas que estão fora da simulação antes de decidir.'}</p>`;
}
function updateSimulation(active=null){
  const i=selectedItem(),s=simInput;
  if(!s||!i.simulation)return;
  invalidateCopy();
  try{
    for(const key of ['p','c','q','t','m','revenue','channel','down','up'])$('sim-'+key)?.setAttribute('aria-invalid',simErr[key]?'true':'false');
    const bad=Object.values(simErr).find(Boolean);
    if(bad)throw Error(bad);
    const validated={
      ...s,p:s.driver==='price'?s.p:i.simulation.p
    };
    M.simulate(validated);
    let rounding=null;
    if(s.driver==='margin')s.p=Math.max(1,M.simulate(validated).reference_price);
    else if(s.driver==='revenue'||s.driver==='channel'){
      rounding=M.priceForAmount(validated,s.desired,s.driver);
      s.p=rounding.price;
    }
    const r=M.simulate(i.simulation),p=M.simulate(s);
    if(!Number.isFinite(s.volumeDown)||s.volumeDown<0||s.volumeDown>100||!Number.isInteger(s.volumeDown)||!Number.isFinite(s.volumeUp)||s.volumeUp<0||s.volumeUp>100||!Number.isInteger(s.volumeUp))throw Error('Variação de volume deve ser um inteiro entre 0% e 100%.');
    const con=M.simulate({
      ...s,q:Math.round(s.q*(1-s.volumeDown/100))
    }),opt=M.simulate({
      ...s,q:Math.round(s.q*(1+s.volumeUp/100))
    });
    syncDerived('p',(s.p/100).toFixed(2),active);
    for(const key of ['revenue','channel'])syncDerived(key,((s.driver===key?s.desired:p[key])/100).toFixed(2),active);
    $('price-range').min=Math.min(s.p,Math.max(1,Math.floor(i.simulation.p*.5)))/100;
    $('price-range').max=Math.max(s.p,Math.ceil(i.simulation.p*2))/100;
    $('price-range').value=s.p/100;
    $('sim-driving').textContent='Cálculo definido por: '+driverNames[s.driver];
    $('sim-rounding').textContent=rounding?`Solicitado: ${brl(s.desired)} · obtido: ${brl(rounding.achieved)} · ajuste de centavos: ${brl(rounding.difference)}.`:'';
    $('sim-input-error').hidden=true;
    const metrics=[['Receita líquida','revenue',brl],['CMV','cmv',brl],['Lucro bruto','gross',brl],['Margem bruta unitária','gross_margin',pct],['Comissão','commission',brl],['Resultado após comissão','channel',brl],['Margem pós-comissão unitária','channel_margin',pct]];
    const unit=s.p-s.c,q0=i.simulation.q,minVolume=unit>0&&r.gross>0?Math.ceil(r.gross/unit):null;
    const be=minVolume==null?'':`<div class="fact"><p>Volume mínimo para preservar o LB de referência: <b>${num(minVolume)} ${i.unit}</b>.</p><p class="small">${minVolume<=q0?'Pode perder até '+pct(1-minVolume/q0)+' das '+num(q0)+' unidades de referência.':'Precisa de '+num(minVolume-q0)+' unidades além das '+num(q0)+' de referência.'} Limite arredondado para unidades inteiras; não é previsão de demanda.</p></div>`;
    const comparison=metrics.map(([name,key,fmt])=>`<tr><td>${name}</td><td>${fmt(r[key])}</td><td><strong>${fmt(p[key])}</strong></td><td>${key.includes('margin')?pp(p[key]-r[key]):brl(p[key]-r[key])}</td></tr>`).join('');
    $('simulation-results').innerHTML=`<div class="sim-result"><span class="small">Preço-referência para ${pct(s.m/10000)} ${s.goal==='gross'?'de margem bruta':'pós-comissão'}</span><strong>${brl(p.reference_price)}</strong><p class="small">Referência matemática, não recomendação comercial.</p></div>${be}${p.gross<0?notice('Atenção: o cenário proposto tem margem bruta negativa.'):p.channel<0?notice('O lucro bruto é positivo, mas não cobre a comissão do cenário.'):''}${s.q===0?notice('Quantidade nula: nenhum resultado monetário. A margem exibida é unitária.'):''}${Math.abs(s.p/i.simulation.p-1)>.5?notice('Variação de preço acima de 50%: revise a hipótese de volume.'):''}<section class="card"><div class="section-line"><h2>Referência × proposto</h2><span class="tag green">Atualiza ao editar</span></div><div class="table-wrap"><table class="scenario-table"><thead><tr><th>Indicador</th><th>Referência</th><th>Proposto</th><th>Variação</th></tr></thead><tbody>${comparison}</tbody></table></div><p class="small">Referência recalculada com médias unitárias arredondadas; os cartões superiores preservam os valores realizados. Sob suas premissas, LB varia ${brl(p.gross-r.gross)} e o resultado após comissão varia ${brl(p.channel-r.channel)}.</p></section><section class="card sensitivity-card"><h2>Sensibilidade ao volume</h2><p class="small">Mesmo preço, custo e comissão propostos; muda somente a quantidade.</p><div class="table-wrap"><table><thead><tr><th>Cenário</th><th>Unidades</th><th>LB</th><th>Após comissão</th></tr></thead><tbody><tr><td>Referência</td><td>${num(i.simulation.q)}</td><td>${brl(r.gross)}</td><td>${brl(r.channel)}</td></tr><tr><td>Conservador · −${s.volumeDown}%</td><td>${num(Math.round(s.q*(1-s.volumeDown/100)))}</td><td>${brl(con.gross)}</td><td>${brl(con.channel)}</td></tr><tr class="selected-row"><td>Proposto</td><td>${num(s.q)}</td><td>${brl(p.gross)}</td><td>${brl(p.channel)}</td></tr><tr><td>Otimista · +${s.volumeUp}%</td><td>${num(Math.round(s.q*(1+s.volumeUp/100)))}</td><td>${brl(opt.gross)}</td><td>${brl(opt.channel)}</td></tr></tbody></table></div></section>`;
    $('scenario-coach').innerHTML=scenarioCoach(i,s,p,r);
    scenarioData={
      timestamp:new Date().toISOString(),formula:D.formula,sku:i.sku,filters:{
        ...state
      },reference:{
        ...i.simulation
      },proposed:{
        ...s
      },results:p,rounding,limits:(D.dataset_kind==='import'?'Dados importados localmente. ':'Dados fictícios. ')+'Volume hipotético; sem impostos, frete, despesas fixas, devoluções ou elasticidade. Não é previsão nem lucro líquido.'
    };
    lastScenario=`MARGIN GUARDIAN — CENÁRIO HIPOTÉTICO\n${i.name} · ${i.sku}\nPeríodo: ${periodLabel(snapshot().windows.current)}\nCategoria: ${state.category||'Todas'} · Tipo: ${state.type||'Todos'}\nDefinido por: ${driverNames[s.driver]}${s.desired!=null?' ('+brl(s.desired)+')':''}\nPreço por unidade: ${brl(s.p)}\nCMV por unidade: ${brl(s.c)}\nQuantidade: ${num(s.q)} ${i.unit}\nComissão: ${pct(s.t/10000)}\nMeta: ${pct(s.m/10000)} ${s.goal==='gross'?'bruta':'pós-comissão'}\n\nRECEITA LÍQUIDA: ${brl(p.revenue)}\nLUCRO BRUTO: ${brl(p.gross)} · margem ${pct(p.gross_margin)}\nAPÓS COMISSÃO: ${brl(p.channel)} · margem ${pct(p.channel_margin)}\nVariação do LB vs referência: ${brl(p.gross-r.gross)}\nVolume conservador: ${num(Math.round(s.q*(1-s.volumeDown/100)))} · LB ${brl(con.gross)}\nVolume otimista: ${num(Math.round(s.q*(1+s.volumeUp/100)))} · LB ${brl(opt.gross)}\n${rounding?'Ajuste por preço em centavos: '+brl(rounding.difference)+'\n':''}\n${scenarioData.limits}`;
    $('copy-scenario').disabled=false;
    $('show-scenario').disabled=false;
  }catch(e){
    $('simulation-results').innerHTML=notice(esc(e.message),'error');
    $('scenario-coach').innerHTML='<p class="small">Corrija a premissa indicada para atualizar os indicadores.</p>';
    $('sim-input-error').hidden=false;
    $('sim-input-error').textContent=e.message;
    if(active)$('sim-'+active)?.setAttribute('aria-invalid','true');
    $('sim-rounding').textContent='';
    $('copy-scenario').disabled=true;
    $('show-scenario').disabled=true;
  }
}
function runBarrier(){
  const n=selectedItem().narrative,kind=$('barrier-case').value;
  let response=n.response?{
    ...n.response
  }:null,facts=n.facts;
  if(kind==='invented')response={
    ...response,invented_value:999999
  };
  if(kind==='period'&&response)response.period='1900-01';
  if(kind==='identity'&&response)response.fact_id='SKU-INEXISTENTE';
  if(kind==='causality'&&response)response.hypothesis='guaranteed_cause';
  if(kind==='missing')facts={
  };
  try{
    M.validateNarrative(response,facts,snapshot().period);
    $('barrier-result').innerHTML=notice('Aceita: esquema, período e vínculo com o fato foram validados. Isso não prova causalidade.','good')+`<p>${esc(factText(facts[response.fact_id]))}</p>`;
  }
  catch(e){
    $('barrier-result').innerHTML=notice('Recusada: '+esc(e.message)+'. Modo final: texto automático de regras.','good')+`<p class="small">${esc(kind==='missing'?'Sem evidência: não se produz narrativa financeira.':n.response?factText(n.facts[n.response.fact_id]):'Sem evidência financeira elegível neste recorte.')}</p>`;
  }
}
function setupScenario(sku,kind){
  state.selected=sku;
  state.tab='simulator';
  simInput=null;
  const i=selectedItem();
  if(kind&&i?.simulation){
    const b=i.simulation;
    simErr={
    };
    simDraft={
    };
    simInput={
      ...b,volumeDown:10,volumeUp:10,driver:kind==='channel'?'margin':'price',desired:null
    };
    if(kind==='cost')simInput.c=Math.floor(b.c*.95);
    if(kind==='channel')simInput.goal='channel';
  }
  render();
  $('main').focus();
}
function bindView(){
  document.querySelectorAll('[data-investigate]').forEach(b=>b.onclick=()=>choose(b.dataset.investigate,'diagnostic'));
  document.querySelectorAll('[data-simulate]').forEach(b=>b.onclick=()=>setupScenario(b.dataset.simulate,b.dataset.setup));
  document.querySelector('[data-clear]')?.addEventListener('click',resetFilters);
  $('signal-order')?.addEventListener('change',e=>{
    state.order=e.target.value;
    render();
  });
  $('chart-grain')?.addEventListener('change',e=>{
    state.grain=e.target.value;
    render();
  });
  $('group')?.addEventListener('change',e=>{
    state.group=e.target.value;
    render();
  });
  $('detail-sku')?.addEventListener('change',e=>{
    state.selected=e.target.value;
    simInput=null;
    render();
  });
  $('test-barrier')?.addEventListener('click',runBarrier);
  $('barrier-case')?.addEventListener('change',()=>{
    $('barrier-result').textContent='';
  });
  if(state.tab!=='simulator'||!simInput)return;
  const map={
    p:100,c:100,q:1,t:100,m:100,revenue:100,channel:100,down:1,up:1
  };
  for(const [key,mult] of Object.entries(map))$('sim-'+key)?.addEventListener('input',e=>{
    const v=e.target.valueAsNumber;
    simDraft[key]=e.target.value;
    const ok=Number.isFinite(v)&&Math.abs(v*mult-Math.round(v*mult))<1e-6;
    simErr[key]=!ok?(e.target.value===''?'Informe um valor.':mult===1?'Use um número inteiro.':'Use no máximo 2 casas decimais.'):'';
    if(ok){
      const value=Math.round(v*mult);
      if(key==='revenue'||key==='channel'){
        setDriver(key,value);
      }else if(key==='down'||key==='up')simInput[key==='down'?'volumeDown':'volumeUp']=value;
      else simInput[key]=value;
      if(key==='p'||key==='m'){
        setDriver(key==='p'?'price':'margin');
      }
    }updateSimulation(key);
  });
  $('sim-goal').onchange=e=>{
    simInput.goal=e.target.value;
    setDriver('margin');
    updateSimulation();
  };
  $('price-range').oninput=e=>{
    simInput.p=Math.round(+e.target.value*100);
    setDriver('price');
    simErr.p='';
    delete simDraft.p;
    updateSimulation();
  };
  $('use-reference').onclick=()=>{
    setDriver('margin');
    simErr.p='';
    delete simDraft.p;
    updateSimulation();
  };
  $('reset-sim').onclick=()=>{
    simInput=null;
    render();
  };
  $('copy-scenario').onclick=async()=>{
    if(!lastScenario)return;
    const text=lastScenario,version=copyGeneration,button=$('copy-scenario');
    button.disabled=true;
    try{
      if(!navigator.clipboard?.writeText)throw Error('Cópia indisponível');
      await navigator.clipboard.writeText(text);
      if(version!==copyGeneration||!button.isConnected)return;
      setScenarioPanel(false,false);
      $('copy-message').textContent='Cenário copiado. Pronto para compartilhar.';
      $('copy-status').hidden=false;
      button.textContent='Copiado ✓';
      copyTimer=setTimeout(()=>{
        if(version===copyGeneration&&button.isConnected){
          $('copy-status').hidden=true;
          button.textContent='Copiar cenário';
        }
      },4000);
    }
    catch(e){
      if(version!==copyGeneration||!button.isConnected)return;
      setScenarioPanel(true);
      $('copy-message').textContent='A cópia automática não está disponível. Selecione o resumo e use Ctrl+C ou Copiar.';
      $('copy-status').hidden=false;
      $('scenario-text').focus();
      $('scenario-text').select?.();
    }
    finally{
      if(version===copyGeneration&&button.isConnected)button.disabled=false;
    }
  };
  $('show-scenario').onclick=()=>setScenarioPanel($('scenario-panel').hidden);
  $('close-scenario').onclick=()=>setScenarioPanel(false);
  $('dismiss-copy').onclick=()=>{
    $('copy-status').hidden=true;
    clearTimeout(copyTimer);
    $('copy-scenario').textContent='Copiar cenário';
    $('copy-scenario').focus();
  };
  $('scenario-panel').onkeydown=e=>{
    if(e.key==='Escape'){
      e.preventDefault();
      setScenarioPanel(false);
    }
  };
  updateSimulation();
}
function available(){
  return snapshot().items.filter(i=>i.current.count&&(!state.category||i.category===state.category)&&(!state.type||i.type===state.type));
}
function reconcile(){
  const snap=snapshot(),cats=new Set(snap.items.filter(i=>i.current.count).map(i=>i.category));
  if(state.category&&!cats.has(state.category)){
    state.category='';
    filterMessage='A categoria foi removida porque não tem movimento no novo período.';
  }const types=new Set(snap.items.filter(i=>i.current.count&&(!state.category||i.category===state.category)).map(i=>i.type));
  if(state.type&&!types.has(state.type)){
    state.type='';
    filterMessage='O tipo foi removido porque não tem produtos disponíveis neste recorte.';
  }if(state.sku&&!available().some(i=>i.sku===state.sku)){
    state.sku='';
    filterMessage='O produto anterior não pertence ao novo recorte. Exibindo todos os produtos disponíveis.';
  }const valid=selectedItems().filter(i=>i.current.count);
  if(!valid.some(i=>i.sku===state.selected)){
    state.selected=valid[0]?.sku||'';
    simInput=null;
  }
}
let suggestionIndex=-1,suggestions=[];
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function closeSuggestions(){
  $('sku-list').hidden=true;
  $('sku-search').setAttribute('aria-expanded','false');
  $('sku-search').removeAttribute('aria-activedescendant');
  suggestionIndex=-1;
}
function selectSku(sku){
  state.sku=sku;
  state.selected=sku;
  simInput=null;
  closeSuggestions();
  filterMessage='';
  render();
  $('sku-search').focus();
}
function suggest(){
  const q=fold($('sku-search').value.trim());
  suggestions=available().filter(i=>fold(i.sku+' '+i.name).includes(q));
  suggestionIndex=-1;
  $('sku-list').hidden=false;
  $('sku-search').setAttribute('aria-expanded','true');
  $('sku-search').removeAttribute('aria-activedescendant');
  $('sku-list').innerHTML=suggestions.map((i,n)=>`<li id="sku-option-${n}" role="option" aria-selected="false" data-option="${esc(i.sku)}"><strong>${esc(i.name)}</strong><small>${i.sku} · ${esc(i.category)} · ${esc(i.type)}</small></li>`).join('')||'<li class="no-option" role="presentation">Nenhum produto corresponde à busca neste recorte.</li>';
  document.querySelectorAll('[data-option]').forEach(el=>el.onmousedown=e=>{
    e.preventDefault();
    selectSku(el.dataset.option);
  });
  document.querySelectorAll('[data-option]').forEach(el=>el.onclick=()=>selectSku(el.dataset.option));
}
function sync(){
  $('date-start').value=state.start;
  $('date-end').value=state.end;
  const items=snapshot().items,cat=Array.from(new Set(items.filter(i=>i.current.count).map(i=>i.category))).sort();
  $('category').innerHTML='<option value="">Todas as categorias</option>'+cat.map(c=>`<option value="${esc(c)}" ${c===state.category?'selected':''}>${esc(c)}</option>`).join('');
  $('category').value=state.category;
  document.querySelectorAll('[data-type]').forEach(b=>{
    const n=items.filter(i=>i.current.count&&i.type===b.dataset.type&&(!state.category||i.category===state.category)).length;
    b.setAttribute('aria-pressed',String(state.type===b.dataset.type));
    b.disabled=!n;
    b.innerHTML=esc(b.dataset.type)+` <span>${n}</span>`;
  });
  $('type-caption').textContent=state.type?'Clique novamente para mostrar todos':'Nenhum ativo = todos os tipos';
  const selected=items.find(i=>i.sku===state.sku);
  $('sku-search').value=selected?selected.name+' · '+selected.sku:'';
  $('clear-sku').hidden=!state.sku;
  $('sku-caption').textContent=state.sku?'Produto selecionado em todas as abas':available().length+' produtos disponíveis · digite para buscar';
  closeSuggestions();
  $('selection-count').textContent=selectedItems().filter(i=>i.current.count).length+' produtos com movimento';
  $('date-error').hidden=true;
  for(const id of ['date-start','date-end'])$(id).setAttribute('aria-invalid','false');
}
function render(){
  try{
    invalidateCopy();
    if(!titles[state.tab])state.tab='executive';
    if(!['category','type','sku'].includes(state.group))state.group='category';
    reconcile();
    sync();
    $('page-title').textContent=titles[state.tab][0];
    $('subtitle').textContent=titles[state.tab][1];
    document.querySelectorAll('[data-tab]').forEach(b=>{
      b.classList.toggle('active',b.dataset.tab===state.tab);
      b.setAttribute('aria-current',b.dataset.tab===state.tab?'page':'false');
    });
    $('period-note').textContent='Entre '+date(state.start)+' e '+date(state.end)+' · '+(state.category||'Todas as categorias')+' · '+(state.type||'Todos os tipos')+' · filtros mantidos ao trocar de aba.';
    $('notice').innerHTML=filterMessage?notice(esc(filterMessage),'good'):'';
    const items=selectedItems();
    $('view').innerHTML=!items.some(i=>i.current.count)?empty():state.tab==='executive'?executive(items):state.tab==='diagnostic'?diagnostic(items):simulator(items);
    bindView();
    window.GuardianWorkflow?.bind();
    persist();
  }catch(e){
    $('view').innerHTML=notice('Não foi possível preparar esta seleção. Use Limpar filtros para restaurar a análise.','error');
    console.error(e);
  }
}
function changeDates(){
  const s=$('date-start').value,e=$('date-end').value;
  try{
    E.parse(s);
    E.parse(e);
    if(s>e)throw Error('A data inicial deve ser anterior ou igual à final.');
    if(s<D.raw.history_start||e>D.as_of)throw Error('Escolha datas entre '+date(D.raw.history_start)+' e '+date(D.as_of)+'.');
    state.start=s;
    state.end=e;
    simInput=null;
    filterMessage='';
    render();
  }catch(error){
    $('date-error').hidden=false;
    $('date-error').textContent=error.message+' A análise abaixo mantém o último intervalo válido.';
    for(const id of ['date-start','date-end'])$(id).setAttribute('aria-invalid','true');
  }
}
function resetFilters(){
  const tab=state.tab;
  state={
    ...initial,tab
  };
  simInput=null;
  filterMessage='';
  render();
}
function start(){
  if(!D||!M||!E)throw Error('Arquivos da demonstração ausentes');
  for(const id of ['date-start','date-end']){
    $(id).min=D.raw.history_start;
    $(id).max=D.as_of;
    $(id).onchange=changeDates;
  }
  $('category').onchange=e=>{
    state.category=e.target.value;
    simInput=null;
    filterMessage='';
    render();
  };
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{
    state.type=state.type===b.dataset.type?'':b.dataset.type;
    simInput=null;
    filterMessage='';
    render();
  });
  $('sku-search').oninput=suggest;
  $('sku-search').onfocus=()=>{
    if(!state.sku)suggest();
  };
  $('sku-search').onkeydown=e=>{
    if(e.key==='Escape'){
      closeSuggestions();
      return;
    }if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      if($('sku-list').hidden)suggest();
      if(!suggestions.length)return;
      suggestionIndex=(suggestionIndex+(e.key==='ArrowDown'?1:-1)+suggestions.length)%suggestions.length;
      document.querySelectorAll('[data-option]').forEach((el,n)=>el.setAttribute('aria-selected',String(n===suggestionIndex)));
      $('sku-search').setAttribute('aria-activedescendant','sku-option-'+suggestionIndex);
    }if(e.key==='Enter'&&!$('sku-list').hidden){
      e.preventDefault();
      if(suggestions.length)selectSku(suggestions[Math.max(0,suggestionIndex)].sku);
    }
  };
  $('sku-search').onblur=e=>{
    if(!e.relatedTarget||!$('sku-list').contains(e.relatedTarget)){
      closeSuggestions();
      const i=snapshot().items.find(i=>i.sku===state.sku);
      $('sku-search').value=i?i.name+' · '+i.sku:'';
    }
  };
  $('clear-sku').onclick=()=>{
    state.sku='';
    simInput=null;
    filterMessage='';
    render();
  };
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
    state.tab=b.dataset.tab;
    filterMessage='';
    render();
  });
  $('reset').onclick=resetFilters;
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
    state.end=D.as_of;
    state.start=b.dataset.preset==='month'?D.as_of.slice(0,7)+'-01':b.dataset.preset==='year'?D.as_of.slice(0,4)+'-01-01':E.add(D.as_of,-89);
    if(state.start<D.raw.history_start)state.start=D.raw.history_start;
    simInput=null;
    filterMessage='';
    render();
  });
  render();
}
try{
  start();
  window.GuardianWorkflow?.mount();
}catch(e){
  console.error(e);
  $('view').innerHTML=notice('Arquivos incompletos. Extraia o ZIP inteiro e abra ABRIR_DEMONSTRACAO.html.','error');
}
