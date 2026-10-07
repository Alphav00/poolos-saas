"""
Golden outputs from the original Liner Measure Pro backend (Python).

The TypeScript port in this package must reproduce these exactly. Run with the
backend's own Python 3.11 environment (the version it is deployed on):

    LMP_BACKEND=/path/to/liner-measure-pro/backend \
      python3.11 packages/measure-core/oracle/generate.py

Writes test/goldens/*.json. Every case is computed by the original code paths:
FastAPI route handlers' logic, the pydantic models, ab_math, liner_math,
liner_takeoff and both order-form builders. PDFs are captured as the list of
ReportLab flowables (text, tables, column widths, styles) the builder hands to
SimpleDocTemplate, so the port is checked on content and layout, not bytes.
"""
from __future__ import annotations

import copy
import gzip
import json
import os
import random
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, os.environ.get("LMP_BACKEND", "../liner-measure-pro/backend"))

from pydantic import ValidationError  # noqa: E402

from app.models import PoolJob, PoolJobCreate, LinerShape  # noqa: E402
from app.services import liner_order_form as lof  # noqa: E402
from app.services import order_form as cof  # noqa: E402
from app.services.ab_math import perimeter_for_math, reconstruct_pool, validate_ab_line  # noqa: E402
from app.models import ReconstructedPool  # noqa: E402
from app.services.fixtures import FIXTURES  # noqa: E402
from app.services.liner_takeoff import build_liner_takeoff  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "test" / "goldens"
OUT.mkdir(parents=True, exist_ok=True)

FIXED_ID = "00000000-0000-4000-8000-000000000000"
FIXED_TS = "2026-08-08T12:00:00"


# ---------- flowable capture ----------

def _color(c):
    try:
        return "#%06x" % int(c.hexval(), 16)
    except Exception:
        return str(c)


def _cmd(cmd):
    out = []
    for x in cmd:
        if hasattr(x, "hexval"):
            out.append(_color(x))
        elif isinstance(x, tuple):
            out.append(list(x))
        else:
            out.append(x)
    return out


class _Capture:
    def __init__(self, buf, **kwargs):
        self.kwargs = kwargs
        self.flow = None

    def build(self, flow):
        _Capture.last = {"title": self.kwargs.get("title"), "flow": [_flowable(f) for f in flow]}


def _flowable(f):
    name = type(f).__name__
    if name == "Paragraph":
        return {"t": "p", "style": f.style.name, "text": f.text}
    if name == "Spacer":
        return {"t": "sp", "h": round(f.height, 6)}
    if name == "PageBreak":
        return {"t": "pb"}
    if name == "Table":
        return {
            "t": "tbl",
            "rows": f._cellvalues,
            "colWidths": [round(w, 6) for w in f._colWidths],
            "repeatRows": f.repeatRows,
            "style": [_cmd(c) for c in getattr(f, "_captured_style", [])],
        }
    raise TypeError(name)


_orig_set_style = None


def _patch():
    import reportlab.platypus.tables as tables

    global _orig_set_style
    _orig_set_style = tables.Table.setStyle

    def set_style(self, style):
        cmds = style.getCommands() if hasattr(style, "getCommands") else list(style)
        self._captured_style = getattr(self, "_captured_style", []) + [tuple(c) for c in cmds]
        return _orig_set_style(self, style)

    tables.Table.setStyle = set_style
    cof.SimpleDocTemplate = _Capture
    lof.SimpleDocTemplate = _Capture


def _flow_of(builder, job):
    _Capture.last = None
    builder(job)
    return _Capture.last


# ---------- endpoint logic (mirrors app/main.py) ----------

def reconstruct_endpoint(job: PoolJob):
    m = job.measurement
    result = reconstruct_pool(
        [(p.number, float(p.a_distance_ft), float(p.b_distance_ft)) for p in perimeter_for_math(m)],
        ab_distance=float(m.ab_distance_ft),
        shallow_depth_ft=float(m.shallow_depth_ft),
        deep_depth_ft=float(m.deep_depth_ft),
    )
    return ReconstructedPool(
        ab_distance_ft=m.ab_distance_ft,
        points=[
            dict(number=p.number, x_ft=p.x, y_ft=p.y, quality=p.quality, quality_reason=p.quality_reason)
            for p in result.points
        ],
        perimeter_ft=result.perimeter_ft,
        area_sqft=result.area_sqft,
        length_ft=result.length_ft,
        width_ft=result.width_ft,
        depth_avg_ft=result.depth_avg_ft,
    ).model_dump(mode="json")


