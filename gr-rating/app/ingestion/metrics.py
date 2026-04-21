"""Extract P2/P3/P4 raw metrics from OpenAlex works data."""
from datetime import datetime


def compute_p2_raw_metrics(works: list[dict]) -> dict:
    """Extract P2 metrics: citation_velocity, recency_index, active_years, topic_prominence."""
    current_year = datetime.now().year

    if not works:
        return {
            "citation_velocity": 0.0,
            "recency_index": 1.0,
            "active_years": 0,
            "topic_prominence_cagr": 0.0,
        }

    # Publication years
    years = [w.get("publication_year", current_year) for w in works if w.get("publication_year")]
    min_year = min(years) if years else current_year
    active_years = max(current_year - min_year, 1)

    # Citation velocity: citations in last 3 years / 3
    recent_citations = sum(
        w.get("cited_by_count", 0)
        for w in works
        if w.get("publication_year") and w["publication_year"] >= current_year - 3
    )
    citation_velocity = recent_citations / 3.0

    # Recency index: (recent_cites / total_cites) / (3 / active_years)
    total_citations = sum(w.get("cited_by_count", 0) for w in works)
    if total_citations > 0 and active_years >= 3:
        recent_ratio = recent_citations / total_citations
        expected_ratio = 3.0 / active_years
        recency_index = recent_ratio / expected_ratio if expected_ratio > 0 else 1.0
    else:
        recency_index = 1.0

    # Topic prominence CAGR: simplified — count growth in researcher's top concepts
    # Using a heuristic based on recent vs older publication rate
    recent_count = sum(1 for w in works if w.get("publication_year", 0) >= current_year - 3)
    older_count = sum(1 for w in works if w.get("publication_year", 0) < current_year - 3)
    if older_count > 0:
        growth_rate = (recent_count / 3.0) / (older_count / max(active_years - 3, 1))
        topic_prominence_cagr = max(growth_rate * 15, 0)  # Scale to meaningful range
    else:
        topic_prominence_cagr = 20.0  # Default for new researchers

    return {
        "citation_velocity": round(citation_velocity, 1),
        "recency_index": round(recency_index, 3),
        "active_years": active_years,
        "topic_prominence_cagr": round(topic_prominence_cagr, 1),
    }


def compute_p3_raw_metrics(works: list[dict]) -> dict:
    """Extract P3 metrics: SDG coverage, SDG strength, OA%, societal mentions."""
    if not works:
        return {
            "sdg_count": 0,
            "sdg_mean_confidence": 0.0,
            "oa_percentage": 0.0,
        }

    # SDG coverage & strength
    all_sdgs = {}
    for w in works:
        sdgs = w.get("sustainable_development_goals", [])
        for sdg in sdgs:
            sdg_id = sdg.get("id", "")
            score = sdg.get("score", 0)
            if sdg_id not in all_sdgs:
                all_sdgs[sdg_id] = []
            all_sdgs[sdg_id].append(score)

    sdg_count = len(all_sdgs)
    sdg_mean_confidence = 0.0
    if all_sdgs:
        all_scores = [s for scores in all_sdgs.values() for s in scores]
        sdg_mean_confidence = sum(all_scores) / len(all_scores) if all_scores else 0.0

    # Open access ratio
    oa_count = sum(
        1 for w in works
        if w.get("open_access", {}).get("is_oa", False)
    )
    oa_percentage = (oa_count / len(works) * 100) if works else 0.0

    return {
        "sdg_count": sdg_count,
        "sdg_mean_confidence": round(sdg_mean_confidence, 4),
        "oa_percentage": round(oa_percentage, 1),
    }


def compute_p4_book_metrics(works: list[dict]) -> dict:
    """Extract P4 book/funder metrics from works."""
    books_authored = 0
    books_edited = 0
    funder_ids = set()

    for w in works:
        work_type = w.get("type", "")

        if work_type in ("book", "monograph"):
            books_authored += 1
        elif work_type in ("edited-book", "book-chapter"):
            books_edited += 1

        # Funder diversity (OpenAlex "funders" field)
        funders = w.get("funders", []) or []
        for f in funders:
            fid = f.get("id") or f.get("funder_id")
            if fid:
                funder_ids.add(fid)

    return {
        "books_authored": books_authored,
        "books_edited": books_edited,
        "unique_funders": len(funder_ids),
    }
