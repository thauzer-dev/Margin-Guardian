/* Mesma fórmula do motor Python; centavos e pontos-base. Sem dependências. */
(function(root){
  'use strict';
  const sums=['revenue','eligible_revenue','cmv','quantity','eligible_quantity','target_value','target_revenue','target_gross','discount','commission','count','eligible_count','abs_revenue','abs_covered'];
  function integer(v,n,min,max){
    if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(n+' fora do intervalo permitido.');
  }
  function simulate({
    p,c,q,t=0,m=3000,goal='gross'
  }){
    integer(p,'Preço',1,100000000);
    integer(c,'Custo',0,100000000);
    integer(q,'Quantidade',0,1000000);
    integer(t,'Comissão',0,9999);
    integer(m,'Meta',0,9999);
    if(!['gross','channel'].includes(goal))throw Error('Escolha meta bruta ou pós-canal.');
    const den=10000-m-(goal==='channel'?t:0);
    if(den<=0)throw Error('Comissão + meta pós-canal devem somar menos de 100%.');
    const revenue=p*q,cmv=c*q;
    if(Math.max(revenue,cmv)>100000000000)throw Error('Cenário excede o limite de cálculo exato.');
    const commission=Math.floor((revenue*t+5000)/10000);
    return {
      revenue,cmv,gross:revenue-cmv,commission,channel:revenue-cmv-commission,gross_margin:(p-c)/p,channel_margin:(p*(1-t/10000)-c)/p,reference_price:Math.ceil(c*10000/den),version:'cents-bps-v1'
    };
  }
  // Menor preço em centavos que atinge um total; considera comissão arredondada.
  function priceForAmount(input,amount,kind='revenue'){
    if(!['revenue','channel'].includes(kind))throw Error('Escolha receita líquida ou resultado pós-comissão.');
    integer(amount,'Valor desejado',kind==='revenue'?1:-100000000000,100000000000);
    const s={
      ...input
    };
    simulate(s);
    if(s.q===0)throw Error('Informe volume maior que zero para definir um valor total.');
    let low=1,high=Math.min(100000000,Math.floor(100000000000/s.q));
    const value=p=>simulate({
      ...s,p
    })[kind];
    if(amount<value(low)||amount>value(high))throw Error('Valor desejado fora do intervalo alcançável com estas premissas.');
    while(low<high){
      const mid=Math.floor((low+high)/2);
      if(value(mid)>=amount)high=mid;
      else low=mid+1;
    }
    return {
      price:low,achieved:value(low),difference:value(low)-amount
    };
  }
  function aggregate(items){
    const a=Object.fromEntries(sums.map(k=>[k,items.reduce((s,x)=>s+x[k],0)]));
    a.gross=a.eligible_count?a.eligible_revenue-a.cmv:null;
    a.margin=a.eligible_revenue>0?a.gross/a.eligible_revenue:null;
    a.coverage=a.abs_revenue?a.abs_covered/a.abs_revenue:null;
    a.gap=a.target_revenue>0?Math.max(0,a.target_value-a.target_gross):null;
    return a;
  }
  function validateNarrative(r,facts,period){
    const keys=['fact_id','period','insight_type','hypothesis','action_code','caveat'];
    if(!facts||!Object.keys(facts).length)throw Error('Sem evidência financeira elegível');
    if(!r||typeof r!=='object'||Object.keys(r).length!==keys.length||keys.some(k=>typeof r[k]!=='string'))throw Error('Esquema inválido ou números/prosa não autorizados');
    const f=facts[r.fact_id];
    if(!f)throw Error('ID de evidência inexistente');
    if(r.period!==period||f.period!==period)throw Error('Referência temporal incorreta');
    const policy={
      channel_loss:['channel_pressure','channel_result','review_channel'],history:['history_comparison','historical_context','inspect_history'],year:['year_comparison','annual_context','inspect_history'],on_target:['target_met','within_target','monitor'],cost:['cost_pressure','coincidence','review_purchase'],negative:['negative_margin','recorded_result','simulate_price'],target:['below_target','target_gap','simulate_price'],price:['price_drop','observed_price','review_discount']
    };
    if([r.insight_type,r.hypothesis,r.action_code].some((v,i)=>v!==policy[f.kind][i]))throw Error('Relação semântica, causalidade ou ação não autorizada');
    if(r.caveat!=='scenario_not_forecast')throw Error('Ressalva obrigatória ausente');
    return r;
  }
  const api={
    simulate,aggregate,validateNarrative,priceForAmount
  };
  if(typeof module!=='undefined')module.exports=api;
  root.GuardianMath=api;
})(typeof window==='undefined'?globalThis:window);
