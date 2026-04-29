"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const ease = [0.22, 1, 0.36, 1] as const;

/* ================================================================== */
/*  SATURATION CURVE SVG                                               */
/* ================================================================== */

function SaturationCurve({ c, label }: { c: number; label: string }) {
  // S(x) = 100 * x / (x + c), plotted for x in [0, c*10]
  const maxX = c * 10;
  const points: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = (i / 100) * maxX;
    const y = 100 * x / (x + c);
    // SVG coords: x maps to 0-280, y maps to 180 (bottom) to 10 (top)
    const sx = 40 + (i / 100) * 260;
    const sy = 180 - (y / 100) * 170;
    points.push(`${sx},${sy}`);
  }

  // Half-score point
  const halfX = 40 + (c / maxX) * 260;
  const halfY = 180 - 0.5 * 170;

  return (
    <div className="bg-cream-100/50 rounded-xl p-4 border border-clay-muted/20">
      <p className="text-xs font-medium text-text-muted mb-2">{label} (c = {c})</p>
      <svg viewBox="0 0 320 200" className="w-full h-auto" aria-hidden>
        {/* Axes */}
        <line x1="40" y1="180" x2="310" y2="180" stroke="#d1cfc5" strokeWidth="1" />
        <line x1="40" y1="10" x2="40" y2="180" stroke="#d1cfc5" strokeWidth="1" />
        {/* 50 line */}
        <line x1="40" y1={halfY} x2="310" y2={halfY} stroke="#d1cfc5" strokeWidth="0.5" strokeDasharray="4" />
        <text x="12" y={halfY + 4} fill="#5e5d59" fontSize="10">50</text>
        <text x="12" y="16" fill="#5e5d59" fontSize="10">100</text>
        <text x="12" y="184" fill="#5e5d59" fontSize="10">0</text>
        {/* Curve */}
        <polyline
          fill="none"
          stroke="#9D8461"
          strokeWidth="2.5"
          strokeLinecap="round"
          points={points.join(" ")}
        />
        {/* Half-score dot */}
        <circle cx={halfX} cy={halfY} r="4" fill="#9D8461" />
        <line x1={halfX} y1={halfY} x2={halfX} y2="180" stroke="#9D8461" strokeWidth="1" strokeDasharray="3" />
        <text x={halfX - 4} y="194" fill="#9D8461" fontSize="9" fontWeight="600">{c}</text>
      </svg>
    </div>
  );
}

/* ================================================================== */
/*  PILLAR CARD                                                        */
/* ================================================================== */

interface PillarData {
  id: string;
  title: string;
  weight: number;
  description: string;
  metrics: { name: string; subWeight: string; cValue: number; desc: string }[];
  color: string;
}

