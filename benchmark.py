"""Benchmark reproduzível do motor; não mede navegador nem promete SLA."""
import json
import platform
import statistics
import subprocess
import time
from pathlib import Path
from guardian.data import validate
from guardian.synthetic import generate_daily
from guardian.engine import analyze

ROOT=Path(__file__).resolve().parent

def main():
    data=generate_daily()
    valid,_=validate(data)
    data['sales']=[{**valid[n%len(valid)],'id':f'B-{n}'} for n in range(50000)]
    times=[]
    for _ in range(3):
        t=time.perf_counter();analyze(data,'2026-10-01','2026-10-14');times.append((time.perf_counter()-t)*1000)
    script="""const fs=require('fs'),vm=require('vm'),E=require('./dist/engine.js');let c={window:{}};vm.runInNewContext(fs.readFileSync('dist/daily-data.js','utf8'),c);let d=c.window.GUARDIAN_DAILY;let rows=d.raw.sales;d.raw.sales=Array.from({length:50000},(_,n)=>({...rows[n%rows.length],id:'B-'+n}));let samples=[];for(let i=0;i<3;i++){let t=performance.now(),e=E.create(d);e.analyze('2026-10-01','2026-10-14');samples.push(performance.now()-t);}console.log(JSON.stringify(samples));"""
    js=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT,text=True))
    report={'version':'4.5','platform':platform.platform(),'python':platform.python_version(),'input_sales':50000,'products':20,'repetitions':3,'python_analyze_ms':times,'python_median_ms':statistics.median(times),'js_create_and_analyze_ms':js,'js_median_ms':statistics.median(js),'browser_render_measured':False,'note':'Bases equivalentes em tamanho, ordens de replicação diferentes. Python inclui validação por análise; JS inclui criação do índice e análise, sobre linhas já validadas. Não é comparação direta entre linguagens nem teste de carga concorrente.'}
    (ROOT/'reports/performance_v4_5.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
