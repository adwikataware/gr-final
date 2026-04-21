def saturation_score(x: float, c: float) -> float:
    """Universal asymptotic saturation function.

    S(x) = 100 * max(x, 0) / (max(x, 0) + c)

    Args:
        x: Raw metric value (any real number).
        c: Half-score constant (raw value earning 50).

    Returns:
        Score between 0 and 100 (exclusive), or 0.0 if x <= 0.
    """
    v = max(x, 0.0)
    if v + c == 0:
        return 0.0
    return 100.0 * v / (v + c)