const PILLARS: PillarData[] = [
  {
    id: "p1",
    title: "Core Fundamental Research",
    weight: 25,
    description: "Measures the breadth and influence of a researcher's publication record.",
    color: "#9D8461",
    metrics: [
      { name: "h-index", subWeight: "30%", cValue: 3, desc: "Balance of quantity and citation impact" },
      { name: "Total Citations", subWeight: "25%", cValue: 180, desc: "Cumulative citation count across all works" },
      { name: "Publications", subWeight: "25%", cValue: 8, desc: "Total number of published works" },
      { name: "i10-index", subWeight: "20%", cValue: 3, desc: "Number of publications with 10+ citations" },
    ],
  },
  {
    id: "p2",
    title: "Real-Time Performance",
    weight: 30,
    description: "Captures how active and impactful a researcher's recent work is relative to their field.",
    color: "#6B7B5E",
    metrics: [
      { name: "FWCI", subWeight: "35%", cValue: 0.3, desc: "Field-Weighted Citation Impact — citations vs. field average" },
      { name: "Citation Velocity", subWeight: "25%", cValue: 12, desc: "Citations per year in recent period" },
      { name: "Recency Index", subWeight: "20%", cValue: 0.3, desc: "Proportion of work in the last 5 years" },
      { name: "Topic Prominence CAGR", subWeight: "20%", cValue: 3, desc: "Growth rate of research topics" },
    ],
  },
  {
    id: "p3",
    title: "Sustainability & Societal Impact",
    weight: 15,
    description: "Evaluates contribution to UN SDGs, open access, and real-world societal reach.",
    color: "#5E6B7B",
    metrics: [
      { name: "SDG Coverage", subWeight: "25%", cValue: 1.5, desc: "Number of UN SDGs addressed" },
      { name: "SDG Confidence", subWeight: "25%", cValue: 0.18, desc: "Average confidence score of SDG alignment" },
      { name: "Open Access %", subWeight: "25%", cValue: 10, desc: "Percentage of openly accessible publications" },
      { name: "Societal Mentions", subWeight: "25%", cValue: 4, desc: "References in policy docs, news, Wikipedia" },
    ],
  },
  {
    id: "p4",
    title: "Innovation & Economic Assets",
    weight: 20,
    description: "Tracks patents, books, funding diversity, and industry-academia linkage.",
    color: "#7B5E6B",
    metrics: [
      { name: "Patents", subWeight: "30%", cValue: 2.5, desc: "Total patent filings" },
      { name: "Books", subWeight: "25%", cValue: 2, desc: "Authored + 0.5 x edited books" },
      { name: "Unique Funders", subWeight: "25%", cValue: 1.2, desc: "Diversity of funding sources" },
      { name: "Patent-Paper Links", subWeight: "20%", cValue: 2, desc: "Citations between patents and papers" },
    ],
  },
  {
    id: "p5",
    title: "Community & Peer Recognition",
    weight: 10,
    description: "Peer reviews, editorial board roles, and community engagement. Currently set to a neutral 50 as platform data builds.",
    color: "#8B7355",
    metrics: [],
  },
];

