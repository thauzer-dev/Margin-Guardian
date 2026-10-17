/* CSV local v1. Centavos inteiros; bps inteiros. Sem upload ou dependências. */
(function(root){
  'use strict';
  const E=typeof module!=='undefined'?require('./engine.js'):root.GuardianEngine;
  const CONTRACT={
    products:['sku','name','category','type','unit'],sales:['id','date','sku','quantity','revenue','cmv','discount','channel_bps','unit','event'],purchases:['id','date','sku','quantity','cost','unit'],targets:['sku','bps','start','end']
  };
  function parseCSV(text){
    if(typeof text!=='string'||text.length>20*1024*1024)throw Error('Arquivo ausente ou acima de 20 MB.');
    text=text.replace(/^\uFEFF/,'');
    const line=text.split(/\r?\n/,1)[0];
    const sep=(line.match(/;/g)||[]).length>(line.match(/,/g)||[]).length?';':',';
    const rows=[];
    let row=[],cell='',quoted=false,closed=false;
    for(let i=0;
    i<=text.length;
    i++){
      const ch=text[i]??'\n';
      if(quoted){
        if(ch==='"'){
          if(text[i+1]==='"'){
            cell+='"';
            i++;
          }else{
            quoted=false;
            closed=true;
          }
        }else{
          if(i===text.length)throw Error('Aspas não fechadas no CSV.');
          cell+=ch;
        }continue;
      }
      if(ch==='"'&&!cell&&!closed){
        quoted=true;
        continue;
      }
      if(ch===sep||ch==='\n'||ch==='\r'){
        row.push(cell.trim());
        cell='';
        closed=false;
        if(ch!==sep){
          if(row.some(v=>v!==''))rows.push(row);
          row=[];
          if(ch==='\r'&&text[i+1]==='\n')i++;
        }continue;
      }
      if(closed)throw Error('Conteúdo após fechamento de aspas.');
      cell+=ch;
    }
    if(rows.length<1)throw Error('CSV vazio.');
    const headers=rows.shift();
    if(new Set(headers).size!==headers.length||headers.some(h=>!h))throw Error('Cabeçalhos vazios ou duplicados.');
    if(rows.length>50000)throw Error('Limite de 50 mil linhas por arquivo.');
    if(rows.some(r=>r.length!==headers.length))throw Error('Quantidade de colunas inconsistente. Confira separador e aspas.');
    return {
      headers,rows
    };
  }
  function mapRows(table,kind,mapping={
  }){
    const indexes=CONTRACT[kind].map(k=>table.headers.indexOf(mapping[k]||k));
    if(indexes.some(i=>i<0))throw Error('Mapeie todas as colunas de '+kind+'.');
    if(new Set(indexes).size!==indexes.length)throw Error('Uma coluna não pode preencher dois campos.');
    return table.rows.map(r=>Object.fromEntries(CONTRACT[kind].map((k,j)=>[k,r[indexes[j]]])));
  }
  function integer(v,field,optional=false){
    if(v==null||v===''){
      if(optional)return null;
      throw Error(field+': valor obrigatório');
    }
    if(!/^-?\d+$/.test(String(v)))throw Error(field+': use inteiro, sem moeda ou separador decimal');
    const n=Number(v);
    if(!Number.isSafeInteger(n)||Math.abs(n)>10000000000)throw Error(field+': valor fora do limite');
    return n;
  }
  function day(s){
    E.parse(s);
    if(s<'2000-01-01'||s>'2100-12-31')throw Error('Data fora de 2000–2100.');
    return s;
  }
  function counts(rows,key){
    const m=new Map();
    for(const r of rows)m.set(r[key],(m.get(r[key])||0)+1);
    return m;
  }
  function validate(input,coverage){
    if(Object.values(input).reduce((s,a)=>s+a.length,0)>55000)throw Error('Limite total de 55 mil linhas.');
    const issues=[],summary={
    },products=[],sales=[],purchases=[],targets=[],pcounts=counts(input.products,'sku');
    const reject=(kind,index,r,error)=>issues.push({
      table:kind,line:index+2,id:r.id||r.sku||'',sku:r.sku||'',reason:error.message||String(error),quarantined:true
    });
    if(!input.products.length||input.products.length>500)throw Error('Cadastre entre 1 e 500 produtos.');
    input.products.forEach((r,n)=>{
      try{
        if(CONTRACT.products.some(k=>!r[k]||r[k].length>200))throw Error('Produto: campos obrigatórios, máximo 200 caracteres.');
        if(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,63}$/.test(r.sku))throw Error('SKU: use até 64 letras ASCII, números, ponto, hífen, barra ou sublinhado.');
        if(!/^[A-Za-z0-9_.-]{1,20}$/.test(r.unit))throw Error('Unidade: use até 20 letras, números, ponto, hífen ou sublinhado.');
        if(pcounts.get(r.sku)>1)throw Error('SKU duplicado');
        if(!['Essencial','Especial'].includes(r.type))throw Error('Tipo deve ser Essencial ou Especial');
        products.push({
          ...r,story:''
        });
      }catch(e){
        reject('products',n,r,e);
      }
    });
    // Cadastro e metas ambíguos bloqueiam a análise; nunca escolher arbitrariamente.
    if(products.length!==input.products.length)throw Error('Cadastro de produtos inválido: '+issues.map(i=>`linha ${i.line}: ${i.reason}`).join('; '));
    const bySku=new Map(products.map(p=>[p.sku,p]));
    input.targets.forEach((r,n)=>{
      try{
        if(!bySku.has(r.sku))throw Error('SKU não cadastrado');
        const bps=integer(r.bps,'bps');
        day(r.start);
        day(r.end);
        if(r.start>=r.end||bps<0||bps>=10000)throw Error('Meta/vigência inválida; fim exclusivo');
        targets.push({
          ...r,bps
        });
      }catch(e){
        reject('targets',n,r,e);
      }
    });
    if(targets.length!==input.targets.length)throw Error('Metas inválidas: '+issues.map(i=>`linha ${i.line}: ${i.reason}`).join('; '));
    const byTarget=new Map();
    for(const t of targets){
      if(!byTarget.has(t.sku))byTarget.set(t.sku,[]);
      byTarget.get(t.sku).push(t);
    }
    for(const ts of byTarget.values()){
      ts.sort((a,b)=>a.start.localeCompare(b.start));
      if(ts.some((t,n)=>n&&ts[n-1].end>t.start))throw Error('Vigências de meta sobrepostas.');
    }
    const start=day(coverage.start),end=day(coverage.end);
    if(start>end)throw Error('Cobertura invertida.');
    let cancelled=0;
    for(const kind of ['sales','purchases']){
      const dup=counts(input[kind],'id');
      input[kind].forEach((r,n)=>{
        try{
          if(!r.id||dup.get(r.id)>1)throw Error('ID ausente ou duplicado na base');
          if(!bySku.has(r.sku))throw Error('SKU não cadastrado');
          day(r.date);
          if(r.date<start||r.date>end)throw Error('Data fora da cobertura declarada');
          if(!r.unit)throw Error('Unidade ausente');
          const quantity=integer(r.quantity,'quantity');
          if(kind==='purchases'){
            const cost=integer(r.cost,'cost');
            if(quantity<=0||cost<0)throw Error('Compra exige quantidade positiva e custo não negativo');
            purchases.push({
              ...r,quantity,cost
            });
            return;
          }
          const revenue=integer(r.revenue,'revenue'),discount=integer(r.discount,'discount'),channel_bps=integer(r.channel_bps,'channel_bps');
          if(r.event==='cancelled'){
            cancelled++;
            return;
          }
          if(!['sale','return'].includes(r.event))throw Error('Evento deve ser sale, return ou cancelled');
          if(r.unit!==bySku.get(r.sku).unit)throw Error('Unidade da venda incompatível');
          if(channel_bps<0||channel_bps>=10000)throw Error('Comissão fora de 0–9999 bps');
          if(r.event==='sale'?(quantity<=0||revenue<=0):(quantity>=0||revenue>=0))throw Error('Sinal de volume/receita incompatível com evento');
          let cmv=null,eligible=false;
          try{
            cmv=integer(r.cmv,'cmv',true);
            eligible=cmv!=null&&(r.event==='sale'?cmv>=0:cmv<=0);
          }catch(e){
          }
          if(!eligible)issues.push({
            table:kind,line:n+2,id:r.id,sku:r.sku,reason:'CMV ausente ou inválido: receita mantida, margem excluída',quarantined:false
          });
          const target=(byTarget.get(r.sku)||[]).find(t=>t.start<=r.date&&r.date<t.end);
          sales.push({
            ...r,quantity,revenue,discount,channel_bps,cmv,eligible,target_bps:target?.bps??null
          });
        }catch(e){
          reject(kind,n,r,e);
        }
      });
    }
    if(!sales.length)throw Error('Nenhuma venda/devolução válida após a validação.');
    // Teto de soma absoluta mantém os produtos centavos*bps exatos em Number.
    for(const field of ['revenue','cmv','discount'])if(sales.reduce((s,r)=>s+Math.abs(r[field]||0),0)>100000000000)throw Error('Total absoluto de '+field+' acima de R$ 1 bilhão.');
    const abs=sales.reduce((s,r)=>s+Math.abs(r.revenue),0),covered=sales.reduce((s,r)=>s+(r.eligible?Math.abs(r.revenue):0),0);
    for(const kind of Object.keys(CONTRACT))summary[kind]={
      received:input[kind].length,accepted:{
        products,sales,purchases,targets
      }[kind].length,quarantined:issues.filter(i=>i.table===kind&&i.quarantined).length
    };
    const raw={
      products,sales,purchases,targets,history_start:start,as_of:end,rules:{
        cost_increase:.10,margin_drop:.03,price_stable:.01,price_drop:.05
      },issues
    };
    // Um erro de compra impede que um par remanescente pareça uma comparação íntegra.
    for(const sku of new Set(issues.filter(i=>i.table==='purchases').map(i=>i.sku)))if(bySku.has(sku))raw.purchases.push({
      sku,id:'',date:'',cost:null,quantity:null,unit:''
    });
    return {
      raw,issues,summary,cancelled,coverage:abs?covered/abs:null,totals:{
        revenue:sales.reduce((s,r)=>s+r.revenue,0),cmv:sales.reduce((s,r)=>s+(r.eligible?r.cmv:0),0)
      }
    };
  }
  function csv(rows){
    return '\uFEFF'+rows.map(row=>row.map(v=>{
      let s=String(v??'');
      if(typeof v!=='number'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;
      return '"'+s.replace(/"/g,'""')+'"';
    }).join(';')).join('\r\n');
  }
  const api={
    CONTRACT,parseCSV,mapRows,validate,csv
  };
  if(typeof module!=='undefined')module.exports=api;
  root.GuardianImport=api;
})(typeof window==='undefined'?globalThis:window);