def validate_endpoint(job: PoolJob):
    m = job.measurement
    return {"warnings": validate_ab_line(float(m.ab_distance_ft), float(m.ab_offset_from_pool_ft), m.perimeter_points)}


def _err(status, detail):
    return {"error": {"status": status, "detail": detail}}


def liner_takeoff_endpoint(job: PoolJob):
    if not job.needs_liner:
        return _err(400, f"Job product type is '{job.product_type.value}'. Set it to 'liner' or 'both' before running liner operations.")
    return build_liner_takeoff(job).model_dump(mode="json")


def liner_order_form_endpoint(job: PoolJob):
    if not job.needs_liner:
        return _err(400, "not liner")
    try:
        form = lof.build_liner_order_form_json(job).model_dump(mode="json")
    except lof.LinerOrderBlocked as exc:
        return _err(422, {"message": "Liner order blocked: the measurements do not close.", "blocking": exc.reasons})
    form.pop("job")
    return form


def liner_pdf_flow(job: PoolJob):
    if not job.needs_liner:
        return _err(400, "not liner")
    try:
        return _flow_of(lof.build_liner_order_form_pdf, job)
    except lof.LinerOrderBlocked as exc:
        return _err(422, {"message": "Liner order blocked: the measurements do not close.", "blocking": exc.reasons})


def cover_order_form(job: PoolJob):
    form = cof.build_order_form_json(job).model_dump(mode="json")
    form.pop("job")
    return form


def _pin(job_json: dict) -> dict:
    job_json = copy.deepcopy(job_json)
    job_json["id"] = FIXED_ID
    job_json["created_at"] = FIXED_TS
    job_json["updated_at"] = FIXED_TS
    return job_json


def run_case(name: str, job_json: dict) -> dict:
    job = PoolJob.model_validate(job_json)
    out = {
        "name": name,
        "job": job.model_dump(mode="json"),
        "reconstruct": reconstruct_endpoint(job),
        "validate": validate_endpoint(job),
        "order_form": cover_order_form(job),
        "order_form_pdf": _flow_of(cof.build_order_form_pdf, job),
        "liner_takeoff": liner_takeoff_endpoint(job),
        "liner_order_form": liner_order_form_endpoint(job),
        "liner_order_form_pdf": liner_pdf_flow(job),
    }
    return out


# ---------- cases ----------

def fixture_json(name: str) -> dict:
    return _pin(FIXTURES[name]().model_dump(mode="json"))


