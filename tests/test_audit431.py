"""Regressões da auditoria: decisões observáveis, integridade e paridade Python/JS."""
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from guardian.data import generate, validate, validate_purchases
from guardian.engine import analyze, purchases_for, target_for, target_index
from guardian.narrative import facts_for, fallback, select_narrative
from guardian.decompose import decompose
from test_ranges import frontend
from verificar import update_project_page

ROOT = Path(__file__).resolve().parents[1]
PERIOD = '2026-10'
RANGE = ('2026-10-01', '2026-10-14')

def fixture():
    d = generate()
    d.update(products=d['products'][:2], sales=[], purchases=[], targets=[])
    return d

def sale(d, key, sku_index=0, revenue=10000, cmv=11000, day='2026-10-03', channel=1000):
    p = d['products'][sku_index]
    return dict(id=key, sku=p['sku'], date=day, event='sale', unit=p['unit'],
                quantity=10, revenue=revenue, cmv=cmv, discount=0, channel_bps=channel)

def buys(d, current=10900):
    p = d['products'][0]
    return [dict(id='P1', sku=p['sku'], date='2026-09-01', cost=10000, quantity=10, unit=p['unit']),
            dict(id='P2', sku=p['sku'], date='2026-10-01', cost=current, quantity=10, unit=p['unit'])]

def js(expression, payload):
    script = "const E=require('./dist/engine.js');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{const d=JSON.parse(s);console.log(JSON.stringify("+expression+"));});"
    return json.loads(subprocess.check_output(['node', '-e', script], input=json.dumps(payload), text=True, encoding='utf-8', cwd=ROOT))

