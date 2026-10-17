"""12 fixtures adversariais de transporte; não mede qualidade de um LLM externo."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from guardian.data import generate
from guardian.engine import analyze
from guardian.narrative import facts_for, fallback, run


def evaluate():
    item = analyze(generate(), "2026-10-01", "2026-10-14")["items"][0]
    facts = facts_for(item, "2026-10")
    valid = fallback(facts, "2026-10")
    cases = [
        ("válido", valid),
        ("ID inexistente", {**valid, "fact_id": "não-existe"}),
        ("período errado", {**valid, "period": "2025-10"}),
        ("ação contraditória", {**valid, "action_code": "lower_price"}),
        ("causalidade excessiva", {**valid, "hypothesis": "provou fraude"}),
        ("número inventado", {**valid, "amount": 9999}),
        ("tipo trocado", {**valid, "insight_type": "mix"}),
        ("ressalva falsa", {**valid, "caveat": "lucro garantido"}),
        ("esquema ausente", {}),
        ("campo não textual", {**valid, "period": 202610}),
    ]
    results = []
    for name, response in cases:
        result = run(lambda *_: response, facts, "2026-10")
        results.append(dict(case=name, **result))
    results.append(
        dict(
            case="correção na segunda tentativa",
            **run(lambda n, _: valid if n else {}, facts, "2026-10"),
        )
    )
    results.append(dict(case="sem dados", **run(lambda *_: valid, {}, "2026-10")))
    report = dict(
        kind="Avaliação controlada com respostas simuladas, não benchmark de um provedor",
        cases=results,
        first_pass=sum(
            r["mode"] == "verified" and len(r["attempts"]) == 1 for r in results
        ),
        retry_pass=sum(
            r["mode"] == "verified" and len(r["attempts"]) == 2 for r in results
        ),
        fallback=sum(r["mode"] == "rules" for r in results),
        quality=sum(r["mode"] == "quality" for r in results),
        invented_number_rejected=next(
            r["mode"] == "rules" for r in results if r["case"] == "número inventado"
        ),
    )
    (ROOT / "reports/ai_evaluation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


if __name__ == "__main__":
    r = evaluate()
    print({k: v for k, v in r.items() if k != "cases"})
