import sys,json,time,statistics,copy,platform
sys.path.insert(0,sys.argv[1])
from guardian.data import generate
from guardian.engine import analyze
out={"python":platform.python_version(),"platform":platform.system(),"repetitions":3,"measures":[]}
for count in [2580,50000]:
 d=generate();source=d['sales'];d['sales']=[{**source[i%len(source)],'id':f'BENCH-{i}'} for i in range(count)]
 samples=[];signature=None
 for _ in range(3):
  start=time.perf_counter();r=analyze(d,'2026-01-01','2026-10-14');samples.append(time.perf_counter()-start)
  signature=[{k:i[k] for k in ['sku','current','previous','three','year','simulation']} for i in r['items']]
 out['measures'].append(dict(sales=count,products=len(d['products']),seconds=samples,median_seconds=statistics.median(samples),signature=signature))
print(json.dumps(out,ensure_ascii=False))
