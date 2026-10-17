/* Motor de intervalos locais. Paridade com guardian/engine.py verificada por fixtures.
   Recebe somente dados já validados pelo build Python; não é importador de dados. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'?require('./math.js'):root.GuardianMath;
  const DAY=86400000, iso=d=>d.toISOString().slice(0,10);
  function parse(s){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Informe uma data válida.');
    const d=new Date(s+'T00:00:00Z');
    if(!Number.isFinite(+d)||iso(d)!==s)throw Error('Informe uma data válida.');
    return d;
  }
  function add(s,n){
    return iso(new Date(+parse(s)+n*DAY));
  }
  function yearBefore(s){
    const d=parse(s),y=d.getUTCFullYear()-1,m=d.getUTCMonth();
    return iso(new Date(Date.UTC(y,m,Math.min(d.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate()))));
  }
  function windows(start,end){
    const s=parse(start),e=parse(end);
    if(e<=s)throw Error('A data inicial deve ser anterior ou igual à final.');
    const first=new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),1));
    return {
      current:[start,end],previous:[iso(new Date(+s-(e-s))),start],year:[yearBefore(start),add(yearBefore(add(end,-1)),1)],three:[iso(new Date(Date.UTC(s.getUTCFullYear(),s.getUTCMonth()-3,1))),iso(first)]
    };
  }
  // Fim exclusivo. O terceiro bloco inclui todos os dias restantes do mês.
  function buckets(start,end){
    const win=windows(start,end),last=add(end,-1),daily=start.slice(0,7)===last.slice(0,7),out=[];
    let a=start;
    while(a<end){
      const d=parse(a),y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();
      const boundary=daily?add(a,1):day<=10?iso(new Date(Date.UTC(y,m,11))):day<=20?iso(new Date(Date.UTC(y,m,21))):iso(new Date(Date.UTC(y,m+1,1)));
      const b=boundary<end?boundary:end,stamp=add(b,-1),months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      out.push({
        start:a,end:b,label:Number(stamp.slice(8))+' de '+months[parse(stamp).getUTCMonth()]+(start.slice(0,4)!==last.slice(0,4)?'/'+stamp.slice(2,4):''),grain:daily?'day':'ten_days'
      });
      a=b;
    }
    return out;
  }
  const half=(n,d)=>Math.sign(n)*Math.floor((Math.abs(n)+Math.floor(d/2))/d);
  function atom(r){
    const a={
      revenue:r.revenue,quantity:r.quantity,count:1,abs_revenue:Math.abs(r.revenue),discount:r.discount,eligible_revenue:0,cmv:0,eligible_quantity:0,eligible_count:0,abs_covered:0,commission:0,target_value:0,target_revenue:0,target_gross:0
    };
    if(r.eligible){
      Object.assign(a,{
        eligible_revenue:r.revenue,cmv:r.cmv,eligible_quantity:r.quantity,eligible_count:1,abs_covered:Math.abs(r.revenue),commission:half(r.revenue*r.channel_bps,10000)
      });
      if(r.target_bps!=null)Object.assign(a,{
        target_value:half(r.revenue*r.target_bps,10000),target_revenue:r.revenue,target_gross:r.revenue-r.cmv
      });
    }return a;
  }
  // A identidade de uma linha de compra é global, não limitada ao SKU/recorte.
  function purchaseIndex(raw){
    const products=new Set(raw.products.map(p=>p.sku)),counts=new Map(),rows=new Map(),issues=new Map();
    for(const r of raw.purchases||[])if(r&&typeof r.id==='string'&&r.id.trim())counts.set(r.id,(counts.get(r.id)||0)+1);
    for(const value of raw.purchases||[]){
      const r=value&&typeof value==='object'&&!Array.isArray(value)?value:{
      },reasons=[];
      const duplicate=typeof r.id==='string'&&(counts.get(r.id)||0)>1;
      if(typeof r.id!=='string'||!r.id.trim())reasons.push('ID de compra ausente ou inválido');
      if(duplicate)reasons.push('Compra com chave duplicada na base');
      if(typeof r.sku!=='string'||!products.has(r.sku))reasons.push('SKU da compra não cadastrado');
      let date_valid=false;
      try{
        date_valid=typeof r.date==='string'&&iso(parse(r.date))===r.date;
      }catch(e){
      }
      if(!date_valid)reasons.push('Data da compra inválida');
      if(!Number.isSafeInteger(r.cost)||r.cost<0||!Number.isSafeInteger(r.quantity)||r.quantity<=0)reasons.push('Custo ou quantidade da compra inválido');
      if(typeof r.unit!=='string'||!r.unit.trim())reasons.push('Unidade da compra ausente ou inválida');
      if(reasons.length){
        if(typeof r.sku==='string'){
          if(!issues.has(r.sku))issues.set(r.sku,[]);
          issues.get(r.sku).push({
            date:r.date,date_valid,duplicate,reasons
          });
        }
      }
      else {
        if(!rows.has(r.sku))rows.set(r.sku,[]);
        rows.get(r.sku).push(r);
      }
    }
    for(const list of rows.values())list.sort(compareRows);
    return {
      rows,issues
    };
  }
  function compareRows(a,b){
    return a.date<b.date?-1:a.date>b.date?1:a.id<b.id?-1:a.id>b.id?1:0;
  }
  function purchase(index,p,end){
    const errors=(index.issues.get(p.sku)||[]).filter(e=>e.duplicate||!e.date_valid||e.date<end);
    if(errors.length)return {
      valid:false,reason:[...new Set(errors.flatMap(e=>e.reasons))].sort().join('; ')
    };
    const pair=(index.rows.get(p.sku)||[]).filter(r=>r.date<end).slice(-2);
    if(pair.some(r=>r.unit!==p.unit))return {
      valid:false,reason:'Unidades incompatíveis: comparação recusada (caixa × unidade).'
    };
    if(pair.length<2)return {
      valid:false,reason:'Sem duas compras comparáveis'
    };
    return {
      valid:true,previous:pair[0],current:pair[1],change:pair[0].cost>0?pair[1].cost/pair[0].cost-1:null
    };
  }
  const PRIORITY=['negative','channel_loss','target','cost','price','history','year','on_target'];
  const POLICY={
    channel_loss:['channel_pressure','channel_result','review_channel'],history:['history_comparison','historical_context','inspect_history'],year:['year_comparison','annual_context','inspect_history'],on_target:['target_met','within_target','monitor'],negative:['negative_margin','recorded_result','simulate_price'],target:['below_target','target_gap','simulate_price'],cost:['cost_pressure','coincidence','review_purchase'],price:['price_drop','observed_price','review_discount']
  };
  function selectNarrative(facts,period,prepared=[]){
    const byId=new Map();
    for(const r of prepared){
      if(byId.has(r.fact_id))throw Error('Narrativa preparada duplicada.');
      byId.set(r.fact_id,r);
    }
    const ordered=Object.values(facts).sort((a,b)=>PRIORITY.indexOf(a.kind)-PRIORITY.indexOf(b.kind)||(a.id<b.id?-1:a.id>b.id?1:0));
    const entries=ordered.map(f=>{
      let response=byId.get(f.id),mode=response?'prepared':'rules';
      if(!response){
        const [insight_type,hypothesis,action_code]=POLICY[f.kind];
        response={
          fact_id:f.id,period,insight_type,hypothesis,action_code,caveat:'scenario_not_forecast'
        };
      }M.validateNarrative(response,facts,period);
      return {
        mode,response
      };
    });
    return {
      ...(entries[0]||{
        mode:'quality',response:null
      }),facts,supporting:entries.slice(1)
    };
  }
  function narrative(i,period,prepared=[]){
    const c=i.current,p=i.purchase,facts={
    };
    function put(kind,values){
      const id=i.sku+'|'+period+'|'+kind;
      facts[id]={
        id,period,kind,values
      };
    }
    if(c.eligible_count&&c.margin!=null){
      if(c.margin<0)put('negative',{
        margin:c.margin,gross:c.gross,revenue:c.eligible_revenue
      });
      if(c.gross>=0&&c.gross-c.commission<0)put('channel_loss',{
        gross:c.gross,commission:c.commission,channel:c.gross-c.commission
      });
      if(c.gap)put('target',{
        gap:c.gap,margin:c.margin,target_value:c.target_value
      });
      if(p.valid&&p.change!=null&&i.alerts.includes('Alta de custo de compra'))put('cost',{
        previous:p.previous.cost,current:p.current.cost,change:p.change
      });
      if(i.alerts.includes('Queda de preço líquido'))put('price',{
        revenue:c.eligible_revenue,quantity:c.eligible_quantity,discount:c.discount
      });
    }
    if(c.eligible_count&&c.margin!=null){
      for(const [kind,key] of [['history','three'],['year','year']])if(i.reference_complete?.[key]&&i[key]?.margin!=null)put(kind,{
        margin:c.margin,reference:i[key].margin,delta:c.margin-i[key].margin,coverage:i[key].coverage
      });
      if(c.coverage===1&&c.target_revenue===c.eligible_revenue&&c.target_revenue>0&&c.gap===0&&c.margin>=0)put('on_target',{
        margin:c.margin,target:c.target_value/c.target_revenue,gross:c.gross
      });
    }
    return selectNarrative(facts,period,prepared);
  }
  function decompose(items,ref){
    const sums=k=>items.reduce((s,i)=>s+i[k].eligible_revenue,0),r1=sums('current'),r0=sums(ref);
    if(r1<=0||r0<=0)return null;
    // Devoluções líquidas e quantidade elegível nula não sustentam esta identidade unitária.
    if(items.some(i=>[i.current,i[ref]].some(a=>a.eligible_revenue<0||(a.eligible_revenue>0&&a.eligible_quantity<=0))))return null;
    const m1=items.reduce((s,i)=>s+(i.current.gross||0),0)/r1,m0=items.reduce((s,i)=>s+(i[ref].gross||0),0)/r0,effects={
      price:0,cost:0,mix:0,entry:0
    },by={
      price:[],cost:[],mix:[],entry:[]
    };
    for(const i of items){
      const a=i.current,b=i[ref],w1=a.eligible_revenue/r1,w0=b.eligible_revenue/r0,parts={
      };
      if(w0>0)parts.mix=(w1-w0)*(b.gross/b.eligible_revenue-m0);
      if(w1>0&&w0>0){
        const p1=a.eligible_revenue/a.eligible_quantity,c1=a.cmv/a.eligible_quantity,p0=b.eligible_revenue/b.eligible_quantity,c0=b.cmv/b.eligible_quantity;
        parts.price=w1*((1-c0/p1)-(1-c0/p0));
        parts.cost=w1*((1-c1/p1)-(1-c0/p1));
      }else if(w1>0)parts.entry=w1*(a.gross/a.eligible_revenue-m0);
      for(const [k,v]of Object.entries(parts)){
        effects[k]+=v;
        by[k].push({
          sku:i.sku,name:i.name,value:v
        });
      }
    }
    return {
      ref,margin_ref:m0,margin_cur:m1,total:m1-m0,effects,worst:Object.fromEntries(Object.entries(by).map(([k,v])=>[k,v.filter(x=>x.value<0).sort((a,b)=>a.value-b.value).slice(0,3)]))
    };
  }
  function create(D){
    const raw=D.raw,cache=new Map(),rows=new Map(raw.products.map(p=>[p.sku,[]])),buys=purchaseIndex(raw);
    for(const r of raw.sales)if(rows.has(r.sku))rows.get(r.sku).push({
      r,a:atom(r)
    });
    for(const list of rows.values())list.sort((a,b)=>compareRows(a.r,b.r));
    function analyze(start,end){
      const key=start+':'+end;
      if(cache.has(key))return cache.get(key);
      const win=windows(start,end),rules=raw.rules,complete=Object.fromEntries(Object.entries(win).map(([k,v])=>[k,v[0]>=raw.history_start&&v[1]<=add(raw.as_of,1)]));
      const period=start==='2026-10-01'&&end==='2026-10-14'?'2026-10':start+'/'+add(end,-1);
      const items=raw.products.map(p=>{
        const sets=Object.fromEntries(Object.entries(win).map(([k,v])=>[k,rows.get(p.sku).filter(x=>x.r.date>=v[0]&&x.r.date<v[1])]));
        const a=Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,M.aggregate(v.map(x=>x.a))])),cur=a.current,prev=a.previous,buy=purchase(buys,p,end),alerts=[],quality=[];
        if(cur.margin!=null){
          if(cur.margin<0)alerts.push('Margem negativa');
          else if(cur.gap>0)alerts.push('Abaixo da meta');
          if(complete.three&&a.three.margin!=null&&cur.margin-a.three.margin<=-rules.margin_drop)alerts.push('Queda histórica');
        }
        if(buy.valid&&buy.change!=null&&buy.change>=rules.cost_increase)alerts.push('Alta de custo de compra');
        const price=cur.eligible_quantity>0?cur.eligible_revenue/cur.eligible_quantity:null,oldprice=prev.eligible_quantity>0?prev.eligible_revenue/prev.eligible_quantity:null;
        if(price&&oldprice&&Math.abs(price/oldprice-1)<rules.price_stable&&alerts.includes('Alta de custo de compra'))alerts.push('Preço sem reação');
        if(price&&oldprice&&price/oldprice<1-rules.price_drop)alerts.push('Queda de preço líquido');
        if(cur.discount>0)alerts.push('Desconto registrado');
        if(cur.coverage!=null&&cur.coverage<1)quality.push('CMV parcial ou ausente');
        if(!buy.valid)quality.push(buy.reason);
        if(!a.three.count)quality.push('Sem histórico 3M');
        if(cur.count&&!cur.target_revenue)quality.push('Meta indisponível para linhas elegíveis');
        const latest=sets.current.at(-1)?.r,simulation=price&&cur.eligible_quantity>0?{
          p:half(cur.eligible_revenue,cur.eligible_quantity),c:half(cur.cmv,cur.eligible_quantity),q:cur.eligible_quantity,t:latest.channel_bps,m:latest.target_bps||0,goal:'gross'
        }:null;
        const item={
          ...p,...a,purchase:buy,alerts,quality,simulation,severity:cur.margin!=null&&cur.margin<0?'Crítico':cur.gap?'Alto':'Moderado',confidence:cur.coverage===1&&complete.three&&a.three.count&&buy.valid?'Alta':'Limitada',evidence_count:sets.current.length,source_ids:sets.current.map(x=>x.r.id),source_rows:sets.current.map(x=>x.r)
        };
        item.reference_complete=complete;
        item.narrative=narrative(item,period,D.prepared_responses||[]);
        return item;
      });
      const total=items.reduce((s,i)=>s+Math.max(0,i.current.eligible_revenue),0);
      for(const i of items){
        const impact=Math.max(i.current.gap||0,Math.max(0,-(i.current.gross||0)));
        if(i.severity==='Crítico'&&total>0&&impact*200<total)i.severity='Alto';
      }const out={
        items,windows:win,complete,period
      };
      cache.set(key,out);
      if(cache.size>64)cache.delete(cache.keys().next().value);
      return out;
    }
    return {
      analyze
    };
  }
  const api={
    create,windows,add,parse,decompose,atom,narrative,selectNarrative,buckets
  };
  if(typeof module!=='undefined')module.exports=api;
  root.GuardianEngine=api;
})(typeof window==='undefined'?globalThis:window);
