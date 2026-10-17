import copy
import json
import subprocess
import unittest
from pathlib import Path

from guardian.data import generate, validate
from guardian.engine import aggregate, analyze, combine, snapshot, target_for, windows
from guardian.narrative import facts_for, fallback, run
from guardian.narrative import validate as guard
from guardian.simulator import simulate

ROOT = Path(__file__).resolve().parents[1]


class Finance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = generate()
        cls.oct = analyze(cls.data, "2026-10-01", "2026-10-14")

    def item(self, sku):
        return next(i for i in self.oct["items"] if i["sku"] == sku)

    def test_reproducible_data(self):
        self.assertEqual(generate(), generate())

    def test_four_categories_seven_months(self):
        self.assertEqual(len({p["category"] for p in self.data["products"]}), 4)
        self.assertEqual(len(snapshot(self.data)["months"]), 7)

    def test_weighted_margin(self):
        d = copy.deepcopy(self.data)
        rows = validate(d)[0][:2]
        rows[0].update(revenue=10000, cmv=9000)
        rows[1].update(revenue=90000, cmv=63000)
        self.assertAlmostEqual(aggregate(rows, d)["margin"], 0.28)

    def test_missing_cmv_not_in_denominator(self):
        d = copy.deepcopy(self.data)
        rows = validate(d)[0][:2]
        rows[0].update(revenue=10000, cmv=7000)
        rows[1].update(revenue=90000, cmv=None, eligible=False)
        a = aggregate(rows, d)
        self.assertEqual(a["revenue"], 100000)
        self.assertEqual(a["eligible_revenue"], 10000)
        self.assertEqual(a["margin"], 0.3)
        self.assertEqual(a["coverage"], 0.1)

    def test_h1_cost_increase_stable_price(self):
        i = self.item("SKU-001")
        self.assertIn("Preço sem reação", i["alerts"])
        self.assertAlmostEqual(i["purchase"]["change"], 0.2)

    def test_h2_mix_no_cost_accusation(self):
        items = [self.item("SKU-002"), self.item("SKU-003")]
        for i in items:
            self.assertAlmostEqual(i["current"]["margin"], i["previous"]["margin"])
        self.assertLess(
            combine([i["current"] for i in items])["margin"],
            combine([i["previous"] for i in items])["margin"],
        )

    def test_h3_no_made_up_gap(self):
        i = self.item("SKU-005")
        self.assertIsNone(i["current"]["margin"])
        self.assertIsNone(i["current"]["gap"])
        self.assertIsNone(i["simulation"])
        self.assertFalse(facts_for(i, "2026-10"))

    def test_h4_new_purchase_never_rewrites_sales(self):
        original = self.item("SKU-006")
        d = copy.deepcopy(self.data)
        next(p for p in reversed(d["purchases"]) if p["sku"] == "SKU-006")["cost"] *= 2
        changed = next(
            i
            for i in analyze(d, "2026-10-01", "2026-10-14")["items"]
            if i["sku"] == "SKU-006"
        )
        self.assertEqual(original["current"], changed["current"])
        self.assertNotEqual(original["purchase"], changed["purchase"])

    def test_h5_discount_requires_record(self):
        self.assertIn("Desconto registrado", self.item("SKU-009")["alerts"])

    def test_h6_negative_margin(self):
        self.assertEqual(self.item("SKU-013")["severity"], "Crítico")

    def test_h7_small_item_ranked_lower(self):
        self.assertLess(
            self.item("SKU-017")["current"]["gap"],
            self.item("SKU-013")["current"]["gap"],
        )

    def test_h8_unit_refusal(self):
        self.assertFalse(self.item("SKU-018")["purchase"]["valid"])

    def test_future_purchase_excluded(self):
        d = copy.deepcopy(self.data)
        d["purchases"].append(
            dict(
                id="future",
                date="2026-10-30",
                sku="SKU-001",
                quantity=10,
                cost=999999,
                unit="UN",
            )
        )
        self.assertEqual(
            self.item("SKU-001")["purchase"],
            analyze(d, "2026-10-01", "2026-10-14")["items"][0]["purchase"],
        )

    def test_previous_equal_duration(self):
        self.assertEqual(
            windows("2026-10-01", "2026-10-14")["previous"],
            ["2026-09-18", "2026-10-01"],
        )

    def test_3m_calendar(self):
        self.assertEqual(
            windows("2026-10-01", "2026-10-14")["three"], ["2026-07-01", "2026-10-01"]
        )

    def test_partial_history_marked(self):
        self.assertFalse(
            analyze(self.data, "2025-02-01", "2025-03-01")["complete"]["three"]
        )

    def test_empty_period(self):
        self.assertTrue(
            all(
                i["current"]["margin"] is None
                for i in analyze(self.data, "2027-02-01", "2027-03-01")["items"]
            )
        )

    def test_end_exclusive(self):
        result = analyze(self.data, "2026-10-03", "2026-10-08")
        self.assertTrue(all(i["current"]["count"] == 1 for i in result["items"]))

    def test_duplicate_line_quarantined(self):
        d = copy.deepcopy(self.data)
        d["sales"].append(d["sales"][0].copy())
        rows, issues = validate(d)
        self.assertFalse(any(r["id"] == d["sales"][0]["id"] for r in rows))
        self.assertTrue(any("duplicada" in " ".join(i["reasons"]) for i in issues))

    def test_return_explicit_signed(self):
        d = copy.deepcopy(self.data)
        sale = d["sales"][0]
        r = {
            **sale,
            "id": "return",
            "event": "return",
            "quantity": -sale["quantity"],
            "revenue": -sale["revenue"],
            "cmv": -sale["cmv"],
        }
        d["sales"] = [sale, r]
        rows, _ = validate(d)
        a = aggregate(rows, d)
        self.assertEqual(a["revenue"], 0)
        self.assertIsNone(a["margin"])
        self.assertEqual(a["gross"], 0)

    def test_cancelled_ignored(self):
        d = copy.deepcopy(self.data)
        d["sales"][0]["event"] = "cancelled"
        self.assertEqual(len(validate(d)[0]), len(d["sales"]) - 1)

    def test_meta_missing_not_zero(self):
        d = copy.deepcopy(self.data)
        d["targets"] = []
        self.assertIsNone(
            analyze(d, "2026-10-01", "2026-10-14")["items"][0]["current"]["gap"]
        )

    def test_meta_overlap_rejected(self):
        d = copy.deepcopy(self.data)
        d["targets"].append(d["targets"][0].copy())
        with self.assertRaises(ValueError):
            target_for(d, "SKU-001", "2026-10-03")

    def test_aggregate_gap_can_be_less_than_sku_sum(self):
        items = self.oct["items"]
        a = combine([i["current"] for i in items])
        self.assertLess(a["gap"], sum(i["current"]["gap"] or 0 for i in items))

    def test_no_cmv_flags_confidence(self):
        self.assertEqual(self.item("SKU-005")["confidence"], "Limitada")

    def test_source_ids_evidence(self):
        self.assertEqual(
            len(self.item("SKU-001")["source_ids"]),
            self.item("SKU-001")["evidence_count"],
        )