class Audit431(unittest.TestCase):
    def parity(self, d):
        back = analyze(d, *RANGE)
        front = frontend(d, [RANGE])[0]
        for b, f in zip(back['items'], front['items']):
            for key in ('current', 'previous', 'purchase', 'quality', 'severity', 'simulation', 'source_ids'):
                self.assertEqual(b[key], f[key], (b['sku'], key))
            self.assertEqual(select_narrative(facts_for(b, PERIOD), PERIOD), f['narrative'])
        return back['items']

    def test_configurable_cost_threshold_drives_facts_in_both_engines(self):
        for threshold, cost, expected in [(0.08, 10900, True), (0.25, 12000, False)]:
            with self.subTest(threshold=threshold):
                d=fixture();d['sales']=[sale(d,'S1')];d['purchases']=buys(d,cost)
                d['rules']['cost_increase']=threshold
                i=self.parity(d)[0]
                self.assertEqual('Alta de custo de compra' in i['alerts'],expected)
                self.assertEqual(any(f['kind']=='cost' for f in facts_for(i,PERIOD).values()),expected)

    def test_priority_independent_of_dictionary_and_prepared_order(self):
        facts={k:dict(id=k,kind=k,period=PERIOD,values={}) for k in ('price','cost','target','negative')}
        prepared=[fallback({k:f},PERIOD) for k,f in facts.items()]
        for sequence in (prepared, list(reversed(prepared))):
            n=select_narrative(facts,PERIOD,sequence)
            self.assertEqual(n['response']['fact_id'],'negative')
            self.assertEqual([x['response']['fact_id'] for x in n['supporting']],['target','cost','price'])
            self.assertEqual(n,js('E.selectNarrative(d.facts,d.period,d.prepared)',dict(facts=facts,period=PERIOD,prepared=sequence)))
        self.assertEqual(fallback(facts,PERIOD)['fact_id'],'negative')

    def test_prepared_lower_priority_does_not_hide_primary_or_disappear(self):
        facts={k:dict(id=k,kind=k,period=PERIOD,values={}) for k in ('cost','target')}
        prepared=[fallback({'cost':facts['cost']},PERIOD)]
        n=select_narrative(facts,PERIOD,prepared)
        self.assertEqual((n['mode'],n['response']['fact_id']),('rules','target'))
        self.assertEqual((n['supporting'][0]['mode'],n['supporting'][0]['response']['fact_id']),('prepared','cost'))
        self.assertEqual(n,js('E.selectNarrative(d.facts,d.period,d.prepared)',dict(facts=facts,period=PERIOD,prepared=prepared)))

    def test_duplicate_prepared_ids_are_rejected(self):
        facts={'cost':dict(id='cost',kind='cost',period=PERIOD,values={})}
        r=fallback(facts,PERIOD)
        with self.assertRaises(ValueError):select_narrative(facts,PERIOD,[r,r])
        self.assertTrue(js("(()=>{try{E.selectNarrative(d.facts,d.period,d.prepared);return false;}catch(e){return true;}})()",dict(facts=facts,period=PERIOD,prepared=[r,r])))

    def test_global_purchase_duplicate_across_skus_and_future(self):
        for day in ('2026-09-02','2026-12-01'):
            with self.subTest(day=day):
                d=fixture();d['sales']=[sale(d,'S1')];d['purchases']=buys(d)
                d['purchases'].append({**d['purchases'][0],'sku':d['products'][1]['sku'],'date':day})
                rows,issues=validate(d)
                self.assertEqual(len(rows),1)
                self.assertEqual(len([x for x in issues if x.get('entity')=='purchase']),2)
                items=self.parity(d)
                for i in items:
                    self.assertFalse(i['purchase']['valid'])
                    self.assertIn('duplicada na base',i['purchase']['reason'])

    def test_purchase_field_errors_quarantined_without_changing_sales(self):
        invalid=[('date','2026-02-30'),('date','20261001'),('cost',True),('cost',-1),('cost',1.5),('quantity',0),('quantity',True),('quantity',1.5),('id',''),('unit','')]
        for key,value in invalid:
            with self.subTest(field=key,value=value):
                d=fixture();d['sales']=[sale(d,'S1')];d['purchases']=buys(d)
                d['purchases'][1][key]=value
                self.assertEqual(len(validate_purchases(d)['issues']),1)
                i=self.parity(d)[0]
                self.assertFalse(i['purchase']['valid'])
                self.assertEqual(i['current']['gross'],-1000)
                self.assertFalse(any(f['kind']=='cost' for f in facts_for(i,PERIOD).values()))

    def test_malformed_or_unknown_sku_purchase_reported_globally(self):
        d=fixture();d['purchases']=buys(d)
        d['purchases'] += [None, {**d['purchases'][0],'id':'unknown','sku':'unknown'}]
        _,issues=validate(d)
        self.assertEqual(len(issues),2)
        self.assertTrue(all(x['entity']=='purchase' for x in issues))
        self.assertTrue(purchases_for(d,d['products'][0],RANGE[1])['valid'])

    def test_invalid_old_purchase_does_not_silently_use_newer_pair(self):
        d=fixture();d['sales']=[sale(d,'S1')];d['purchases']=buys(d)
        d['purchases'].append({**d['purchases'][0],'id':'bad-old','date':'2025-01-01','cost':-1})
        self.assertFalse(self.parity(d)[0]['purchase']['valid'])

    def test_unique_invalid_future_purchase_not_used_in_past_comparison(self):
        d=fixture();d['sales']=[sale(d,'S1')];d['purchases']=buys(d)
        d['purchases'].append({**d['purchases'][0],'id':'future','date':'2026-12-01','cost':-1})
        self.assertEqual(len(validate(d)[1]),1)
        self.assertTrue(self.parity(d)[0]['purchase']['valid'])

    def test_high_loss_without_target_stays_critical(self):
        d=fixture();d['sales']=[sale(d,'S1',revenue=100000,cmv=200000)]
        i=self.parity(d)[0]
        self.assertIsNone(i['current']['gap']);self.assertEqual(i['severity'],'Crítico')

    def test_partial_target_does_not_hide_loss_from_uncovered_dates(self):
        d=fixture();d['sales']=[sale(d,'S1',cmv=20000),sale(d,'S2',day='2026-10-10',cmv=9999)]
        d['targets']=[dict(sku=d['products'][0]['sku'],start='2026-10-10',end='2026-10-14',bps=0)]
        i=self.parity(d)[0]
        self.assertEqual(i['current']['gap'],0);self.assertEqual(i['severity'],'Crítico')

    def test_materiality_exact_half_percent_boundary(self):
        for loss,expected in [(499,'Alto'),(500,'Crítico')]:
            d=fixture();d['sales']=[sale(d,'S1',revenue=100000,cmv=100000+loss)]
            self.assertEqual(self.parity(d)[0]['severity'],expected)

    def test_small_impact_story_h7_is_still_high(self):
        i=next(i for i in analyze(generate(),*RANGE)['items'] if i['sku']=='SKU-017')
        self.assertEqual(i['severity'],'Alto')

    def test_sales_input_order_cannot_change_latest_simulation_metadata(self):
        d=fixture();d['sales']=[sale(d,'S2',day='2026-10-10',channel=2000),sale(d,'S1',day='2026-10-03',channel=500)]
        i=self.parity(d)[0]
        self.assertEqual(i['source_ids'],['S1','S2']);self.assertEqual(i['simulation']['t'],2000)

    def test_target_index_handles_adjacent_intervals_and_gaps(self):
        d=fixture();sku=d['products'][0]['sku'];d['targets']=[dict(sku=sku,start='2026-10-05',end='2026-10-09',bps=1000),dict(sku=sku,start='2026-10-01',end='2026-10-05',bps=0)]
        index=target_index(d)
        for day,value in [('2026-09-30',None),('2026-10-01',0),('2026-10-04',0),('2026-10-05',1000),('2026-10-09',None)]:
            self.assertEqual(target_for(d,sku,day,index=index),value)

    def test_overlapping_targets_refused_even_outside_requested_sales(self):
        d=fixture();sku=d['products'][0]['sku'];d['targets']=[dict(sku=sku,start='2025-01-01',end='2025-04-01',bps=1000),dict(sku=sku,start='2025-03-01',end='2025-06-01',bps=2000)]
        with self.assertRaises(ValueError):analyze(d,*RANGE)

    def test_entry_and_exit_are_counted_once_and_reconcile(self):
        def a(revenue,cmv):return dict(eligible_revenue=revenue,eligible_quantity=revenue//10,cmv=cmv,gross=revenue-cmv)
        items=[dict(sku='exit',name='Saída',previous=a(100,20),current=a(0,0)),dict(sku='stay',name='Continua',previous=a(100,80),current=a(100,80)),dict(sku='new',name='Entrada',previous=a(0,0),current=a(100,40))]
        b=decompose(items);f=js("E.decompose(d,'previous')",items)
        # M0=50%, M1=40%; saída -15pp, entrada +5pp, produto estável 0pp.
        self.assertAlmostEqual(b['effects']['mix'],-0.15)
        self.assertAlmostEqual(b['effects']['entry'],0.05)
        self.assertAlmostEqual(sum(b['effects'].values()),-0.10)
        for k in b['effects']:self.assertAlmostEqual(b['effects'][k],f['effects'][k])
        self.assertEqual(b['worst']['mix'][0]['sku'],'exit')

    def test_project_rewrite_preserves_accents_with_legacy_default_encoding(self):
        original=Path.read_text
        def legacy_read(path,encoding=None,errors=None):
            return original(path,encoding=encoding or 'cp1252',errors=errors)
        text='<p>Ação, preço e comparação</p><b id="python-count">59</b>'
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'projeto.html';p.write_text(text,encoding='utf-8')
            with patch.object(Path,'read_text',legacy_read):update_project_page(p,77,None)
            self.assertEqual(p.read_text(encoding='utf-8'),text.replace('>59<','>77<'))
