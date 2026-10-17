/* Fluxo local: importação, conciliação, cenários e exportação. */
(function(root){
  'use strict';
  const CI=root.GuardianImport;
  let staged=null,importVersion=0,imported=null;
  const fileVersions={};
  const tables={
  };
  function message(text){
    document.getElementById('workflow-status').textContent=text;
  }
  function download(name,text,type='text/csv;charset=utf-8'){
    const url=URL.createObjectURL(new Blob([text],{
      type
    })),a=document.createElement('a');
    a.href=url;
    a.download=name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function activate(data){
    D=data;
    engine=E.create(D);
    initial={
      ...initial,start:D.as_of.slice(0,7)+'-01',end:D.as_of,selected:D.raw.products[0].sku
    };
    if(initial.start<D.raw.history_start)initial.start=D.raw.history_start;
    state={
      ...initial
    };
    simInput=null;
    filterMessage='Base alterada. Recorte e premissas reiniciados.';
    for(const id of ['date-start','date-end']){
      $(id).min=D.raw.history_start;
      $(id).max=D.as_of;
    }
    document.querySelector('.data-stamp strong').textContent=date(D.as_of);
    document.querySelector('.data-stamp .live').textContent=D.dataset_kind==='import'?'Base local importada':'Base sintética';
    document.querySelector('.badge.demo').textContent=D.dataset_kind==='import'?'Seus CSVs · processamento local':'Demonstração · dados fictícios';
    document.querySelector('footer p').textContent=(D.dataset_kind==='import'?'Base local importada':'Dados sintéticos')+' · '+date(D.raw.history_start)+' a '+date(D.as_of)+' · BRL · v4.5';
    render();
  }
  function storageRead(){
    try{
      const rows=JSON.parse(localStorage.getItem('guardian-scenarios-v1')||'[]');
      return Array.isArray(rows)?rows.filter(r=>r.expires>Date.now()).slice(0,20):[];
    }catch(e){
      return [];
    }
  }
  function savedMarkup(){
    return storageRead().map((r,n)=>`<li>${esc(r.name)} · ${esc(r.sku)} · ${date(r.filters.start)} a ${date(r.filters.end)} <button class="quiet" data-load-saved="${n}" ${r.dataset_hash!==D.dataset_hash?'disabled':''}>Restaurar</button><button class="quiet" data-delete-saved="${n}">Excluir</button>${r.dataset_hash!==D.dataset_hash?' · outra base':''}</li>`).join('')||'<li>Nenhum cenário salvo neste navegador.</li>';
  }
  function save(){
    if(!scenarioData||!lastScenario){
      message('Corrija as premissas antes de salvar.');
      return;
    }
    const name=$('saved-name').value.trim()||'Cenário '+new Date().toLocaleString('pt-BR');
    const row={
      ...scenarioData,name:name.slice(0,80),dataset_hash:D.dataset_hash,expires:Date.now()+30*86400000
    };
    try{
      const rows=storageRead();
      rows.unshift(row);
      localStorage.setItem('guardian-scenarios-v1',JSON.stringify(rows.slice(0,20)));
      $('saved-list').innerHTML=savedMarkup();
      bindSaved();
      message('Cenário salvo somente neste navegador, com expiração em 30 dias.');
    }catch(e){
      message('Armazenamento indisponível. Use Copiar cenário.');
    }
  }
  function bindSaved(){
    document.querySelectorAll('[data-load-saved]').forEach(b=>b.onclick=()=>{
      const r=storageRead()[+b.dataset.loadSaved];
      if(!r||r.dataset_hash!==D.dataset_hash)return;
      try{
        E.parse(r.filters.start);
        E.parse(r.filters.end);
        if(r.filters.start<D.raw.history_start||r.filters.end>D.as_of||r.filters.start>r.filters.end)throw Error('Período inválido');
        M.simulate(r.proposed);
        state={
          ...initial,...r.filters,tab:'simulator',selected:r.sku
        };
        simInput={
          ...r.proposed
        };
        simErr={
        };
        simDraft={
        };
        render();
        message('Cenário restaurado. Confira o produto e as premissas.');
      }catch(e){
        message('Cenário salvo inválido: '+e.message);
      }
    });
    document.querySelectorAll('[data-delete-saved]').forEach(b=>b.onclick=()=>{
      try{
        const rows=storageRead();
        rows.splice(+b.dataset.deleteSaved,1);
        localStorage.setItem('guardian-scenarios-v1',JSON.stringify(rows));
        $('saved-list').innerHTML=savedMarkup();
        bindSaved();
      }catch(e){
        message('Não foi possível excluir neste navegador.');
      }
    });
  }
  function reconcileText(){
    if(!staged)return '';
    const rows=[['Receita',staged.totals.revenue,'erp-revenue'],['CMV elegível',staged.totals.cmv,'erp-cmv']];
    return rows.map(([label,value,id])=>{
      const s=$(id).value;
      if(!s)return label+': ERP não informado.';
      const n=Number(s);
      if(!Number.isFinite(n)||Math.abs(n*100-Math.round(n*100))>1e-5)return label+': informe até duas casas decimais.';
      return label+': aceito '+brl(value)+' · ERP '+brl(Math.round(n*100))+' · diferença '+brl(value-Math.round(n*100))+'.';
    }).join(' ')+' Comparação do período declarado inteiro. CMV parcial, cancelamentos e quarentena devem ser conferidos, mesmo quando a diferença é zero.';
  }
  async function preview(){
    const version=++importVersion;
    staged=null;
    $('apply-import').disabled=true;
    try{
      const input={
      };
      for(const kind of Object.keys(CI.CONTRACT)){
        if(!tables[kind])throw Error('Selecione os quatro CSVs. Arquivos sem registros ainda precisam dos cabeçalhos.');
        const mapping={
        };
        for(const key of CI.CONTRACT[kind])mapping[key]=$('map-'+kind+'-'+key).value;
        input[kind]=CI.mapRows(tables[kind],kind,mapping);
      }
      const coverage={
        start:$('coverage-start').value,end:$('coverage-end').value
      };
      if((+E.parse(coverage.end)-E.parse(coverage.start))/86400000>1096)throw Error('Esta versão local aceita até três anos por importação.');
      const result=CI.validate(input,coverage);
      if(version!==importVersion)return;
      staged=result;
      $('quality-preview').innerHTML=`<h3>Conferência antes da análise</h3><table><thead><tr><th>Arquivo</th><th>Recebidas</th><th>Aceitas</th><th>Quarentena</th></tr></thead><tbody>${Object.entries(result.summary).map(([k,s])=>`<tr><th>${
        k
      }</th><td>${
        s.received
      }</td><td>${
        s.accepted
      }</td><td>${
        s.quarantined
      }</td></tr>`).join('')}</tbody></table><p>Cancelamentos excluídos: ${result.cancelled} · Cobertura de CMV: ${pct(result.coverage)}. Receita aceita: ${brl(result.totals.revenue)}; CMV elegível: ${brl(result.totals.cmv)}.</p><p id="reconciliation"></p><details><summary>${result.issues.length} ocorrências de qualidade (primeiras 100)</summary><ul>${result.issues.slice(0,100).map(i=>`<li>${
        esc(i.table)
      } linha ${
        i.line
      } · ${
        esc(i.id)
      }: ${
        esc(i.reason)
      }</li>`).join('')}</ul></details><button class="quiet" id="export-quality">Exportar todas as ocorrências CSV</button>`;
      $('reconciliation').textContent=reconcileText();
      $('export-quality').onclick=()=>download('qualidade_importacao.csv',CI.csv([['arquivo','linha','id','sku','motivo','quarentena'],...result.issues.map(i=>[i.table,i.line,i.id,i.sku,i.reason,i.quarantined])]));
      $('apply-import').disabled=false;
      message('Validação concluída. Confira os totais e a cobertura antes de aplicar.');
    }catch(e){
      $('quality-preview').textContent=e.message;
      message('Importação não aplicada. A base anterior permanece ativa.');
    }
  }
  function invalidateImport(){
    importVersion++;
    staged=null;
    $('apply-import').disabled=true;
    $('quality-preview').textContent='Arquivos ou cobertura alterados: valide novamente.';
  }
  async function applyImport(){
    if(!staged)return;
    if(!$('coverage-confirm').checked){
      message('Confirme que os arquivos cobrem todo o período declarado, inclusive dias sem vendas.');
      return;
    }
    const result=staged,version=importVersion;
    let hash='local-'+Date.now();
    if(root.crypto?.subtle){
      const buf=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(result.raw)));
      hash=Array.from(new Uint8Array(buf)).map(v=>v.toString(16).padStart(2,'0')).join('');
    }
    if(version!==importVersion)return;
    imported={
      ...window.GUARDIAN_DATA,as_of:result.raw.as_of,raw:result.raw,prepared_responses:[],ai_provenance:{mode:'rules',live_api:false},dataset_kind:'import',dataset_hash:hash,history_note:'Cobertura declarada pelo usuário. Processamento local.'
    };
    const option=$('dataset-choice').querySelector('[value="import"]');
    option.disabled=false;
    $('dataset-choice').value='import';
    activate(imported);
    message('Base importada aplicada. Os arquivos permanecem apenas na memória desta aba; recarregar a página descarta a importação.');
  }
  function monthlyHistory(items){
    const keys=new Set(items.map(i=>i.sku)),d=E.parse(state.end),out=[];
    for(let j=11;
    j>=0;
    j--){
      const start=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-j,1)).toISOString().slice(0,10),next=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-j+1,1)).toISOString().slice(0,10),end=next<E.add(state.end,1)?next:E.add(state.end,1);
      const snap=engine.analyze(start,end);
      out.push({
        label:start.slice(2,7),items:snap.complete.current?snap.items.filter(i=>keys.has(i.sku)):[]
      });
    }return out;
  }
  function exportSummary(){
    const snap=snapshot(),rows=selectedItems();
    download('margin_guardian_resumo.csv',CI.csv([
    ['SKU','Produto','Categoria','Tipo','Início inclusivo','Fim inclusivo','Receita centavos','CMV elegível centavos','LB elegível centavos','Margem razão','Cobertura CMV razão','Gap centavos','Margem 3M razão','Margem ano anterior razão','Severidade','Padrão','Base'],
    ...rows.map(i=>[i.sku,i.name,i.category,i.type,state.start,state.end,i.current.revenue,i.current.cmv,i.current.gross,i.current.margin,i.current.coverage,i.current.gap,snap.complete.three?i.three.margin:null,snap.complete.year?i.year.margin:null,i.severity,I.classify(i).label,D.dataset_hash])
    ]));
    message('Resumo exportado com o recorte atual e unidades explícitas.');
  }
  function printReport(){
    let el=$('print-report');
    if(!el){
      el=document.createElement('section');
      el.id='print-report';
      document.body.appendChild(el);
    }const items=selectedItems(),a=M.aggregate(items.map(i=>i.current));
    el.innerHTML=`<h1>Margin Guardian · Resumo de decisão</h1><p>${date(state.start)} a ${date(state.end)} · ${esc(state.category||'Todas as categorias')} · ${esc(state.type||'Todos os tipos')} · ${esc(state.sku||'Todos os produtos')}</p><p>${esc(I.summary(items,snapshot().complete.three?E.decompose(items,'three'):null))}</p><p>Receita: ${brl(a.revenue)} · LB elegível: ${brl(a.gross)} · cobertura CMV: ${pct(a.coverage)}.</p><table><thead><tr><th>Prioridade</th><th>Margem</th><th>Gap</th><th>Leitura</th></tr></thead><tbody>${I.rank(items.filter(i=>i.current.count&&i.alerts.length),state.order).slice(0,5).map(i=>`<tr><td>${
      esc(i.sku)
    } · ${
      esc(i.name)
    }</td><td>${
      pct(i.current.margin)
    }</td><td>${
      brl(i.current.gap)
    }</td><td>${
      esc(I.classify(i).label)
    }</td></tr>`).join('')}</tbody></table><p>${D.dataset_kind==='import'?'Dados importados; cobertura declarada pelo usuário.':'Dados sintéticos, sem validação operacional real.'} Gap não é perda realizada; correlação não prova causa. ${esc(D.formula)} · v4.5.</p><small>Identificador da base: ${esc(D.dataset_hash)}</small>`;
    if(typeof root.print==='function')root.print();
    else message('Impressão não disponível neste ambiente. Use o CSV.');
  }
  function bind(){
    if(state.tab==='executive'){
      const queue=Array.from($('view').querySelectorAll('section.card')).find(s=>s.querySelector('h2')?.textContent==='Comece por estes sinais');
      const kpis=$('view').querySelector('.kpis');
      if(queue&&kpis)kpis.after(queue);
      const more=document.createElement('details');
      more.className='advanced-analytics';
      more.innerHTML='<summary>Explorar concentração, preço e histórico por categoria</summary><div id="advanced-charts"></div>';
      $('view').appendChild(more);
      more.addEventListener('toggle',()=>{
        if(more.open&&!$('advanced-charts').textContent){
          const items=selectedItems();
          $('advanced-charts').innerHTML=I.analytics(items,monthlyHistory(items));
        }
      });
    }
    if(state.tab==='simulator'&&$('copy-scenario')){
      const b=document.createElement('div');
      b.className='save-scenario';
      b.innerHTML='<label>Nome do cenário<input id="saved-name" maxlength="80" placeholder="Ex.: revisão de preço"></label><button id="save-scenario" class="button secondary">Salvar neste navegador</button><p class="small">Guarda até 20 cenários. Expiram em 30 dias e são removidos ao reabrir o painel. Exclua-os antes de compartilhar este computador.</p>';
      $('copy-scenario').parentElement.after(b);
      $('save-scenario').onclick=save;
    }
    if($('saved-list')){
      $('saved-list').innerHTML=savedMarkup();
      bindSaved();
    }
  }
  function mount(){
    $('data-workflow').innerHTML=`<div class="workflow-toolbar"><label>Base da análise<select id="dataset-choice"><option value="daily">Diária · sintética v4.5</option><option value="legacy">Casos didáticos · base anterior</option><option value="import" disabled>Meus CSVs · nesta sessão</option></select></label><button class="button secondary" id="export-summary">Exportar resumo CSV</button><button class="quiet" id="print-summary">Resumo para PDF / impressão</button></div><p class="small">Demonstração sintética. Explicações por regras verificáveis, sem modelo de IA ao vivo. A importação é local e não envia seus arquivos a servidores.</p><details><summary>Importar CSVs e conferir a qualidade</summary><p>Quatro arquivos UTF-8, vírgula ou ponto e vírgula. Valores monetários em <b>centavos inteiros</b>; comissão/meta em bps (100 = 1%). Receita já líquida de descontos; não descontamos duas vezes. CMV é o total da linha; cost é custo de compra unitário. Datas AAAA-MM-DD. Meta usa fim exclusivo. Tipos: Essencial/Especial; eventos: sale/return/cancelled.</p><div class="import-grid">${Object.entries(CI.CONTRACT).map(([kind,fields])=>`<fieldset><legend>${
      kind
    }</legend><input id="csv-${kind}" type="file" accept=".csv,text/csv" aria-label="Arquivo ${kind}"><button data-template="${kind}" class="quiet">Baixar cabeçalhos</button><div id="mapping-${kind}"></div></fieldset>`).join('')}</div><div class="controls"><label>Início da cobertura<input id="coverage-start" type="date"></label><label>Fim da cobertura (inclusivo)<input id="coverage-end" type="date"></label><label>Receita do ERP no período (R$)<input id="erp-revenue" type="number" step="0.01"></label><label>CMV do ERP no período (R$)<input id="erp-cmv" type="number" step="0.01"></label></div><label class="coverage-confirm"><input id="coverage-confirm" type="checkbox"> Confirmo que os arquivos cobrem todo o período declarado, inclusive dias sem vendas.</label><div class="share-actions"><button id="validate-import" class="button secondary">Validar e conciliar</button><button id="apply-import" class="button" disabled>Aplicar base validada</button></div><div id="quality-preview" aria-live="polite"></div><p class="small">Até 50 mil linhas por CSV, 55 mil no conjunto, 500 produtos e três anos de cobertura. Recarregar descarta a base importada; cenários salvos são armazenados separadamente.</p></details><details><summary>Cenários salvos neste navegador</summary><ul id="saved-list">${savedMarkup()}</ul><button class="quiet" id="clear-saved">Excluir todos os cenários</button></details><p id="workflow-status" role="status" aria-live="polite"></p>`;
    $('dataset-choice').value=D.dataset_kind==='daily'?'daily':'legacy';
    $('dataset-choice').onchange=e=>{
      const data=e.target.value==='daily'?window.GUARDIAN_DAILY:e.target.value==='legacy'?window.GUARDIAN_DATA:imported;
      if(data)activate(data);
    };
    $('export-summary').onclick=exportSummary;
    $('print-summary').onclick=printReport;
    $('validate-import').onclick=preview;
    $('apply-import').onclick=()=>applyImport().catch(e=>message('Não foi possível aplicar: '+e.message));
    for(const id of ['coverage-start','coverage-end'])$(id).onchange=invalidateImport;
    for(const id of ['erp-revenue','erp-cmv'])$(id).oninput=()=>{
      if($('reconciliation'))$('reconciliation').textContent=reconcileText();
    };
    document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>download(b.dataset.template+'.csv',CI.csv([CI.CONTRACT[b.dataset.template]])));
    for(const kind of Object.keys(CI.CONTRACT))$('csv-'+kind).onchange=async e=>{
      invalidateImport();
      delete tables[kind];
      const file=e.target.files[0],version=(fileVersions[kind]||0)+1;fileVersions[kind]=version;
      $('mapping-'+kind).textContent='';
      if(!file)return;
      try{
        if(file.size>20*1024*1024)throw Error('Arquivo acima de 20 MB.');
        const table=CI.parseCSV(await file.text());
        if(version!==fileVersions[kind])return;
        tables[kind]=table;
        $('mapping-'+kind).innerHTML='<p>'+table.rows.length+' registros</p>'+CI.CONTRACT[kind].map(key=>`<label>${key}<select id="map-${kind}-${key}"><option value="">Selecione a coluna</option>${table.headers.map(h=>`<option value="${esc(h)}" ${
          h===key?'selected':''
        }>${
          esc(h)
        }</option>`).join('')}</select></label>`).join('');
        $('mapping-'+kind).querySelectorAll('select').forEach(s=>s.onchange=invalidateImport);
      }catch(error){
        message(kind+': '+error.message);
      }
    };
    $('clear-saved').onclick=()=>{
      try{
        localStorage.removeItem('guardian-scenarios-v1');
        $('saved-list').innerHTML=savedMarkup();
        message('Cenários locais excluídos.');
      }catch(e){
        message('Armazenamento indisponível.');
      }
    };
    // Limpeza de retenção é feita ao abrir, inclusive antes de o usuário salvar novamente.
    try{
      if(localStorage.getItem('guardian-scenarios-v1'))localStorage.setItem('guardian-scenarios-v1',JSON.stringify(storageRead()));
    }catch(e){
    }
    bindSaved();
  }
  root.GuardianWorkflow={
    mount,bind,activate,preview,applyImport,exportSummary
  };
})(window);
