WEIGHTS = {
    "p1": 0.25,
    "p2": 0.30,
    "p3": 0.15,
    "p4": 0.20,
    "p5": 0.10,
}

TIER_LABELS = {
    "GR-A": "Exceptional",
    "GR-B": "Distinguished",
    "GR-C": "Established",
    "GR-D": "Emerging",
    "GR-E": "Entry",
}


def classify_tier(gr_rating: float) -> str:
    if gr_rating >= 85:
        return "GR-A"
    elif gr_rating >= 70:
        return "GR-B"
    elif gr_rating >= 50:
        return "GR-C"
    elif gr_rating >= 30:
        return "GR-D"
    return "GR-E"


def compute_gr_rating(
    p1_score: float,
    p2_score: float,
    p3_score: float,
    p4_score: float,
    p5_score: float = 50.0,
) -> dict:
    """Compute the final GR Rating from pillar scores."""
    gr = (
        p1_score * WEIGHTS["p1"]
        + p2_score * WEIGHTS["p2"]
        + p3_score * WEIGHTS["p3"]
        + p4_score * WEIGHTS["p4"]
        + p5_score * WEIGHTS["p5"]
    )

    tier = classify_tier(gr)

    return {
        "gr_rating": min(round(gr, 1), 99.9),
        "tier": tier,
        "tier_label": TIER_LABELS[tier],
        "p1_score": round(p1_score, 1),
        "p2_score": round(p2_score, 1),
        "p3_score": round(p3_score, 1),
        "p4_score": round(p4_score, 1),
        "p5_score": round(p5_score, 1),
    }
