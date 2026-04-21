from app.scoring.saturation import saturation_score

# Constants (LOCKED v4)
C_FWCI = 0.3
C_VELOCITY = 12
C_RECENCY = 0.3
C_TOPIC = 3

W_FWCI = 0.35
W_VELOCITY = 0.25
W_RECENCY = 0.20
W_TOPIC = 0.20


def pillar2_score(
    fwci: float,
    citation_velocity: float,
    recency_index: float,
    topic_prominence_cagr: float,
    active_years: int = 10,
) -> dict:
    """Compute Pillar 2: Real-Time Performance Analytics (weight 0.30)."""
    # Career guard: too short to measure recency
    if active_years < 5:
        recency_index = 1.0

    s_fwci = saturation_score(fwci, C_FWCI)
    s_vel = saturation_score(citation_velocity, C_VELOCITY)
    s_rec = saturation_score(recency_index, C_RECENCY)
    s_top = saturation_score(topic_prominence_cagr, C_TOPIC)

    composite = s_fwci * W_FWCI + s_vel * W_VELOCITY + s_rec * W_RECENCY + s_top * W_TOPIC

    return {
        "s_fwci": round(s_fwci, 2),
        "s_velocity": round(s_vel, 2),
        "s_recency": round(s_rec, 2),
        "s_topic": round(s_top, 2),
        "p2_score": min(round(composite, 2), 99.99),
    }