def variants() -> list[tuple[str, dict]]:
    cases: list[tuple[str, dict]] = []
    for name in FIXTURES:
        cases.append((name, fixture_json(name)))

    def mod(base, label, fn):
        j = fixture_json(base)
        fn(j)
        cases.append((f"{base}:{label}", j))

    m = lambda j: j["measurement"]  # noqa: E731
    L = lambda j: j["measurement"]["liner"]  # noqa: E731

    for base in ["rectangular", "kidney", "freeform", "kidney-liner"]:
        mod(base, "swap_ab", lambda j: m(j).__setitem__("swap_ab", True))
    mod("rectangular", "short_tapes", lambda j: m(j)["perimeter_points"][3].update(a_distance_ft="2", b_distance_ft="3"))
    mod("rectangular", "inconsistent", lambda j: m(j)["perimeter_points"][4].update(a_distance_ft="40", b_distance_ft="3"))
    mod("rectangular", "collinear", lambda j: m(j)["perimeter_points"][5].update(a_distance_ft="10", b_distance_ft="14.02"))
    mod("rectangular", "at_stake", lambda j: m(j)["perimeter_points"][6].update(a_distance_ft="0", b_distance_ft="24"))

    def mostly_invalid(j):
        for p in m(j)["perimeter_points"][2:]:
            p.update(a_distance_ft="1", b_distance_ft="1")
    mod("rectangular", "mostly_invalid", mostly_invalid)
    mod("rectangular", "offset_low", lambda j: m(j).__setitem__("ab_offset_from_pool_ft", "2.5"))
    mod("rectangular", "zero_depths", lambda j: m(j).update(shallow_depth_ft="0", deep_depth_ft="0"))

    def cover_extras(j):
        m(j)["spa"] = {"flush_with_pool": True, "spillover": False, "separate_cover": True, "from_point": 3, "to_point": 9}
        m(j)["step"] = {"location": "left", "size_length_ft": "4.5", "size_width_ft": "6", "offset_ft": "0"}
        m(j)["obstacles"] = [{"kind": "ladder", "description": None}, {"kind": "slide_leg", "front_point": 4}]
        m(j)["perimeter_points"][1]["notes"] = "skimmer"
        m(j)["perimeter_points"][2]["is_obstacle"] = True
        m(j)["ab_note"] = None
        j["cover_spec"].update(overlap_planter_in="18", spacing="3x3", anchor_type="wood_deck", type="solid")
        j["hardware"].update(y_straps=2, wood_deck_anchors=4, beauty_rings=3, lawn_stakes=6,
                             paver_tubes_ft="12.5", perimeter_padding_from_pt=3, perimeter_padding_to_pt=9)
        j["notes"] = "Gate code is on the work order. Dog in yard & <friendly>."
        j["meta"].update(customer_address=None, customer_phone=None, customer_email=None, photos_attached=True)
    mod("kidney", "cover_extras", cover_extras)

    def hw_entire(j):
        j["hardware"].update(beauty_rings_entire_pool=True, perimeter_padding_entire_pool=True)
        j["cover_spec"]["overlap_planter_in"] = "0"
    mod("freeform", "hardware_entire", hw_entire)
    mod("freeform", "paver_only", lambda j: j["hardware"].update(paver_tubes_ft="0.5"))

    # ---- liner ----
    def seg(j, i, **kw):
        L(j)["profile_segments"][i].update(**kw)

    mod("rectangular-liner", "profile_warn", lambda j: seg(j, 0, horizontal_run_ft="12.08"))
    mod("rectangular-liner", "profile_fail", lambda j: seg(j, 0, horizontal_run_ft="12.5"))
    mod("rectangular-liner", "profile_edge", lambda j: seg(j, 0, horizontal_run_ft="12.1666666667"))
    mod("rectangular-liner", "no_profile", lambda j: L(j).__setitem__("profile_segments", []))
    mod("rectangular-liner", "gap", lambda j: seg(j, 1, depth_start_ft="3.75"))
    mod("rectangular-liner", "no_hopper", lambda j: L(j).__setitem__("hopper", None))
    mod("rectangular-liner", "hopper_warn", lambda j: L(j)["hopper"].update(left_slope_width_ft="5.1"))
    mod("rectangular-liner", "hopper_fail", lambda j: L(j)["hopper"].update(left_slope_width_ft="6"))
    mod("rectangular-liner", "hopper_no_m", lambda j: L(j)["hopper"].update(bottom_length_ft=None))
    mod("rectangular-liner", "riser_warn", lambda j: L(j)["steps"][0]["risers"][2].update(riser_height_ft="1.03"))
    mod("rectangular-liner", "riser_fail", lambda j: L(j)["steps"][0]["risers"][2].update(riser_height_ft="1.2"))
    mod("rectangular-liner", "no_risers", lambda j: L(j)["steps"][0].__setitem__("risers", []))
    mod("rectangular-liner", "step_no_width_corner", lambda j: L(j)["steps"][0].update(width_ft=None, corner_type=None))
    mod("rectangular-liner", "complex_step", lambda j: L(j)["steps"][0].update(construction="vinyl_over_complex"))
    mod("rectangular-liner", "fiberglass_step", lambda j: L(j)["steps"][0].update(construction="fiberglass_standard"))
    mod("rectangular-liner", "spec_steps_none", lambda j: L(j).__setitem__("steps", []))
    mod("rectangular-liner", "no_walls", lambda j: L(j).__setitem__("wall_heights", []))
    mod("rectangular-liner", "wall_spread", lambda j: L(j)["wall_heights"][2].update(height_ft="4")
        )
    mod("rectangular-liner", "no_fittings", lambda j: L(j).__setitem__("fittings", []))
    mod("rectangular-liner", "no_skimmer_drain", lambda j: L(j).__setitem__("fittings", [f for f in L(j)["fittings"] if f["kind"] == "return"]))
    mod("rectangular-liner", "coping_walk", lambda j: j["liner_spec"].update(measured_at_bead_receiver=False))
    mod("rectangular-liner", "no_pattern", lambda j: j["liner_spec"].update(pattern_name="   "))
    mod("rectangular-liner", "rain", lambda j: L(j).update(recent_rainfall_days=5))
    mod("rectangular-liner", "stone_undrained", lambda j: (L(j).update(drainage_system="none", hydrostatic_relief_valve=True), j["liner_spec"].update(coping_type="stone")))
    mod("rectangular-liner", "unknown_drainage", lambda j: L(j).update(drainage_system="unknown"))
    mod("rectangular-liner", "deep_mismatch", lambda j: m(j).update(deep_depth_ft="9.5"))
    mod("rectangular-liner", "depths_swapped", lambda j: m(j).update(deep_depth_ft="3", shallow_depth_ft="8"))
    mod("rectangular-liner", "no_liner", lambda j: m(j).__setitem__("liner", None))
    mod("rectangular-liner", "as_cover", lambda j: j.__setitem__("product_type", "cover"))
    mod("rectangular-liner", "tile_border", lambda j: j["liner_spec"].update(tile_border=True, tile_border_pattern="Blue Glass 6in", pattern_code=None))
    mod("rectangular-liner", "tile_border_plain", lambda j: j["liner_spec"].update(tile_border=True))
    mod("rectangular-liner", "waste_25", lambda j: j["liner_spec"].update(waste_factor_pct="25"))
    mod("rectangular-liner", "fitting_ab", lambda j: L(j)["fittings"].append({"kind": "step_jet", "a_distance_ft": "10.25", "b_distance_ft": "18.5", "label": None}))
    mod("rectangular-liner", "shallow_label_missing", lambda j: L(j)["wall_heights"][0].update(label="end_one"))

    def sparse(j):
        m(j)["perimeter_points"] = m(j)["perimeter_points"][:6]
    mod("kidney-liner", "sparse_plot", sparse)
    mod("rectangular-liner", "sparse_standard", sparse)
    mod("kidney-liner", "stone_coping", lambda j: j["liner_spec"].update(coping_type="stone"))
    mod("kidney-liner", "notes", lambda j: j.__setitem__("notes", "Customer wants pattern sample left."))

    # Seeded random pools: exercise every rounding path in the floats.
    rng = random.Random(20261007)
    for k in range(60):
        base = rng.choice(list(FIXTURES))
        j = fixture_json(base)
        ab = rng.choice([12, 18.5, 24, 30.25, 40, 47.125, 50])
        m(j)["ab_distance_ft"] = str(ab)
        for p in m(j)["perimeter_points"]:
            p["a_distance_ft"] = f"{rng.uniform(3, 60):.{rng.choice([0, 1, 2, 3])}f}"
            p["b_distance_ft"] = f"{rng.uniform(3, 60):.{rng.choice([0, 1, 2, 3])}f}"
        m(j)["shallow_depth_ft"] = str(rng.choice([3, 3.25, 3.5, 4.125]))
        m(j)["deep_depth_ft"] = str(rng.choice([6, 7.5, 8.125, 9.33]))
        m(j)["swap_ab"] = rng.random() < 0.2
        if m(j).get("liner"):
            for s in L(j)["profile_segments"]:
                s["horizontal_run_ft"] = f"{rng.uniform(4, 20):.2f}" if s["kind"] != "break" else "0"
            for w in L(j)["wall_heights"]:
                w["height_ft"] = f"{rng.uniform(3, 4.5):.3f}"
            for st in L(j)["steps"]:
                for r in st["risers"]:
                    r["riser_height_ft"] = f"{rng.uniform(0.8, 1.4):.2f}"
            j["liner_spec"]["waste_factor_pct"] = str(rng.choice([0, 7.5, 10, 12.5]))
            if L(j).get("hopper"):
                L(j)["hopper"]["bottom_width_ft"] = f"{rng.uniform(5, 12):.2f}"
        cases.append((f"random-{k:03d}", j))
    return cases


