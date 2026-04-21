from app.scoring.saturation import saturation_score

# Constants (LOCKED v4)
C_PATENTS = 2.5
C_BOOKS = 2
C_FUNDERS = 1.2
C_PATENT_LINKS = 2

W_PATENTS = 0.30
W_BOOKS = 0.25
W_FUNDERS = 0.25
W_LINKS = 0.20


def pillar4_score(
    total_patents: int,
    books_authored: int,
    books_edited: int,
    unique_funders: int,
    patent_links: int,
) -> dict:
    """Compute Pillar 4: Innovation & Economic Assets (weight 0.20)."""
    b = books_authored + (0.5 * books_edited)

    s_pat = saturation_score(total_patents, C_PATENTS)
    s_book = saturation_score(b, C_BOOKS)
    s_grant = saturation_score(unique_funders, C_FUNDERS)
    s_link = saturation_score(patent_links, C_PATENT_LINKS)

    composite = s_pat * W_PATENTS + s_book * W_BOOKS + s_grant * W_FUNDERS + s_link * W_LINKS

    return {
        "b_weighted": round(b, 1),
        "s_patents": round(s_pat, 2),
        "s_books": round(s_book, 2),
        "s_funders": round(s_grant, 2),
        "s_patent_links": round(s_link, 2),
        "p4_score": min(round(composite, 2), 99.99),
    }
