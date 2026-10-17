"""Paridade independente Python/JS para intervalos, evidências e decomposição filtrada."""
import copy
import json
import subprocess
import unittest
from pathlib import Path
from guardian.data import generate, validate
from guardian.engine import analyze, windows, target_for, target_index
from guardian.decompose import decompose

ROOT = Path(__file__).resolve().parents[1]
RANGES = [("2026-10-01", "2026-10-14"), ("2026-09-08", "2026-10-09"),
          ("2026-10-03", "2026-10-04"), ("2026-10-04", "2026-10-05"),
          ("2025-02-01", "2025-03-01"), ("2025-01-01", "2025-01-03"),
          ("2026-01-01", "2026-10-14"), ("2026-07-16", "2026-10-14"),
          ("2025-12-20", "2026-01-09"), ("2025-01-01", "2026-10-14")]

def frontend(data, ranges):
    rows, issues = validate(data)
    targets = target_index(data)
    raw = {**data, "sales": [{**r, "target_bps": target_for(data,r["sku"],r["date"],index=targets)} for r in rows], "issues": issues}
    js = """const E=require('./dist/engine.js');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{const d=JSON.parse(s),e=E.create({raw:d.raw});console.log(JSON.stringify(d.ranges.map(w=>e.analyze(...w))));});"""
    return json.loads(subprocess.check_output(["node", "-e", js], input=json.dumps(dict(raw=raw,ranges=ranges)),cwd=ROOT,text=True, encoding="utf-8"))

class RangeParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=generate()
        cls.back=[analyze(cls.data,*w) for w in RANGES]
        cls.front=frontend(cls.data,RANGES)

    def test_all_ranges_all_skus_all_windows(self):
        for w,b,f in zip(RANGES,self.back,self.front):
            self.assertEqual(b['windows'],f['windows'],w)
            self.assertEqual(b['complete'],f['complete'],w)
            for bi,fi in zip(b['items'],f['items']):
                for key in ['sku','current','previous','three','year','alerts','quality','purchase','simulation','severity','confidence','source_ids']:
                    self.assertEqual(bi[key],fi[key],(w,bi['sku'],key))

    def test_filtered_decomposition_closes_and_matches_python(self):
        batches=[]
        for b in self.back:
            for cat in ['', 'Tecnologia', 'Alimentos']:
                for typ in ['', 'Essencial', 'Especial']:
                    items=[i for i in b['items'] if (not cat or i['category']==cat) and (not typ or i['type']==typ)]
                    for ref in ('three','year'):
                        batches.append(dict(items=items,ref=ref))
        script="const E=require('./dist/engine.js');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(s).map(d=>E.decompose(d.items,d.ref)))));"
        results=json.loads(subprocess.check_output(['node','-e',script],input=json.dumps(batches),text=True, encoding="utf-8",cwd=ROOT))
        for batch,front in zip(batches,results):
            back=decompose(batch['items'],batch['ref'])
            if back is None:self.assertIsNone(front);continue
            self.assertAlmostEqual(sum(front['effects'].values()),front['total'],places=10)
            for k in back['effects']:self.assertAlmostEqual(back['effects'][k],front['effects'][k],places=10)

    def test_year_reference_same_inclusive_dates(self):
        self.assertEqual(windows('2026-10-03','2026-10-09')['year'],['2025-10-03','2025-10-09'])

    def test_leap_day_clamps_inclusive_ends(self):
        cases=[('2024-02-29','2024-03-01'),('2024-02-01','2024-03-01'),('2025-03-01','2025-03-02')]
        script="const E=require('./dist/engine.js');console.log(JSON.stringify("+json.dumps(cases)+".map(w=>E.windows(...w))))"
        result=json.loads(subprocess.check_output(['node','-e',script],text=True, encoding="utf-8",cwd=ROOT))
        self.assertEqual(result,[windows(*w) for w in cases])
        self.assertEqual(result[0]['year'],['2023-02-28','2023-03-01'])
        self.assertEqual(result[1]['year'],['2023-02-01','2023-03-01'])

    def test_history_bounds_include_end(self):
        self.assertFalse(analyze(self.data,'2026-10-01','2026-10-15')['complete']['current'])
        self.assertTrue(self.back[0]['complete']['year'])
        self.assertFalse(self.back[4]['complete']['year'])

    def test_missing_cmv_never_becomes_zero_margin(self):
        i=next(i for i in self.front[0]['items'] if i['sku']=='SKU-005')
        for ref in ['current','three','year']:self.assertIsNone(i[ref]['margin'])
        self.assertEqual(i['narrative']['mode'],'quality')

    def test_partial_day_has_only_requested_evidence(self):
        for i in self.front[2]['items']:
            self.assertTrue(all(r['date']=='2026-10-03' for r in i['source_rows']))
            self.assertEqual(i['current']['count'],1)

    def test_narrative_period_changes_with_range(self):
        for i in self.front[1]['items']:
            if i['narrative']['response']:
                self.assertEqual(i['narrative']['response']['period'],'2026-09-08/2026-10-08')
                self.assertEqual(i['narrative']['mode'],'rules')

    def test_invalid_js_dates_rejected(self):
        script="const E=require('./dist/engine.js');console.log(JSON.stringify(['2026-02-30','x','2026-13-01'].map(s=>{try{E.windows(s,'2027-01-01');return false}catch(e){return true}})))"
        self.assertEqual(json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT,text=True, encoding="utf-8")),[True]*3)

    def test_return_and_missing_target_parity(self):
        d=copy.deepcopy(self.data);sale=d['sales'][-20].copy()
        d['sales'].append({**sale,'id':'RETURN-TEST','event':'return','quantity':-sale['quantity'],'revenue':-sale['revenue'],'cmv':-sale['cmv'] if sale['cmv'] else sale['cmv']})
        d['targets']=[]
        f=frontend(d,[RANGES[0]])[0];b=analyze(d,*RANGES[0])
        for bi,fi in zip(b['items'],f['items']):self.assertEqual(bi['current'],fi['current'])
