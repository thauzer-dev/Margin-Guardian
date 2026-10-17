"""Regenera dados, snapshot e narrativas verificadas; somente biblioteca padrão."""

import hashlib
import json
from pathlib import Path

from guardian.data import generate, validate as validate_data
from guardian.synthetic import generate_daily
from guardian.engine import snapshot, target_for, target_index
from guardian.narrative import (
    ACTIONS,
    PROMPT_VERSION,
    TEXT,
    facts_for,
    select_narrative,
    validate,
)

ROOT = Path(__file__).resolve().parent


def build():
    data = generate()
    snap = snapshot(data)
    prepared = json.loads((ROOT / "data/ai_prepared.json").read_text(encoding="utf-8"))
    by_id = {r["fact_id"]: r for r in prepared["responses"]}
    if len(by_id) != len(prepared["responses"]):
        raise ValueError("Narrativa preparada duplicada.")
    verified = []
    for period, month in snap["months"].items():
        for item in month["items"]:
            facts = facts_for(item, period)
            narrative = select_narrative(facts, period, prepared["responses"])
            item["narrative"] = narrative
            for fact in facts.values():
                if fact["id"] in by_id:
                    validate(by_id[fact["id"]], facts, period)
                    verified.append(fact["id"])
    if set(verified) != set(by_id):
        raise ValueError("Narrativa preparada não está vinculada a evidência atual.")
    targets = target_index(data)
    rows, issues = validate_data(data)
    snap["raw"] = dict(products=data["products"], purchases=data["purchases"],
                       sales=[{**r, "target_bps": target_for(data, r["sku"], r["date"], index=targets)} for r in rows],
                       issues=issues, history_start=data["history_start"], as_of=data["as_of"],
                       rules=data["rules"], targets=data["targets"])
    snap["history_note"] = data["synthetic_history"]
    snap["prepared_responses"] = prepared["responses"]
    snap["narrative_text"] = TEXT
    snap["actions"] = ACTIONS
    snap["ai_provenance"] = prepared["provenance"]
    snap["dataset_hash"] = hashlib.sha256(
        json.dumps(data, sort_keys=True).encode()
    ).hexdigest()
    snap["source"] = dict(
        products=len(data["products"]),
        sales=len(data["sales"]),
        purchases=len(data["purchases"]),
    )
    (ROOT / "data/demo.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    # A interface dinâmica não precisa levar snapshots mensais duplicados.
    snap["snapshot_period_count"] = len(snap.pop("months"))
    snap.pop("history")
    (ROOT / "dist/demo-data.js").write_text(
        "window.GUARDIAN_DATA="
        + json.dumps(snap, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    daily = generate_daily()
    daily_targets = target_index(daily)
    daily_rows, daily_issues = validate_data(daily)
    daily_snap = {**snap, "prepared_responses": [],
        "ai_provenance": {"mode": "rules", "live_api": False, "prompt_version": PROMPT_VERSION}, "source": {
        "products": len(daily["products"]), "sales": len(daily["sales"]),
        "purchases": len(daily["purchases"])},
        "history_note": daily["synthetic_history"], "dataset_kind": "daily",
        "dataset_hash": hashlib.sha256(json.dumps(daily, sort_keys=True).encode()).hexdigest(),
        "raw": {**daily, "issues": daily_issues, "sales": [
            {**r, "target_bps": target_for(daily, r["sku"], r["date"], index=daily_targets)}
            for r in daily_rows]}}
    (ROOT / "dist/daily-data.js").write_text(
        "window.GUARDIAN_DAILY=" + json.dumps(daily_snap, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    log = dict(
        prompt_version=PROMPT_VERSION,
        prepared_prompt_version=prepared["provenance"]["prompt_version"],
        prepared_verified=verified,
        mode="offline-prepared",
        prepared_dataset_kind="legacy-didactic",
        default_dataset_kind="synthetic-daily-v1",
        live_api=False,
        dataset_hash=snap["dataset_hash"],
    )
    (ROOT / "reports/ai_provenance.json").write_text(
        json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        "Snapshot gerado:",
        snap["source"],
        "/ narrativas preparadas verificadas:",
        len(verified),
    )


def write_manifest():
    """Regenera MANIFEST_SHA256.txt com os arquivos entregues."""
    skip = {"MANIFEST_SHA256.txt"}
    lines = []
    for p in sorted(ROOT.rglob("*")):
        rel = p.relative_to(ROOT).as_posix()
        if p.is_file() and p.name not in skip and "__pycache__" not in rel and not any(part.startswith(".") for part in p.relative_to(ROOT).parts) and not rel.startswith(("node_modules", "interno")):
            lines.append(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {rel}")
    (ROOT / "MANIFEST_SHA256.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build()