class Simulator(unittest.TestCase):
    def test_shared_vectors(self):
        for vector in json.loads((ROOT / "tests/vectors.json").read_text(encoding="utf-8")):
            with self.subTest(vector["name"]):
                if vector.get("error"):
                    with self.assertRaises(ValueError):
                        simulate(**vector["input"])
                else:
                    result = simulate(**vector["input"])
                    for key, value in vector["expected"].items():
                        self.assertAlmostEqual(result[key], value)

    def test_javascript_python_parity(self):
        vectors = json.loads((ROOT / "tests/vectors.json").read_text(encoding="utf-8"))
        js = "const m=require('./dist/math.js'),v=require('./tests/vectors.json');console.log(JSON.stringify(v.map(x=>{try{return m.simulate(x.input)}catch(e){return {error:true}}})))"
        result = json.loads(
            subprocess.check_output(["node", "-e", js], cwd=ROOT, text=True, encoding="utf-8")
        )
        for vector, front in zip(vectors, result):
            with self.subTest(vector["name"]):
                if vector.get("error"):
                    self.assertTrue(front["error"])
                else:
                    back = simulate(**vector["input"])
                    for key, val in back.items():
                        if isinstance(val, (float, int)):
                            self.assertAlmostEqual(front[key], val)
                        else:
                            self.assertEqual(front[key], val)

    def test_non_finite(self):
        for v in (float("nan"), float("inf")):
            with self.assertRaises(ValueError):
                simulate(v, 10, 1)

    def test_volume_formula(self):
        a = simulate(10000, 7000, 10)
        b = simulate(12000, 7000, 10)
        self.assertEqual(b["revenue"] - a["revenue"], 20000)
        self.assertEqual(b["gross"] - a["gross"], 20000)


