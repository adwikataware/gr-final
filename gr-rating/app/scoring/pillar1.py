from app.scoring.saturation import saturation_score

# Constants (LOCKED v4)
C_H = 3
C_CITATIONS = 180
C_PUBLICATIONS = 8
C_I10 = 3

W_H = 0.30
W_CITATIONS = 0.25
W_PUBLICATIONS = 0.25
W_I10 = 0.20


def pillar1_score(
    h_index: int,
    total_citations: int,
    publications: int,
    i10_index: int,
) -> dict:
    """Compute Pillar 1: Core Fundamental Research (weight 0.25)."""
    s_h = saturation_score(h_index, C_H)
    s_c = saturation_score(total_citations, C_CITATIONS)
    s_p = saturation_score(publications, C_PUBLICATIONS)
    s_i = saturation_score(i10_index, C_I10)

    composite = s_h * W_H + s_c * W_CITATIONS + s_p * W_PUBLICATIONS + s_i * W_I10

    return {
        "s_h": round(s_h, 2),
        "s_citations": round(s_c, 2),
        "s_publications": round(s_p, 2),
        "s_i10": round(s_i, 2),
        "p1_score": min(round(composite, 2), 99.99),
    }
