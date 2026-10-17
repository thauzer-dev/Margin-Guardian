import unittest

from guardian.data import generate
from guardian.engine import snapshot


class DecomposeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snap = snapshot(generate())

    def test_effects_close_exactly_with_margin_change(self):
        for key, month in self.snap["months"].items():
            for ref, d in month["decomposition"].items():
                if d is None:
                    continue
                total = sum(d["effects"].values())
                self.assertAlmostEqual(total, d["total"], places=9, msg=f"{key}/{ref}")

    def test_mix_is_main_driver_of_the_story_period(self):
        d = self.snap["months"]["2026-09"]["decomposition"]["three"]
        self.assertLess(d["effects"]["mix"], -0.02)
        self.assertGreater(abs(d["effects"]["mix"]), abs(d["effects"]["cost"]))

    def test_h7_is_not_critical(self):
        items = self.snap["months"]["2026-10"]["items"]
        h7 = next(i for i in items if i["story"] == "H7")
        self.assertNotEqual(h7["severity"], "Crítico")


if __name__ == "__main__":
    unittest.main()