def validation_cases() -> list[dict]:
    """Request bodies for POST /api/jobs, as JSON text, and what pydantic made of them."""
    base = FIXTURES["rectangular-liner"]().model_dump(mode="json")
    create = {k: base[k] for k in ["meta", "product_type", "measurement", "cover_spec", "liner_spec", "hardware", "notes"]}
    minimal = {
        "meta": {"customer_name": "Min", "dealer_name": "D", "date": "2026-08-08T09:30:00"},
        "measurement": {
            "ab_distance_ft": 20, "shape_type": "rectangular",
            "perimeter_points": [{"number": i, "a_distance_ft": 10 + i, "b_distance_ft": 12.5} for i in range(1, 5)],
            "deck": {"min_width_ft": 3}, "shallow_depth_ft": 3.5, "deep_depth_ft": 8,
        },
    }
    out: list[dict] = []

    def add(name, body, raw=None):
        text = raw if raw is not None else json.dumps(body)
        try:
            parsed = PoolJobCreate.model_validate(json.loads(text))
            result = {"ok": True, "value": parsed.model_dump(mode="json")}
        except ValidationError as e:
            result = {"ok": False, "errors": [{"loc": list(x["loc"]), "type": x["type"]} for x in e.errors()]}
        out.append({"name": name, "body": text, **result})

    def tweak(name, fn, src=minimal):
        b = copy.deepcopy(src)
        fn(b)
        add(name, b)

    add("full", create)
    add("minimal", minimal)
    add("float_literals", None, raw=json.dumps(minimal).replace('"ab_distance_ft": 20', '"ab_distance_ft": 20.0').replace('"deep_depth_ft": 8', '"deep_depth_ft": 8.10'))
    add("exp_literal", None, raw=json.dumps(minimal).replace('"ab_distance_ft": 20', '"ab_distance_ft": 2.5e1'))
    tweak("decimal_strings", lambda b: b["measurement"].update(ab_distance_ft="20.50", shallow_depth_ft=" 3.25 ", deep_depth_ft="8.000"))
    tweak("decimal_bad_string", lambda b: b["measurement"].update(ab_distance_ft="twenty"))
    tweak("decimal_bool", lambda b: b["measurement"].update(ab_distance_ft=True))
    tweak("decimal_null", lambda b: b["measurement"].update(ab_distance_ft=None))
    tweak("ab_too_short", lambda b: b["measurement"].update(ab_distance_ft=9.99))
    tweak("ab_too_long", lambda b: b["measurement"].update(ab_distance_ft=100.5))
    tweak("ab_edges", lambda b: b["measurement"].update(ab_distance_ft=10, ab_offset_from_pool_ft=20))
    tweak("three_points", lambda b: b["measurement"].__setitem__("perimeter_points", b["measurement"]["perimeter_points"][:3]))
    tweak("dup_points", lambda b: b["measurement"]["perimeter_points"][1].update(number=1))
    tweak("gap_points", lambda b: b["measurement"]["perimeter_points"][3].update(number=7))
    tweak("negative_tape", lambda b: b["measurement"]["perimeter_points"][0].update(a_distance_ft=-1))
    tweak("point_zero", lambda b: b["measurement"]["perimeter_points"][0].update(number=0))
    tweak("int_as_string", lambda b: b["measurement"]["perimeter_points"][0].update(number="1"))
    tweak("int_as_float", lambda b: b["measurement"]["perimeter_points"][0].update(number=1.0))
    tweak("int_as_fraction", lambda b: b["measurement"]["perimeter_points"][0].update(number=1.5))
    tweak("bad_enum", lambda b: b["measurement"].update(shape_type="hexagon"))
    tweak("bad_product", lambda b: b.update(product_type="tarp"))
    tweak("missing_meta_name", lambda b: b["meta"].pop("customer_name"))
    tweak("missing_measurement", lambda b: b.pop("measurement"))
    tweak("extra_fields", lambda b: (b.update(surprise=1), b["measurement"].update(extra="x")))
    tweak("cross_same", lambda b: b["measurement"].__setitem__("cross_dimensions", [{"from_point": 2, "to_point": 2, "distance_ft": 5}]))
    tweak("cross_ok", lambda b: b["measurement"].__setitem__("cross_dimensions", [{"from_point": 1, "to_point": 3, "distance_ft": "17.25"}]))
    tweak("breakoff_bad_side", lambda b: b["measurement"].__setitem__("break_off_points", [{"side": "middle", "from_point": 1, "to_point": 2, "distance_ft": 4}]))
    tweak("step_bad_location", lambda b: b["measurement"].__setitem__("step", {"location": "middle", "size_length_ft": 4, "size_width_ft": 6}))
    tweak("deck_wood", lambda b: b["measurement"]["deck"].update(deck_type="wood", wood_deck_anchors_needed="true", diving_board=1))
    tweak("deck_bad_type", lambda b: b["measurement"]["deck"].update(deck_type="brick"))
    tweak("bool_strings", lambda b: b["meta"].update(photos_attached="yes"))
    tweak("bool_bad", lambda b: b["meta"].update(photos_attached="maybe"))
    tweak("date_only", lambda b: b["meta"].update(date="2026-08-08"))
    tweak("date_z", lambda b: b["meta"].update(date="2026-08-08T10:15:00Z"))
    tweak("date_offset_frac", lambda b: b["meta"].update(date="2026-08-08T10:15:00.5+02:00"))
    tweak("date_bad", lambda b: b["meta"].update(date="last tuesday"))
    tweak("cover_spec_bad", lambda b: b.__setitem__("cover_spec", {"overlap_standard_in": 30}))
    tweak("hardware_values", lambda b: b.__setitem__("hardware", {"y_straps": 2, "paver_tubes_ft": 3.5, "perimeter_padding_from_pt": 2}))
    tweak("notes_null", lambda b: b.update(notes=None))
    full = create

    def lt(name, fn):
        b = copy.deepcopy(full)
        fn(b)
        add(name, b)

    lt("liner_seg_order_gap", lambda b: b["measurement"]["liner"]["profile_segments"][2].update(order=5))
    lt("liner_break_with_run", lambda b: b["measurement"]["liner"]["profile_segments"][1].update(kind="break"))
    lt("liner_wall_dup", lambda b: b["measurement"]["liner"]["wall_heights"][1].update(label=" Shallow_End "))
    lt("liner_wall_zero", lambda b: b["measurement"]["liner"]["wall_heights"][1].update(height_ft=0))
    lt("liner_wall_label_long", lambda b: b["measurement"]["liner"]["wall_heights"][1].update(label="x" * 65))
    lt("liner_riser_dup", lambda b: b["measurement"]["liner"]["steps"][0]["risers"][1].update(index=1))
    lt("liner_fitting_unlocatable", lambda b: b["measurement"]["liner"]["fittings"].append({"kind": "light", "a_distance_ft": 3}))
    lt("liner_thickness_str", lambda b: b["liner_spec"].update(thickness_mil="30"))
    lt("liner_thickness_bad", lambda b: b["liner_spec"].update(thickness_mil=25))
    lt("liner_rain_high", lambda b: b["measurement"]["liner"].update(recent_rainfall_days=31))
    lt("liner_step_location_bad", lambda b: b["measurement"]["liner"]["steps"][0].update(location="corner"))
    lt("liner_pattern_long", lambda b: b["liner_spec"].update(pattern_name="p" * 121))
    lt("liner_shape_bad", lambda b: b["measurement"]["liner"].update(shape="blob"))
    lt("liner_defaults", lambda b: b["measurement"].__setitem__("liner", {}))
    return out


def main():
    _patch()
    cases = [run_case(n, j) for n, j in variants()]
    (OUT / "cases.json.gz").write_bytes(gzip.compress(json.dumps(cases, separators=(",", ":"), sort_keys=True).encode(), mtime=0))
    fixtures = {name: FIXTURES[name]().model_dump(mode="json") for name in FIXTURES}
    for f in fixtures.values():
        for k in ("id", "created_at", "updated_at"):
            f.pop(k)
    (OUT / "fixtures.json").write_text(json.dumps(fixtures, indent=1, sort_keys=True))
    (OUT / "validation.json").write_text(json.dumps(validation_cases(), indent=1, sort_keys=True))
    shapes = [
        {"value": s.value, "label": s.value.replace("_", " ").title(), "requires_ab_plot": s.requires_ab_plot()}
        for s in LinerShape
    ]
    (OUT / "shapes.json").write_text(json.dumps(shapes, indent=1))
    print(f"{len(cases)} cases, {len(fixtures)} fixtures written to {OUT}")


if __name__ == "__main__":
    main()