class Narrative(unittest.TestCase):
    def setUp(self):
        self.item = analyze(generate(), "2026-10-01", "2026-10-14")["items"][0]
        self.facts = facts_for(self.item, "2026-10")
        self.response = fallback(self.facts, "2026-10")

    def test_accept_valid(self):
        self.assertEqual(guard(self.response, self.facts, "2026-10"), self.response)

    def test_fake_id(self):
        with self.assertRaises(ValueError):
            guard({**self.response, "fact_id": "fake"}, self.facts, "2026-10")

    def test_wrong_period(self):
        with self.assertRaises(ValueError):
            guard({**self.response, "period": "2025-10"}, self.facts, "2026-10")

    def test_causality_rejected(self):
        with self.assertRaises(ValueError):
            guard(
                {**self.response, "hypothesis": "causou prejuízo"},
                self.facts,
                "2026-10",
            )

    def test_wrong_action(self):
        with self.assertRaises(ValueError):
            guard(
                {**self.response, "action_code": "lower_price"}, self.facts, "2026-10"
            )

    def test_invented_number(self):
        with self.assertRaises(ValueError):
            guard({**self.response, "value": 999}, self.facts, "2026-10")

    def test_no_caveat(self):
        r = self.response.copy()
        del r["caveat"]
        with self.assertRaises(ValueError):
            guard(r, self.facts, "2026-10")

    def test_missing_evidence(self):
        self.assertEqual(
            run(lambda *_: self.response, {}, "2026-10")["mode"], "quality"
        )

    def test_retry_once(self):
        r = run(lambda n, _: self.response if n else {}, self.facts, "2026-10")
        self.assertEqual(len(r["attempts"]), 2)
        self.assertEqual(r["mode"], "verified")

    def test_provider_unavailable(self):
        def failed(*_):
            raise TimeoutError("Indisponível")

        r = run(failed, self.facts, "2026-10")
        self.assertEqual(r["mode"], "rules")
        self.assertEqual(len(r["attempts"]), 2)

    def test_prepared_outputs_real_evidence(self):
        responses = json.loads((ROOT / "data/ai_prepared.json").read_text(encoding="utf-8"))[
            "responses"
        ]
        items = analyze(generate(), "2026-10-01", "2026-10-14")["items"]
        for r in responses:
            i = next(x for x in items if r["fact_id"].startswith(x["sku"] + "|"))
            guard(r, facts_for(i, "2026-10"), "2026-10")


class SnapshotParity(unittest.TestCase):
    def test_front_aggregation_matches_python_for_every_month_and_category(self):
        snap = snapshot(generate())
        batches = []
        for period in snap["months"].values():
            for category in ["", "Alimentos", "Tecnologia", "Casa", "Cuidados"]:
                for window in ("current", "previous", "three"):
                    batches.append(
                        [
                            i[window]
                            for i in period["items"]
                            if not category or i["category"] == category
                        ]
                    )
        script = "const m=require('./dist/math.js');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(s).map(m.aggregate))))"
        result = json.loads(
            subprocess.check_output(
                ["node", "-e", script], input=json.dumps(batches), cwd=ROOT, text=True, encoding="utf-8"
            )
        )
        for batch, front in zip(batches, result):
            self.assertEqual(combine(batch), front)


if __name__ == "__main__":
    unittest.main()
