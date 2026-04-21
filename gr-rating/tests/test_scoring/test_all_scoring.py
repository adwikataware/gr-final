"""Phase 2 scoring tests — ALL must pass before moving to Phase 3."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.scoring.saturation import saturation_score
from app.scoring.pillar1 import pillar1_score
from app.scoring.pillar2 import pillar2_score
from app.scoring.pillar3 import pillar3_score
from app.scoring.pillar4 import pillar4_score
from app.scoring.pillar5 import pillar5_score
from app.scoring.composite import compute_gr_rating, classify_tier


# ── Saturation function ──────────────────────────────────────────────

def test_saturation_zero():
    assert saturation_score(0, 3) == 0.0

def test_saturation_half():
    assert saturation_score(3, 3) == 50.0

def test_saturation_never_100():
    assert saturation_score(1_000_000, 3) < 100.0

def test_saturation_negative():
    assert saturation_score(-5, 3) == 0.0

def test_saturation_both_zero():
    assert saturation_score(0, 0) == 0.0


# ── Pillar 5 always 50 ──────────────────────────────────────────────

def test_pillar5():
    result = pillar5_score()
    assert result["p5_score"] == 50.0


# ── Dr. Mahalle — 84.4 ± 0.5 (GR-B) ────────────────────────────────

def test_mahalle_p1():
    result = pillar1_score(h_index=29, total_citations=4715, publications=440, i10_index=75)
    assert 94.5 <= result["p1_score"] <= 95.5, f"Mahalle P1: {result['p1_score']}"

def test_mahalle_p2():
    result = pillar2_score(fwci=1.6, citation_velocity=188, recency_index=1.3, topic_prominence_cagr=25)
    assert 86.5 <= result["p2_score"] <= 87.5, f"Mahalle P2: {result['p2_score']}"

def test_mahalle_p3():
    result = pillar3_score(sdg_count=5, sdg_mean_confidence=0.55, oa_percentage=35, societal_mentions=12)
    assert 75.5 <= result["p3_score"] <= 77.0, f"Mahalle P3: {result['p3_score']}"

def test_mahalle_p4():
    result = pillar4_score(total_patents=117, books_authored=15, books_edited=60, unique_funders=5, patent_links=10)
    assert 89.5 <= result["p4_score"] <= 91.0, f"Mahalle P4: {result['p4_score']}"

def test_mahalle_gr_rating():
    p1 = pillar1_score(h_index=29, total_citations=4715, publications=440, i10_index=75)
    p2 = pillar2_score(fwci=1.6, citation_velocity=188, recency_index=1.3, topic_prominence_cagr=25)
    p3 = pillar3_score(sdg_count=5, sdg_mean_confidence=0.55, oa_percentage=35, societal_mentions=12)
    p4 = pillar4_score(total_patents=117, books_authored=15, books_edited=60, unique_funders=5, patent_links=10)
    gr = compute_gr_rating(p1["p1_score"], p2["p2_score"], p3["p3_score"], p4["p4_score"])
    assert 83.9 <= gr["gr_rating"] <= 84.9, f"Mahalle GR: {gr['gr_rating']}"
    assert gr["tier"] == "GR-B"


# ── Dr. Guo — GR-A (87+) ────────────────────────────────────────────

def test_guo_gr_rating():
    p1 = pillar1_score(h_index=130, total_citations=115000, publications=1327, i10_index=900)
    p2 = pillar2_score(fwci=3.5, citation_velocity=4600, recency_index=1.2, topic_prominence_cagr=22)
    p3 = pillar3_score(sdg_count=6, sdg_mean_confidence=0.6, oa_percentage=45, societal_mentions=120)
    p4 = pillar4_score(total_patents=23, books_authored=5, books_edited=20, unique_funders=12, patent_links=25)
    gr = compute_gr_rating(p1["p1_score"], p2["p2_score"], p3["p3_score"], p4["p4_score"])
    assert gr["gr_rating"] >= 85, f"Guo GR: {gr['gr_rating']}"
    assert gr["tier"] == "GR-A"


# ── Dr. Salve — GR-D (40-45) ────────────────────────────────────────

def test_salve_gr_rating():
    p1 = pillar1_score(h_index=4, total_citations=49, publications=15, i10_index=2)
    p2 = pillar2_score(fwci=0.5, citation_velocity=10, recency_index=0.6, topic_prominence_cagr=20)
    p3 = pillar3_score(sdg_count=1, sdg_mean_confidence=0.42, oa_percentage=20, societal_mentions=0)
    p4 = pillar4_score(total_patents=0, books_authored=0, books_edited=0, unique_funders=0, patent_links=0)
    gr = compute_gr_rating(p1["p1_score"], p2["p2_score"], p3["p3_score"], p4["p4_score"])
    assert 40 <= gr["gr_rating"] <= 45, f"Salve GR: {gr['gr_rating']}"
    assert gr["tier"] == "GR-D"


# ── Tier classification ──────────────────────────────────────────────

def test_tier_boundaries():
    assert classify_tier(85.0) == "GR-A"
    assert classify_tier(84.9) == "GR-B"
    assert classify_tier(70.0) == "GR-B"
    assert classify_tier(69.9) == "GR-C"
    assert classify_tier(50.0) == "GR-C"
    assert classify_tier(49.9) == "GR-D"
    assert classify_tier(30.0) == "GR-D"
    assert classify_tier(29.9) == "GR-E"
    assert classify_tier(0.0) == "GR-E"


# ── No score ever reaches 100 ───────────────────────────────────────

def test_no_perfect_100():
    """Even with absurd inputs, no pillar or GR Rating should be exactly 100."""
    p1 = pillar1_score(h_index=999999, total_citations=999999999, publications=999999, i10_index=999999)
    assert p1["p1_score"] < 100.0

    p2 = pillar2_score(fwci=1000, citation_velocity=1000000, recency_index=1000, topic_prominence_cagr=1000)
    assert p2["p2_score"] < 100.0

    gr = compute_gr_rating(99.999, 99.999, 99.999, 99.999, 99.999)
    assert gr["gr_rating"] < 100.0