function PillarCard({ pillar, index }: { pillar: PillarData; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      className="bg-white rounded-2xl border border-clay-muted/40 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-clay-muted/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: pillar.color }}
            >
              P{index + 1}
            </div>
            <h3 className="text-lg font-semibold text-charcoal">{pillar.title}</h3>
          </div>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: pillar.color + "15", color: pillar.color }}
          >
            {pillar.weight}%
          </span>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">{pillar.description}</p>
      </div>

      {/* Metrics */}
      {pillar.metrics.length > 0 ? (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pillar.metrics.map((m) => (
              <div key={m.name} className="bg-cream-50 rounded-xl p-4 border border-clay-muted/15">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-charcoal">{m.name}</span>
                  <span className="text-xs font-medium text-warm-brown">{m.subWeight}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{m.desc}</p>
                <p className="text-xs text-text-muted/60 mt-1">Half-score constant: <span className="font-mono font-semibold text-charcoal">c = {m.cValue}</span></p>
              </div>
            ))}
          </div>

          {/* Curve examples */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <SaturationCurve c={pillar.metrics[0].cValue} label={pillar.metrics[0].name} />
            <SaturationCurve c={pillar.metrics[1].cValue} label={pillar.metrics[1].name} />
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-cream-100/50 rounded-xl p-6 text-center border border-clay-muted/20">
            <p className="text-sm text-text-muted">This pillar currently returns a neutral score of <span className="font-mono font-bold text-charcoal">50.0</span> for all researchers. It will incorporate peer review data and editorial roles as the platform grows.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  WEIGHT BAR                                                         */
/* ================================================================== */

function WeightBar() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const segments = [
    { label: "P1", weight: 25, color: "#9D8461" },
    { label: "P2", weight: 30, color: "#6B7B5E" },
    { label: "P3", weight: 15, color: "#5E6B7B" },
    { label: "P4", weight: 20, color: "#7B5E6B" },
    { label: "P5", weight: 10, color: "#8B7355" },
  ];

  return (
    <div ref={ref} className="space-y-3">
      <div className="flex rounded-full overflow-hidden h-8">
        {segments.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ width: 0 }}
            animate={isInView ? { width: `${s.weight}%` } : {}}
            transition={{ duration: 0.8, delay: 0.1 * i, ease }}
            className="flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: s.color }}
          >
            {s.weight}%
          </motion.div>
        ))}
      </div>
      <div className="flex">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${s.weight}%` }} className="text-center">
            <span className="text-xs font-medium text-text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TIER TABLE                                                         */
/* ================================================================== */

const TIERS = [
  { tier: "GR-A", range: "85 - 100", label: "Exceptional", color: "#9D8461" },
  { tier: "GR-B", range: "70 - 84", label: "Distinguished", color: "#6B7B5E" },
  { tier: "GR-C", range: "50 - 69", label: "Established", color: "#5E6B7B" },
  { tier: "GR-D", range: "30 - 49", label: "Emerging", color: "#7B5E6B" },
  { tier: "GR-E", range: "0 - 29", label: "Entry", color: "#8B7355" },
];

/* ================================================================== */
/*  LIVE CALCULATOR                                                    */
/* ================================================================== */

interface SearchResult {
  researcher_id: string;
  name: string;
  affiliation: string;
  gr_rating: number | null;
  tier: string | null;
}

interface PillarScore {
  score: number;
  label: string;
  weight: number;
}

interface RatingData {
  researcher_id: string;
  name: string;
  affiliation: string;
  gr_rating: number;
  tier: string;
  tier_label: string;
  rank: number;
  total_researchers: number;
  pillars: Record<string, PillarScore>;
  computed_at: string;
}

const TIER_COLORS: Record<string, string> = {
  "GR-A": "#9D8461",
  "GR-B": "#6B7B5E",
  "GR-C": "#5E6B7B",
  "GR-D": "#7B5E6B",
  "GR-E": "#8B7355",
};

function LiveCalculator() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RatingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allResearchers, setAllResearchers] = useState<SearchResult[]>([]);

  // Load all researchers on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/researchers/top?limit=50");
        if (res.ok) {
          const data = await res.json();
          setAllResearchers(data.researchers || []);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/researchers/search?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowDropdown(true);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.trim().length === 0) { setResults(allResearchers); return; }
    searchTimeout.current = setTimeout(() => doSearch(query.trim()), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, doSearch]);

  // Show all researchers when focusing empty input
  function handleFocus() {
    if (query.trim().length === 0 && allResearchers.length > 0) {
      setResults(allResearchers);
      setShowDropdown(true);
    } else if (results.length > 0) {
      setShowDropdown(true);
    }
  }

  async function selectResearcher(r: SearchResult) {
    setShowDropdown(false);
    setQuery(r.name);
    setLoading(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/v1/researchers/${r.researcher_id}/rating`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "computing") {
          setSelected(null);
        } else {
          setSelected(data);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  const pillarOrder = ["p1", "p2", "p3", "p4", "p5"];
  const pillarColors = ["#9D8461", "#6B7B5E", "#5E6B7B", "#7B5E6B", "#8B7355"];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease }}
    >
      <div className="text-center mb-10">
        <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
          Live Rating Calculator
        </h2>
        <p className="font-serif text-text-muted/80 max-w-xl mx-auto leading-relaxed">
          Search for a researcher and see their GR Rating breakdown computed in real-time from open academic data.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Search input */}
        <div className="relative mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleFocus}
              placeholder="Search by researcher name..."
              className="w-full pl-12 pr-4 py-4 text-base rounded-2xl border border-clay-muted/60 bg-white focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown placeholder:text-text-muted/50 transition shadow-sm"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-warm-brown/30 border-t-warm-brown rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 top-full mt-2 w-full bg-white rounded-xl border border-clay-muted/40 shadow-lg overflow-hidden"
              >
                {results.map((r) => (
                  <button
                    key={r.researcher_id}
                    onClick={() => selectResearcher(r)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-cream-50 transition-colors text-left border-b border-clay-muted/10 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{r.name}</p>
                      <p className="text-xs text-text-muted">{r.affiliation}</p>
                    </div>
                    {r.gr_rating && r.tier && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-charcoal">{r.gr_rating}</span>
                        <span
                          className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: TIER_COLORS[r.tier] || "#5C5C5C" }}
                        >
                          {r.tier}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-warm-brown/20 border-t-warm-brown rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-muted">Fetching rating data...</p>
          </div>
        )}

        {/* Rating Result */}
        <AnimatePresence mode="wait">
          {selected && !loading && (
            <motion.div
              key={selected.researcher_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease }}
              className="bg-white rounded-2xl border border-clay-muted/40 overflow-hidden shadow-sm"
            >
              {/* Header */}
              <div className="p-6 border-b border-clay-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-charcoal">{selected.name}</h3>
                    <p className="text-sm text-text-muted mt-0.5">{selected.affiliation}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-3xl font-bold text-charcoal">{selected.gr_rating}</p>
                        <p className="text-xs text-text-muted">out of 100</p>
                      </div>
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: TIER_COLORS[selected.tier] || "#5C5C5C" }}
                      >
                        {selected.tier}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-text-muted">
                    {selected.tier_label} &middot; Rank #{selected.rank} of {selected.total_researchers}
                  </span>
                  {selected.computed_at && (
                    <span className="text-xs text-text-muted/60">
                      Computed: {new Date(selected.computed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Pillar Breakdown */}
              <div className="p-6">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Pillar Breakdown</p>
                <div className="space-y-3">
                  {pillarOrder.map((key, i) => {
                    const p = selected.pillars[key];
                    if (!p) return null;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: pillarColors[i] }}
                            >
                              P{i + 1}
                            </div>
                            <span className="text-sm font-medium text-charcoal">{p.label}</span>
                            <span className="text-xs text-text-muted">({(p.weight * 100).toFixed(0)}%)</span>
                          </div>
                          <span className="text-sm font-bold text-charcoal">{p.score.toFixed(1)}</span>
                        </div>
                        <div className="h-2.5 bg-cream-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${p.score}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1, ease }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: pillarColors[i] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Weighted calculation */}
                <div className="mt-6 pt-4 border-t border-clay-muted/20">
                  <p className="text-xs text-text-muted mb-2">Weighted calculation:</p>
                  <p className="font-mono text-xs text-charcoal leading-relaxed">
                    {pillarOrder.map((key, i) => {
                      const p = selected.pillars[key];
                      if (!p) return null;
                      return (
                        <span key={key}>
                          {i > 0 && " + "}
                          <span style={{ color: pillarColors[i] }}>{p.weight.toFixed(2)}</span>
                          &times;{p.score.toFixed(1)}
                        </span>
                      );
                    })}
                    {" = "}
                    <span className="font-bold text-base">{selected.gr_rating}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default function GRRatingPage() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const heroRef = useRef(null);
  const formulaRef = useRef(null);
  const tierRef = useRef(null);
  const whyRef = useRef(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) return null;
  const heroInView = useInView(heroRef, { once: true });
  const formulaInView = useInView(formulaRef, { once: true, margin: "-80px" });
  const tierInView = useInView(tierRef, { once: true, margin: "-80px" });
  const whyInView = useInView(whyRef, { once: true, margin: "-80px" });

  return (
    <main className="min-h-screen bg-cream-bg">
      {/* Hero */}
      <section ref={heroRef} className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
            className="label-xs text-warm-brown mb-4 block"
          >
            Proprietary Metric
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-heading text-5xl md:text-7xl font-medium text-charcoal mb-6"
          >
            The GR Rating
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="font-serif text-lg md:text-xl text-text-muted/80 max-w-2xl mx-auto leading-relaxed"
          >
            A transparent, data-driven score from 0 to 100 that measures a
            researcher&apos;s true impact across five fundamental pillars of academic excellence.
          </motion.p>
        </div>
      </section>

      {/* The Core Formula */}
      <section ref={formulaRef} className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={formulaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
              The Saturation Function
            </h2>
            <p className="font-serif text-text-muted/80 max-w-xl mx-auto leading-relaxed">
              Every raw metric is normalized through a saturation function that rewards
              excellence while preventing any single metric from being gamed.
            </p>
          </motion.div>

          {/* Formula display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={formulaInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="bg-white rounded-2xl border border-clay-muted/40 p-8 md:p-12 mb-8"
          >
            <div className="text-center mb-8">
              <p className="font-mono text-2xl md:text-3xl text-charcoal font-medium tracking-wide">
                S(x) = 100 &times; <sup>max(x, 0)</sup>&frasl;<sub>max(x, 0) + c</sub>
              </p>
              <p className="text-sm text-text-muted mt-4">
                Where <span className="font-mono font-semibold">c</span> is the half-score constant &mdash;
                the raw value that earns exactly <span className="font-mono font-semibold">50</span> points.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-cream-50 rounded-xl p-5 border border-clay-muted/15">
                <p className="text-3xl font-bold text-charcoal mb-1">0</p>
                <p className="text-xs text-text-muted">Score when metric = 0</p>
              </div>
              <div className="bg-cream-50 rounded-xl p-5 border border-clay-muted/15">
                <p className="text-3xl font-bold text-warm-brown mb-1">50</p>
                <p className="text-xs text-text-muted">Score when metric = c</p>
              </div>
              <div className="bg-cream-50 rounded-xl p-5 border border-clay-muted/15">
                <p className="text-3xl font-bold text-charcoal mb-1">~100</p>
                <p className="text-xs text-text-muted">Asymptotic maximum</p>
              </div>
            </div>
          </motion.div>

          {/* Main curve example */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={formulaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="bg-white rounded-2xl border border-clay-muted/40 p-6"
          >
            <p className="text-sm font-medium text-text-muted mb-3">Example: h-index (c = 3)</p>
            <p className="text-xs text-text-muted mb-4">
              An h-index of 3 scores 50. An h-index of 30 scores 91. An h-index of 300 scores 99.
              The diminishing returns prevent outliers from dominating.
            </p>
            <SaturationCurve c={3} label="h-index" />
          </motion.div>
        </div>
      </section>

      {/* Composite Formula */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
              Composite Score
            </h2>
            <p className="font-serif text-text-muted/80 max-w-xl mx-auto leading-relaxed">
              The final GR Rating combines five pillar scores with carefully calibrated weights.
            </p>
          </div>

          <div className="bg-cream-50 rounded-2xl border border-clay-muted/30 p-8 md:p-12 mb-10">
            <p className="font-mono text-lg md:text-xl text-charcoal text-center leading-loose">
              GR = 0.25&times;P1 + 0.30&times;P2 + 0.15&times;P3 + 0.20&times;P4 + 0.10&times;P5
            </p>
          </div>

          <WeightBar />
        </div>
      </section>

      {/* 5 Pillars */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
              The Five Pillars
            </h2>
            <p className="font-serif text-text-muted/80 max-w-xl mx-auto leading-relaxed">
              Each pillar captures a distinct dimension of research impact, scored independently then combined.
            </p>
          </div>

          <div className="space-y-8">
            {PILLARS.map((pillar, i) => (
              <PillarCard key={pillar.id} pillar={pillar} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Tier System */}
      <section ref={tierRef} className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={tierInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
              Tier Classification
            </h2>
            <p className="font-serif text-text-muted/80 max-w-xl mx-auto leading-relaxed">
              Based on the composite score, researchers are classified into five tiers.
            </p>
          </motion.div>

          <div className="space-y-3">
            {TIERS.map((t, i) => (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, x: -30 }}
                animate={tierInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="flex items-center gap-4 bg-cream-50 rounded-xl p-4 border border-clay-muted/20"
              >
                <div
                  className="w-16 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: t.color }}
                >
                  {t.tier}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">{t.label}</p>
                </div>
                <span className="font-mono text-sm text-text-muted">{t.range}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why This Approach */}
      <section ref={whyRef} className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={whyInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
              Why This Approach
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Anti-Gaming",
                desc: "The saturation function ensures diminishing returns. 1,000 citations helps enormously. 10,000 doesn't help 10x more. This prevents metric manipulation.",
              },
              {
                title: "Transparent Data",
                desc: "All metrics are sourced from OpenAlex and CrossRef — open, verifiable academic databases. No black-box inputs.",
              },
              {
                title: "Nightly Updates",
                desc: "Scores are recomputed every night at 2 AM IST using the latest data. FWCI caches refresh weekly to stay current.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={whyInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className="bg-white rounded-2xl p-6 border border-clay-muted/40"
              >
                <h3 className="text-base font-semibold text-charcoal mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Calculator */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <LiveCalculator />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-medium text-charcoal mb-4">
            See It in Action
          </h2>
          <p className="font-serif text-text-muted/80 mb-8 leading-relaxed">
            Browse real researchers with live GR Ratings computed from open academic data.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 bg-charcoal text-cream-50 px-6 py-3 rounded-full text-sm font-medium hover:bg-charcoal-light transition-colors"
            >
              Find an Expert
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-clay-muted/60 text-charcoal px-6 py-3 rounded-full text-sm font-medium hover:bg-cream-100 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
