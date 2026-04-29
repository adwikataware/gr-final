"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { sdgData } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Expert {
  id: string;
  openalex_id: string;
  name: string;
  affiliation: string;
  bio: string;
  photo_url: string;
  topics: string[];
  sdg_ids: number[];
  gr_rating: number;
  tier: string;
  tier_label: string;
  rank: number | null;
  orcid: string;
}

/* ------------------------------------------------------------------ */
/* Quick filters                                                       */
/* ------------------------------------------------------------------ */
const quickFilters = ["All", "IoT", "AI/ML", "Biology", "Climate", "Security"] as const;
type QuickFilter = (typeof quickFilters)[number];

const quickFilterKeywords: Record<QuickFilter, string[]> = {
  All: [],
  IoT: ["iot", "internet of things", "smart"],
  "AI/ML": ["machine learning", "artificial intelligence", "nlp", "deep learning", "data science"],
  Biology: ["biology", "genomics", "crispr", "bioinformatics"],
  Climate: ["climate", "renewable energy", "carbon", "environmental"],
  Security: ["cybersecurity", "security", "blockchain"],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 6;

function tierBadgeClass(tierLabel: string) {
  return tierLabel === "Elite"
    ? "bg-charcoal text-white"
    : "bg-accent-tan/60 text-charcoal";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function DiscoverPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedSdgs, setSelectedSdgs] = useState<Set<number>>(new Set());
  const [activeQuick, setActiveQuick] = useState<QuickFilter>("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* fetch from backend */
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setExperts(data.researchers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load researchers. Please try again.");
        setLoading(false);
      });
  }, []);

  /* filter */
  const filtered = useMemo(() => {
    let list = [...experts];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.affiliation.toLowerCase().includes(q) ||
          e.topics.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (selectedSdgs.size > 0) {
      list = list.filter((e) => e.sdg_ids.some((s) => selectedSdgs.has(s)));
    }

    if (activeQuick !== "All") {
      const keywords = quickFilterKeywords[activeQuick];
      list = list.filter((e) =>
        e.topics.some((t) => keywords.some((kw) => t.toLowerCase().includes(kw))),
      );
    }

    return list;
  }, [experts, search, selectedSdgs, activeQuick]);

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function toggleSdg(id: number) {
    setSelectedSdgs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-cream-bg">
      <div className="max-w-7xl mx-auto px-6 py-10 flex gap-8">

        {/* LEFT SIDEBAR */}
        <aside className="w-72 shrink-0 sticky top-24 overflow-y-auto max-h-[calc(100vh-6rem)] pr-2 hidden lg:block">
          <div className="space-y-7">
            {/* Search */}
            <div>
              <label className="label-xs text-text-muted mb-2 block">Search</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                  type="text"
                  placeholder="Name, topic, institution..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-clay-muted/60 bg-surface-cream focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown placeholder:text-text-muted/50 transition"
                />
              </div>
            </div>

            {/* SDG Alignment */}
            <div>
              <label className="label-xs text-text-muted mb-3 block">SDG Alignment</label>
              <div className="grid grid-cols-4 gap-1.5">
                {sdgData.map((sdg) => (
                  <button
                    key={sdg.id}
                    title={sdg.name}
                    onClick={() => { toggleSdg(sdg.id); setVisibleCount(PAGE_SIZE); }}
                    className="relative w-full aspect-square rounded-lg text-[10px] font-bold text-white flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: sdg.color,
                      opacity: selectedSdgs.size === 0 || selectedSdgs.has(sdg.id) ? 1 : 0.35,
                      outline: selectedSdgs.has(sdg.id) ? `2px solid ${sdg.color}` : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    {sdg.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {(search || selectedSdgs.size > 0 || activeQuick !== "All") && (
              <button
                onClick={() => { setSearch(""); setSelectedSdgs(new Set()); setActiveQuick("All"); setVisibleCount(PAGE_SIZE); }}
                className="w-full py-2.5 text-sm font-medium rounded-xl border border-clay-muted/50 text-charcoal hover:bg-cream-bg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-semibold text-charcoal tracking-tight">Find Your Expert</h1>
            <p className="text-sm text-text-muted mt-1">
              {loading ? "Loading researchers..." : `${filtered.length} researcher${filtered.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {quickFilters.map((tag) => (
              <button
                key={tag}
                onClick={() => { setActiveQuick(tag); setVisibleCount(PAGE_SIZE); }}
                className={`px-4 py-1.5 text-sm rounded-full border transition-all ${
                  activeQuick === tag
                    ? "bg-charcoal text-white border-charcoal"
                    : "bg-surface-cream text-charcoal border-clay-muted/60 hover:border-warm-brown hover:text-warm-brown-dark"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-cream rounded-2xl border border-clay-muted/40 p-6 animate-pulse">
                  <div className="flex gap-6">
                    <div className="w-28 h-28 rounded-xl bg-clay-muted/30" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-clay-muted/30 rounded w-48" />
                      <div className="h-4 bg-clay-muted/20 rounded w-32" />
                      <div className="flex gap-2">
                        {[1, 2, 3].map((j) => <div key={j} className="h-6 w-20 bg-clay-muted/20 rounded-full" />)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Expert cards */}
          {!loading && (
            <div className="space-y-5">
              {displayed.map((expert, i) => (
                <motion.div
                  key={expert.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="hover-card-lift group bg-surface-cream rounded-2xl border border-clay-muted/40 p-6"
                >
                  <div className="flex gap-6">
                    {/* Avatar */}
                    <Link href={`/expert/${expert.id}`} className="shrink-0">
                      <div className="w-28 h-28 rounded-xl overflow-hidden bg-cream-200">
                        <img
                          src={expert.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=8B5E3C&color=fff&size=200`}
                          alt={expert.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <Link
                            href={`/expert/${expert.id}`}
                            className="font-serif text-xl font-semibold text-charcoal hover:text-warm-brown-dark transition-colors"
                          >
                            {expert.name}
                          </Link>
                          <p className="text-sm text-text-muted mt-0.5">{expert.affiliation}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${tierBadgeClass(expert.tier_label)}`}>
                            {expert.tier_label} · {expert.tier}
                          </span>
                          <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-warm-brown/10 text-warm-brown">
                            GR {expert.gr_rating}
                          </span>
                        </div>
                      </div>

                      {/* Bio */}
                      {expert.bio && (
                        <p className="text-sm text-charcoal/70 mt-2 line-clamp-2">{expert.bio}</p>
                      )}

                      {/* Topic tags */}
                      {expert.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {expert.topics.slice(0, 5).map((tag) => (
                            <span key={tag} className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-cream-100 text-charcoal-light border border-clay-muted/40">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* SDG dots */}
                      {expert.sdg_ids.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-3">
                          <span className="text-[10px] text-text-muted mr-1 uppercase tracking-wider font-semibold">SDGs</span>
                          {expert.sdg_ids.map((sdgId) => {
                            const sdg = sdgData.find((s) => s.id === sdgId);
                            return (
                              <span
                                key={sdgId}
                                title={sdg?.name}
                                className="w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                                style={{ backgroundColor: sdg?.color ?? "#888" }}
                              >
                                {sdgId}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-clay-muted/30">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          {expert.rank && <span className="font-medium text-charcoal">Rank #{expert.rank}</span>}
                          {expert.orcid && (
                            <a
                              href={`https://orcid.org/${expert.orcid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:underline"
                            >
                              ORCID
                            </a>
                          )}
                        </div>
                        <Link
                          href={`/expert/${expert.id}`}
                          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-full bg-charcoal text-white hover:bg-charcoal-light transition-colors"
                        >
                          View Profile
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && !error && (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted">No researchers match your filters.</p>
              <button
                onClick={() => { setSearch(""); setSelectedSdgs(new Set()); setActiveQuick("All"); }}
                className="mt-4 text-sm font-medium text-warm-brown hover:text-warm-brown-dark underline underline-offset-2"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-10">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-8 py-3 text-sm font-medium rounded-full border border-clay-muted/60 bg-surface-cream text-charcoal hover:border-warm-brown hover:text-warm-brown-dark transition-all"
              >
                Load More
              </motion.button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
