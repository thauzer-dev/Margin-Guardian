"""Validação reproduzível e registro de medições, sem dependências Python."""

import json
import os
import datetime
import hashlib
import platform
import subprocess
import sys
import time
import unittest
from pathlib import Path

from build import build, write_manifest
from guardian import __version__
from guardian.narrative import PRIORITY

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tests"))
from evaluate_ai import evaluate
from test_ranges import RANGES


def update_project_page(page, test_count, dom_count):
    import re
    text = page.read_text(encoding="utf-8")
    text = re.sub(r'id="python-count">\d+', f'id="python-count">{test_count}', text)
    if dom_count is not None:
        text = re.sub(r'id="dom-count">\d+', f'id="dom-count">{dom_count}', text)
    page.write_text(text, encoding="utf-8")


def main():
    build()
    start = time.perf_counter()
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
    for script in (ROOT / "dist").glob("*.js"):
        subprocess.run(["node", "--check", str(script)], cwd=ROOT, check=True)
    ai = evaluate()
    snap = json.loads(
        (ROOT / "dist/demo-data.js").read_text(encoding="utf-8").split("=", 1)[1].rstrip(";\n")
    )
    cats = {i["category"] for i in snap["raw"]["products"]}
    vectors = len(json.loads((ROOT / "tests/vectors.json").read_text(encoding="utf-8")))
    parity = snap["snapshot_period_count"] * (len(cats) + 1) * 3
    dom = None
    if os.environ.get("GUARDIAN_DOM_MODULE") or (ROOT / "node_modules/linkedom").exists():
        dom = 0
        for script in ["tests/ui_dom.cjs", "tests/ui_revision45.cjs"]:
            out = subprocess.run(["node", script], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
            if out.returncode:
                raise SystemExit("Verificações de DOM falharam:\n" + out.stdout + out.stderr)
            dom += out.stdout.count("OK ")
    report = dict(
        version=__version__,
        diagnostic_fact_types=len(PRIORITY),
        interactive_barrier_cases=6,
        date=datetime.date.today().isoformat(),
        python=platform.python_version(),
        platform=platform.system(),
        tests=result.testsRun,
        passed=True,
        seconds=round(time.perf_counter() - start, 3),
        simulation_vectors=vectors,
        aggregate_parity_scenarios=parity,
        custom_date_ranges=len(RANGES),
        range_sku_pairs=len(RANGES)*len(snap["raw"]["products"]),
        filtered_decomposition_scenarios=len(RANGES)*3*3*2,
        payload_bytes=(ROOT / "dist/demo-data.js").stat().st_size,
        daily_payload_bytes=(ROOT / "dist/daily-data.js").stat().st_size,
        default_dataset="synthetic-daily-v1",
        daily_parity_skus=20,
        import_and_insight_node_checks=15,
        real_data_validation=False,
        ai_fixtures=len(ai["cases"]),
        prepared_ai_samples=len(json.loads((ROOT / "reports/ai_provenance.json").read_text(encoding="utf-8"))["prepared_verified"]),
        native_windows_test=False,
        browser_visual_test=False,
        dom_checks=dom if dom is not None else "não executado (instale linkedom 0.18.12 para rodar tests/ui_dom.cjs)",
    )
    (ROOT / "reports/validation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    for name in ["validation.json", "ai_evaluation.json", "ai_provenance.json"]:
        (ROOT / "dist" / name).write_bytes((ROOT / "reports" / name).read_bytes())
    update_project_page(ROOT / "dist/projeto.html", result.testsRun, dom)
    write_manifest()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
