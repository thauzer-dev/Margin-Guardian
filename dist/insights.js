/* Explicações e gráficos derivados exclusivamente dos agregados auditáveis. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'?require('./math.js'):root.GuardianMath;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const pct=v=>v==null?'Indisponível':(v*100).toLocaleString('pt-BR',{
    maximumFractionDigits:1
  })+'%';
  const pp=v=>(v>0?'+':'')+(v*100).toLocaleString('pt-BR',{
    maximumFractionDigits:1
  })+' pp';
  const money=v=>(v/100).toLocaleString('pt-BR',{
    style:'currency',currency:'BRL'
  });
  function classify(i){
    const a=i.current,b=i.three,c=i.year, bad=x=>x.margin<0||x.gap>0;
    if(a.margin!=null&&a.margin>=0&&a.target_revenue!==a.eligible_revenue)return {label:'Meta sem cobertura completa',action:'Completar a meta antes de classificar o atendimento.'};
    if(a.margin==null)return {
      label:'Sem CMV elegível',action:'Corrigir o custo antes do diagnóstico.'
    };
    if(!i.reference_complete?.three||!i.reference_complete?.year||b.margin==null||c.margin==null)return {
      label:'Histórico insuficiente',action:'Completar as referências antes de classificar a persistência.'
    };
    if([a,b,c].some(x=>x.coverage<.95))return {
      label:'Cobertura limitada',action:'A cobertura de CMV inferior a 95% limita a comparação.'
    };
    if(!bad(a))return {
      label:bad(b)||bad(c)?'Em recuperação':'Sem desvio atual',action:'Monitorar a sustentação da margem e a cobertura da meta.'
    };
    if(Math.abs(a.margin-b.margin)<=.01&&Math.abs(a.margin-c.margin)<=.01)return {
      label:'Crônico',action:'Rever estrutura de preço, custo e canal; o desvio persiste nas referências.'
    };
    if(a.margin-b.margin<=-.03&&a.margin-c.margin<=-.03)return {
      label:'Deterioração nova',action:'Investigar o que mudou em compra, preço e composição; a queda supera 3 pp nas duas referências.'
    };
    if(bad(b)||bad(c))return {
      label:'Recorrente',action:'Rever episódios anteriores e separar persistência de oscilação.'
    };
    return {
      label:'Desvio atual',action:'Investigar o desvio sem concluir persistência ou mudança estrutural.'
    };
  }
  function rank(items,order='severity'){
    const severity={
      'Crítico':3,'Alto':2,'Moderado':1
    };
    const delta=i=>i.reference_complete?.three&&i.current.margin!=null&&i.three.margin!=null?i.current.margin-i.three.margin:Infinity;
    return items.slice().sort((a,b)=>(order==='gap'?(b.current.gap??-1)-(a.current.gap??-1):order==='change'?delta(a)-delta(b):(severity[b.severity]||0)-(severity[a.severity]||0))||(b.current.gap??-1)-(a.current.gap??-1)||a.sku.localeCompare(b.sku));
  }
  function pareto(items){
    const rows=items.filter(i=>i.current.gap>0).sort((a,b)=>b.current.gap-a.current.gap);
    const total=rows.reduce((s,i)=>s+i.current.gap,0);
    let sum=0;
    return {
      total,rows:rows.map(i=>{
        sum+=i.current.gap;
        return {
          sku:i.sku,name:i.name,gap:i.current.gap,share:sum/total
        };
      })
    };
  }
  function summary(items,dc){
    const a=M.aggregate(items.map(i=>i.current)),p=pareto(items),n=p.rows.findIndex(i=>i.share>=.8)+1;
    const labels={
      price:'preço líquido',cost:'CMV unitário',mix:'mix',entry:'entrada de SKUs'
    };
    let text=a.margin==null?'Não há margem elegível para resumir.':`Margem realizada de ${pct(a.margin)}.`;
    if(dc){
      const pressure=Object.entries(dc.effects).sort((a,b)=>a[1]-b[1])[0];
      text+=` Variação de ${pp(dc.total)} contra os três meses anteriores.`;
      if(pressure[1]<0)text+=` Maior pressão matemática: ${labels[pressure[0]]} (${pp(pressure[1])}).`;
    }
    else text+=' Comparação de efeitos indisponível neste recorte.';
    if(n)text+=` ${n} de ${p.rows.length} SKUs concentram ao menos 80% do gap positivo (${money(p.total)} no total).`;
    return text;
  }
  function waterfall(dc){
    const values=[['Referência',dc.margin_ref,null],['Preço',dc.effects.price,'effect'],['CMV',dc.effects.cost,'effect'],['Mix',dc.effects.mix,'effect'],['Entrada',dc.effects.entry,'effect'],['Atual',dc.margin_cur,null]];
    let running=dc.margin_ref;
    const bars=values.map(([label,v,type])=>{
      const from=type?running:0,to=type?running+v:v;
      if(type)running=to;
      return {
        label,v,from,to,type
      };
    });
    const min=Math.min(0,...bars.flatMap(b=>[b.from,b.to])),max=Math.max(0,...bars.flatMap(b=>[b.from,b.to])),span=max-min||1;
    const y=v=>190-(v-min)/span*145;
    return `<div class="chart-scroll"><svg class="waterfall" viewBox="0 0 580 245" role="img" aria-label="Cascata: margem de referência, efeitos de preço, CMV, mix e entrada, margem atual"><line x1="25" y1="${y(0)}" x2="560" y2="${y(0)}" stroke="#888"/>${bars.map((b,i)=>{const x=32+i*90;return `<rect x="${x}" y="${Math.min(y(b.from),y(b.to))}" width="60" height="${Math.max(1,Math.abs(y(b.from)-y(b.to)))}" fill="${!b.type?'#224b60':b.v<0?'#ad4145':'#087f71'}"/><text x="${x+30}" y="${Math.min(y(b.from),y(b.to))-8}" text-anchor="middle">${
      esc(b.type?pp(b.v):pct(b.v))
    }</text><text x="${x+30}" y="225" text-anchor="middle">${
      b.label
    }</text>${
      i<5?`<line x1="${x+60}" y1="${y(b.to)}" x2="${x+90}" y2="${y(b.to)}" stroke="#888" stroke-dasharray="3 3"/>`:''
    }`;}).join('')}</svg></div><p class="small">${values.map(([n,v,t])=>`${
      n
    }: ${
      t?pp(v):pct(v)
    }`).join(' · ')}</p>`;
  }
  function paretoChart(p){
    if(!p.rows.length)return '';
    const n=p.rows.length,w=Math.max(570,n*45),max=Math.max(...p.rows.map(r=>r.gap)),step=(w-80)/n;
    return `<div class="chart-scroll"><svg viewBox="0 0 ${w} 220" style="min-width:${w}px" class="pareto-chart" role="img" aria-label="Barras de gap e linha da participação acumulada; valores na tabela"><text x="15" y="18">Gap máximo ${money(max)} · linha: participação acumulada</text><line x1="35" x2="${w-20}" y1="68" y2="68" stroke="#976318" stroke-dasharray="4 4"/><text x="35" y="62">80%</text>${p.rows.map((r,i)=>`<rect x="${40+i*step}" y="${180-r.gap/max*140}" width="${step*.65}" height="${r.gap/max*140}" fill="#224b60"><title>${esc(r.sku)}: ${money(r.gap)}</title></rect>${i%Math.max(1,Math.ceil(n/10))===0?`<text x="${40+i*step}" y="205">${esc(r.sku)}</text>`:''}`).join('')}<polyline points="${p.rows.map((r,i)=>`${40+i*step+step*.325},${180-r.share*140}`).join(' ')}" stroke="#976318" stroke-width="2" fill="none"/></svg></div>`;
  }
  function sparkline(values){
    const valid=values.filter(v=>v!=null);if(!valid.length)return '';
    const min=Math.min(...valid),span=Math.max(...valid)-min||.01;let segments=[],current=[];
    values.forEach((v,i)=>{if(v==null){if(current.length)segments.push(current);current=[];}else current.push(`${5+i*10},${35-(v-min)/span*25}`);});if(current.length)segments.push(current);
    return `<svg viewBox="0 0 125 42" width="125" height="42" role="img" aria-label="Tendência de margem em 12 meses; escala local, valores nas células">${segments.map(s=>`<polyline points="${s.join(' ')}" stroke="#087f71" stroke-width="2" fill="none"/>`).join('')}</svg>`;
  }
  function categoryBullets(items){
    const cats=[...new Set(items.map(i=>i.category))];
    return `<section class="card"><h3>Margem e meta coberta por categoria</h3><p class="small">Barra: margem realizada · traço: meta ponderada nas linhas cobertas. A cobertura da meta aparece ao lado.</p>${cats.map(cat=>{const a=M.aggregate(items.filter(i=>i.category===cat).map(i=>i.current)),target=a.target_revenue>0?a.target_value/a.target_revenue:null;if(a.margin==null)return `<p>${esc(cat)}: margem indisponível.</p>`;const lo=Math.min(0,a.margin,target??0),hi=Math.max(.01,a.margin,target??0),x=v=>10+(v-lo)/(hi-lo)*300;return `<div class="bullet"><strong>${esc(cat)}</strong><svg viewBox="0 0 330 38" role="img" aria-label="Margem ${pct(a.margin)} e meta ${pct(target)}"><line x1="10" y1="20" x2="310" y2="20" stroke="#dce2e8" stroke-width="18"/><rect x="${Math.min(x(0),x(a.margin))}" y="12" width="${Math.abs(x(a.margin)-x(0))}" height="16" fill="${a.margin<0?'#ad4145':'#087f71'}"/>${target!=null?`<line x1="${x(target)}" x2="${x(target)}" y1="5" y2="35" stroke="#243b53" stroke-width="3"/>`:''}</svg><span>Margem ${pct(a.margin)} · meta ${pct(target)} · cobertura ${a.eligible_revenue>0?pct(a.target_revenue/a.eligible_revenue):'—'}</span></div>`;}).join('')}</section>`;
  }

  function analytics(items,monthly){
    const p=pareto(items),cats=[...new Set(items.map(i=>i.category))];
    const eligible=items.filter(i=>i.current.margin!=null&&i.current.eligible_quantity>0&&i.current.eligible_revenue>0);
    const maxPrice=Math.max(1,...eligible.map(i=>i.current.eligible_revenue/i.current.eligible_quantity)),minMargin=Math.min(0,...eligible.map(i=>i.current.margin)),maxMargin=Math.max(.01,...eligible.map(i=>i.current.margin)),maxRev=Math.max(1,...eligible.map(i=>i.current.eligible_revenue));
    const y=v=>195-(v-minMargin)/(maxMargin-minMargin)*160;
    return `<div class="grid equal"><section class="card"><h3>Concentração do gap positivo</h3><p class="small">Gaps por SKU, sem compensar superávits. Receita e lucro não são o gap.</p>${paretoChart(p)}<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Gap</th><th>Acumulado</th></tr></thead><tbody>${p.rows.map(i=>`<tr><td>${
      esc(i.sku)
    }<small>${
      esc(i.name)
    }</small></td><td>${
      money(i.gap)
    }</td><td><meter min="0" max="1" value="${i.share}">${
      pct(i.share)
    }</meter> ${
      pct(i.share)
    }</td></tr>`).join('')||'<tr><td colspan="3">Sem gap positivo.</td></tr>'}</tbody></table></div></section><section class="card"><h3>Preço unitário × margem</h3><p class="small">Bolha proporcional à receita elegível. Categorias e metas diferentes: não há uma meta única.</p><div class="chart-scroll"><svg viewBox="0 0 570 245" class="scatter" role="img" aria-label="Dispersão de preço e margem; valores exatos na tabela"><line x1="50" y1="195" x2="540" y2="195" stroke="#777"/><line x1="50" y1="30" x2="50" y2="195" stroke="#777"/><text x="15" y="30">${pct(maxMargin)}</text><text x="10" y="210">${pct(minMargin)}</text><text x="65" y="235">Preço líquido / unidade →</text><text x="500" y="235">${money(maxPrice)}</text>${eligible.map(i=>`<circle tabindex="0" cx="${65+i.current.eligible_revenue/i.current.eligible_quantity/maxPrice*455}" cy="${y(i.current.margin)}" r="${3+18*Math.sqrt(i.current.eligible_revenue/maxRev)}" fill="#087f71" fill-opacity=".45" stroke="#224b60"><title>${
      esc(i.sku)
    } · ${
      money(i.current.eligible_revenue/i.current.eligible_quantity)
    } · ${
      pct(i.current.margin)
    }</title></circle>`).join('')}</svg></div><details><summary>Valores por SKU</summary><table><thead><tr><th>SKU</th><th>Preço</th><th>Margem</th><th>Meta coberta</th></tr></thead><tbody>${eligible.map(i=>`<tr><td>${
      esc(i.sku)
    }</td><td>${
      money(i.current.eligible_revenue/i.current.eligible_quantity)
    }</td><td>${
      pct(i.current.margin)
    }</td><td>${
      i.current.target_revenue>0?pct(i.current.target_value/i.current.target_revenue):'Sem meta'
    }</td></tr>`).join('')}</tbody></table></details></section></div><section class="card"><h3>Onde a margem mudou nos últimos 12 meses</h3><p class="small">Meses civis até o fim selecionado; último mês pode ser parcial. Mesmos filtros de produtos. Células mostram valores, além da cor.</p><div class="table-wrap"><table><thead><tr><th>Categoria</th>${monthly.map(m=>`<th>${
      esc(m.label)
    }</th>`).join('')}</tr></thead><tbody>${cats.map(cat=>`<tr><th>${
      esc(cat)
    }${sparkline(monthly.map(m=>M.aggregate(m.items.filter(i=>i.category===cat).map(i=>i.current)).margin))}</th>${
      monthly.map(m=>{
        const a=M.aggregate(m.items.filter(i=>i.category===cat).map(i=>i.current));
        return `<td style="background:${a.margin==null?'#eee':a.margin<0?'#f8dfe0':a.gap>0?'#fff0d7':'#dcefe8'}">${pct(a.margin)}</td>`;
      }).join('')
    }</tr>`).join('')}</tbody></table></div></section>${categoryBullets(items)}`;
  }
  const api={
    classify,rank,pareto,summary,waterfall,analytics
  };
  if(typeof module!=='undefined')module.exports=api;
  root.GuardianInsights=api;
})(typeof window==='undefined'?globalThis:window);
