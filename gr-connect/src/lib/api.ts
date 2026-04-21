const BASE = "/api/v1/researchers";

export interface ResearcherSummary {
  researcher_id: string;
  name: string;
  affiliation: string;
  gr_rating: number | null;
  tier: string | null;
}

export interface ResearcherListResponse {
  researchers: ResearcherSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface PillarDetail {
  score: number;
  label: string;
  weight: number;
}

export interface ResearcherRating {
  researcher_id: string;
  name: string;
  affiliation: string;
  gr_rating: number;
  tier: string;
  tier_label: string;
  rank: number | null;
  total_researchers: number;
  pillars: Record<string, PillarDetail>;
  computed_at: string;
}

export interface RawMetrics {
  researcher_id: string;
  h_index: number;
  total_citations: number;
  publications: number;
  i10_index: number;
  fwci: number | null;
  citation_velocity: number | null;
  recency_index: number | null;
  sdg_count: number;
  oa_percentage: number;
  total_patents: number;
  books_authored: number;
  unique_funders: number;
}

export interface DetailedRating {
  researcher_id: string;
  name: string;
  affiliation: string;
  gr_rating: number;
  tier: string;
  tier_label: string;
  rank: number | null;
  total_researchers: number;
  pillars: Record<string, PillarDetail>;
  raw_metrics: RawMetrics | null;
  computed_at: string;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function searchResearchers(
  query: string,
  limit = 10
): Promise<ResearcherSummary[]> {
  return fetchJSON(`${BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getTopResearchers(
  limit = 20,
  offset = 0,
  tier?: string
): Promise<ResearcherListResponse> {
  let url = `${BASE}/top?limit=${limit}&offset=${offset}`;
  if (tier) url += `&tier=${tier}`;
  return fetchJSON(url);
}

export async function getResearcherRating(
  id: string
): Promise<ResearcherRating> {
  return fetchJSON(`${BASE}/${id}/rating`);
}

export async function getResearcherDetailed(
  id: string
): Promise<DetailedRating> {
  return fetchJSON(`${BASE}/${id}/rating/detailed`);
}
