from app.scoring.saturation import saturation_score

# Constants (LOCKED v4)
C_SDG = 1.5
C_SDG_STRENGTH = 0.18
C_OA = 10
C_SOCIETAL = 4


def pillar3_score(
    sdg_count: int,
    sdg_mean_confidence: float,
    oa_percentage: float,
    societal_mentions: int,
) -> dict:
    """Compute Pillar 3: Sustainability & Societal Impact (weight 0.15)."""
    s_sdg = saturation_score(sdg_count, C_SDG)
    s_str = saturation_score(sdg_mean_confidence, C_SDG_STRENGTH)
    s_oa = saturation_score(oa_percentage, C_OA)
    s_soc = saturation_score(societal_mentions, C_SOCIETAL)

    composite = (s_sdg + s_str + s_oa + s_soc) * 0.25

    return {
        "s_sdg_coverage": round(s_sdg, 2),
        "s_sdg_strength": round(s_str, 2),
        "s_oa_ratio": round(s_oa, 2),
        "s_societal_reach": round(s_soc, 2),
        "p3_score": min(round(composite, 2), 99.99),
    }
