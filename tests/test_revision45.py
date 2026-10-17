import json
import subprocess
import unittest
from collections import defaultdict
from datetime import date
from pathlib import Path

from guardian.synthetic import generate_daily
from guardian.data import validate
from guardian.engine import analyze, combine
from guardian.decompose import decompose

ROOT = Path(__file__).resolve().parents[1]

class DailyDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = generate_daily()
        cls.rows, cls.issues = validate(cls.data)
        cls.snapshot = analyze(cls.data, '2026-10-01', '2026-10-14')
        cls.items = {i['sku']: i for i in cls.snapshot['items']}

    def test_deterministic(self):
        self.assertEqual(self.data, generate_daily())

    def test_daily_coverage_and_variable_margins(self):
        days = {r['date'] for r in self.rows if '2026-10-01' <= r['date'] <= '2026-10-13'}
        self.assertGreaterEqual(len(days)/13, .8)
        margins = defaultdict(set)
        for r in self.rows:
            if r['eligible']:
                margins[r['sku']].add(round(1-r['cmv']/r['revenue'], 6))
        self.assertEqual(len(margins), 19)
        self.assertTrue(all(len(v)>10 for v in margins.values()))

    def test_no_april_splice_and_different_targets(self):
        margins=[]
        for start,end in [('2026-02-01','2026-03-01'),('2026-03-01','2026-04-01'),('2026-04-01','2026-05-01')]:
            margins.append(combine([i['current'] for i in analyze(self.data,start,end)['items']])['margin'])
        self.assertLess(max(margins)-min(margins), .02)
        self.assertGreater(len({t['bps'] for t in self.data['targets']}), 4)

    def test_stories_and_partial_quality(self):
        self.assertIn('Alta de custo de compra', self.items['SKU-001']['alerts'])
        self.assertIn('Preço sem reação', self.items['SKU-001']['alerts'])
        pair=[self.items[k] for k in ['SKU-002','SKU-003']]
        self.assertLess(decompose(pair,'three')['effects']['mix'],0)
        self.assertEqual(self.items['SKU-005']['current']['coverage'],0)
        self.assertIn('Alta de custo de compra', self.items['SKU-006']['alerts'])
        self.assertLess(abs(self.items['SKU-006']['current']['margin']-self.items['SKU-006']['three']['margin']),.01)
        self.assertIn('Queda de preço líquido', self.items['SKU-009']['alerts'])
        self.assertEqual(self.items['SKU-013']['severity'],'Crítico')
        self.assertEqual(self.items['SKU-017']['severity'],'Alto')
        self.assertFalse(self.items['SKU-018']['purchase']['valid'])
        self.assertTrue(any(0<i['current']['coverage']<1 for i in self.items.values()))
        self.assertTrue(any(r['event']=='return' for r in self.rows))
        self.assertTrue(any(r['event']=='cancelled' for r in self.data['sales']))

    def test_daily_python_javascript_parity(self):
        script="""const fs=require('fs'),vm=require('vm'),E=require('./dist/engine.js');let c={window:{}};vm.runInNewContext(fs.readFileSync('dist/daily-data.js','utf8'),c);let e=E.create(c.window.GUARDIAN_DAILY);console.log(JSON.stringify(e.analyze('2026-10-01','2026-10-14').items));"""
        js=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT,text=True))
        for item in js:
            p=self.items[item['sku']]
            for ref in ['current','previous','three','year']:
                for field in ['revenue','cmv','gross','quantity','commission','gap','target_value','coverage','margin']:
                    with self.subTest(sku=item['sku'],ref=ref,field=field):
                        a,b=item[ref][field],p[ref][field]
                        if a is None or b is None:self.assertEqual(a,b)
                        else:self.assertAlmostEqual(a,b,places=10)

    def test_import_and_explanations_node(self):
        subprocess.run(['node','tests/revision45.cjs'],cwd=ROOT,check=True,capture_output=True,text=True)

if __name__=='__main__':unittest.main()
