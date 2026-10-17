"""Calendário dos gráficos, inversão de totais e novos fatos de diagnóstico."""
import copy
from datetime import date,timedelta
import json
import subprocess
import unittest
from pathlib import Path
from guardian.data import generate
from guardian.engine import analyze
from guardian.narrative import facts_for,select_narrative,validate
from guardian.simulator import simulate,price_for_amount
from test_ranges import frontend

ROOT=Path(__file__).resolve().parents[1]
def js(expression,data):
    script="const E=require('./dist/engine.js'),M=require('./dist/math.js');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{const d=JSON.parse(s);console.log(JSON.stringify("+expression+"))});"
    return json.loads(subprocess.check_output(['node','-e',script],input=json.dumps(data),text=True,encoding='utf-8',cwd=ROOT))

class Experience44(unittest.TestCase):
    def test_same_month_every_day_including_no_sales(self):
        b=js('E.buckets(...d)',['2026-10-01','2026-10-14'])
        self.assertEqual(len(b),13)
        self.assertEqual([p['start'] for p in b],['2026-10-'+str(i).zfill(2) for i in range(1,14)])
        self.assertTrue(all(p['grain']=='day' for p in b))
        self.assertEqual(b[-1]['label'],'13 de Out')

    def test_decades_include_31st_and_partial_end(self):
        b=js('E.buckets(...d)',['2026-07-01','2026-08-24'])
        self.assertEqual([x['label'] for x in b],['10 de Jul','20 de Jul','31 de Jul','10 de Ago','20 de Ago','23 de Ago'])
        self.assertEqual(b[2]['end'],'2026-08-01')

    def test_partial_start_does_not_include_earlier_dates(self):
        b=js('E.buckets(...d)',['2026-07-16','2026-08-03'])
        self.assertEqual(b[0]['start'],'2026-07-16');self.assertEqual(b[0]['end'],'2026-07-21')
        self.assertEqual(b[-1]['end'],'2026-08-03')

    def test_february_leap_and_year_transition_partition_exactly(self):
        for start,end in [('2024-02-09','2024-03-04'),('2025-02-20','2025-03-02'),('2025-12-25','2026-02-02'),('2026-10-03','2026-10-04')]:
            b=js('E.buckets(...d)',[start,end]);actual=[]
            for x in b:
                d=date.fromisoformat(x['start'])
                while d<date.fromisoformat(x['end']):actual.append(d.isoformat());d+=timedelta(days=1)
            expected=[];d=date.fromisoformat(start)
            while d<date.fromisoformat(end):expected.append(d.isoformat());d+=timedelta(days=1)
            self.assertEqual(actual,expected)
            if start[:4]!=end[:4]:self.assertTrue(all('/' in x['label'] for x in b))

    def test_inverse_totals_parity_and_minimum_cent(self):
        cases=[]
        for q,t in [(3,0),(60,500),(7,3333),(1000,9999)]:
            for kind in ['revenue','channel']:
                original=dict(p=18000,c=12600,q=q,t=t,m=3000,goal='gross')
                amount=simulate(**original)[kind]+1
                cases.append(dict(**original,amount=amount,kind=kind))
        expected=[]
        for x in cases:
            result=price_for_amount(**x);expected.append(result)
            inp={k:x[k] for k in ['p','c','q','t','m','goal']}
            self.assertGreaterEqual(result['achieved'],x['amount'])
            if result['price']>1:self.assertLess(simulate(**{**inp,'p':result['price']-1})[x['kind']],x['amount'])
        self.assertEqual(js('d.map(x=>M.priceForAmount(x,x.amount,x.kind))',cases),expected)

    def test_inverse_total_reports_rounding_instead_of_inventing_volume(self):
        x=dict(p=100,c=20,q=3,t=0,m=0,amount=1000,kind='revenue')
        r=price_for_amount(**x)
        self.assertEqual(r,dict(price=334,achieved=1002,difference=2))

    def test_negative_post_commission_target_allowed(self):
        x=dict(p=10000,c=12000,q=10,t=500,m=0,amount=-10000,kind='channel')
        r=price_for_amount(**x)
        self.assertEqual(r,js('M.priceForAmount(d,d.amount,d.kind)',x))
        self.assertGreaterEqual(r['achieved'],-10000)

    def test_inverse_zero_volume_and_unreachable_amount_refused(self):
        for q,amount in [(0,1000),(3,1),(1000000,100000000001)]:
            x=dict(p=100,c=20,q=q,t=0,m=0,amount=amount,kind='revenue')
            with self.assertRaises(ValueError):price_for_amount(**x)
            self.assertTrue(js('(()=>{try{M.priceForAmount(d,d.amount,d.kind);return false}catch(e){return true}})()',x))

    def test_new_facts_parity_across_all_skus(self):
        d=generate();b=analyze(d,'2026-10-01','2026-10-14');f=frontend(d,[('2026-10-01','2026-10-14')])[0]
        kinds=set()
        for bi,fi in zip(b['items'],f['items']):
            facts=facts_for(bi,'2026-10');kinds.update(x['kind'] for x in facts.values())
            self.assertEqual(select_narrative(facts,'2026-10'),fi['narrative'])
        self.assertTrue({'history','year','on_target'}.issubset(kinds))

    def test_missing_history_never_becomes_comparison(self):
        b=analyze(generate(),'2025-01-01','2025-01-14')
        for i in b['items']:
            kinds={x['kind'] for x in facts_for(i,'p').values()}
            self.assertNotIn('history',kinds);self.assertNotIn('year',kinds)

    def test_channel_pressure_fact_and_no_false_target_met_with_partial_coverage(self):
        i=analyze(generate(),'2026-10-01','2026-10-14')['items'][0]
        i=copy.deepcopy(i);i['current']['commission']=i['current']['gross']+100
        facts=facts_for(i,'p');bykind={f['kind']:f for f in facts.values()}
        self.assertEqual(bykind['channel_loss']['values']['channel'],-100)
        n=select_narrative(facts,'p');self.assertEqual(facts[n['response']['fact_id']]['kind'],'channel_loss')
        self.assertEqual(n,js("E.narrative(d,'p')",i))
        i['current']['gap']=0;i['current']['target_revenue']=i['current']['eligible_revenue']//2
        self.assertNotIn('on_target',{f['kind'] for f in facts_for(i,'p').values()})

    def test_new_fact_response_rejects_unsupported_cause(self):
        i=analyze(generate(),'2026-10-01','2026-10-14')['items'][0];facts=facts_for(i,'p')
        history={k:f for k,f in facts.items() if f['kind']=='history'}
        r=select_narrative(history,'p')['response'];validate(r,history,'p')
        with self.assertRaises(ValueError):validate({**r,'hypothesis':'guaranteed_cause'},history,'p')
