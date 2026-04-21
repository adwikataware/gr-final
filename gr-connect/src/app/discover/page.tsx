"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { experts, sdgData } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/*  Quick-filter categories                                           */
/* ------------------------------------------------------------------ */
const quickFilters = [
  "All",
  "IoT",
  "AI/ML",
  "Biology",
  "Climate",
  "Security",
] as const;

type QuickFilter = (typeof quickFilters)[number];

/** Map each quick-filter label to keywords that match expert.expertise */
const quickFilterKeywords: Record<QuickFilter, string[]> = {
  All: [],
  IoT: ["internet of things", "iot", "smart cities"],
  "AI/ML": [
    "artificial intelligence",
    "machine learning",
    "nlp",
    "reinforcement learning",
    "computer vision",
    "deep learning",
    "data science",
  ],
  Biology: [
    "biology",
    "computational biology",
    "genomics",
    "crispr",
    "bioinformatics",
  ],
  Climate: [
    "climate",
    "renewable energy",
    "carbon capture",
    "environmental",
    "sustainability",
  ],
  Security: ["cybersecurity", "security", "blockchain"],
};

/* ------------------------------------------------------------------ */
/*  Rating tier helpers                                               */
/* ------------------------------------------------------------------ */
const ratingTierMeta: Record<string, { label: string; rank: number }> = {
  "Top 1%": { label: "Elite", rank: 1 },
  "Top 3%": { label: "Premier", rank: 2 },
  "Top 5%": { label: "Premier", rank: 2 },
};

function tierLabel(tier: string) {
  return ratingTierMeta[tier]?.label ?? "Verified";
}

/* ------------------------------------------------------------------ */
/*  Page items per load                                               */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 6;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function DiscoverPage() {
  /* ---------- filter state ---------- */
  const [search, setSearch] = useState("");
  const [hourlyRange, setHourlyRange] = useState<[number, number]>([50, 500]);
  const [ratingFilters, setRatingFilters] = useState<Set<string>>(new Set());
  const [availability, setAvailability] = useState<string>("Any");
  const [selectedSdgs, setSelectedSdgs] = useState<Set<number>>(new Set());
  const [activeQuick, setActiveQuick] = useState<QuickFilter>("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* ---------- derived / filtered list ---------- */
  const filtered = useMemo(() => {
    let list = [...experts];

    // Search by name / title / institution
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.institution.toLowerCase().includes(q) ||
          e.expertise.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    // Hourly rate range
    list = list.filter(
      (e) => e.hourlyRate >= hourlyRange[0] && e.hourlyRate <= hourlyRange[1],
    );

    // GR Rating tier checkboxes
    if (ratingFilters.size > 0) {
      list = list.filter((e) => {
        const tl = tierLabel(e.ratingTier);
        if (ratingFilters.has("Elite") && tl === "Elite") return true;
        if (ratingFilters.has("Premier") && tl === "Premier") return true;
        if (ratingFilters.has("Verified") && e.verified) return true;
        return false;
      });
    }

    // Availability
    if (availability === "Available this week") {
      list = list.filter((e) =>
        e.availability.toLowerCase().includes("this week"),
      );
    } else if (availability === "Available today") {
      list = list.filter((e) =>
        e.availability.toLowerCase().includes("today"),
      );
    }

    // SDG alignment
    if (selectedSdgs.size > 0) {
      list = list.filter((e) => e.sdgs.some((s) => selectedSdgs.has(s)));
    }

    // Quick filter tags
    if (activeQuick !== "All") {
      const keywords = quickFilterKeywords[activeQuick];
      list = list.filter((e) =>
        e.expertise.some((tag) =>
          keywords.some((kw) => tag.toLowerCase().includes(kw)),
        ),
      );
    }

    return list;
  }, [search, hourlyRange, ratingFilters, availability, selectedSdgs, activeQuick]);

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  /* ---------- helpers ---------- */
  function toggleRating(key: string) {
    setRatingFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSdg(id: number) {
    setSelectedSdgs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applyFilters() {
    setVisibleCount(PAGE_SIZE);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-cream-bg">
      <div className="max-w-7xl mx-auto px-6 py-10 flex gap-8">
        {/* ========================================================= */}
        {/*  LEFT SIDEBAR                                             */}
        {/* ========================================================= */}
        <aside className="w-72 shrink-0 sticky top-24 overflow-y-auto max-h-[calc(100vh-6rem)] pr-2 hidden lg:block">
          <div className="space-y-7">
            {/* --- Search --- */}
            <div>
              <label className="label-xs text-text-muted mb-2 block">
                Search
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Name, topic, institution..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-clay-muted/60 bg-surface-cream focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown placeholder:text-text-muted/50 transition"
                />
              </div>
            </div>

            {/* --- Hourly Rate --- */}
            <div>
              <label className="label-xs text-text-muted mb-3 block">
                Hourly Rate
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>${hourlyRange[0]}</span>
                  <span>
                    ${hourlyRange[1]}
                    {hourlyRange[1] >= 500 ? "+" : ""}
                  </span>
                </div>
                {/* Min slider */}
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={hourlyRange[0]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setHourlyRange(([, max]) => [Math.min(v, max - 10), max]);
                  }}
                  className="w-full accent-warm-brown"
                  style={{ accentColor: "var(--color-warm-brown)" }}
                />
                {/* Max slider */}
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={hourlyRange[1]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setHourlyRange(([min]) => [min, Math.max(v, min + 10)]);
                  }}
                  className="w-full accent-warm-brown"
                  style={{ accentColor: "var(--color-warm-brown)" }}
                />
              </div>
            </div>

            {/* --- GR Rating --- */}
            <div>
              <label className="label-xs text-text-muted mb-3 block">
                GR Rating
              </label>
              <div className="space-y-2.5">
                {[
                  { key: "Elite", desc: "Top 1%" },
                  { key: "Premier", desc: "Top 5%" },
                  { key: "Verified", desc: "Verified" },
                ].map(({ key, desc }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={ratingFilters.has(key)}
                      onChange={() => toggleRating(key)}
                      className="w-4 h-4 rounded border-clay-muted text-warm-brown focus:ring-warm-brown/30 accent-warm-brown"
                      style={{ accentColor: "var(--color-warm-brown)" }}
                    />
                    <span className="text-sm text-charcoal group-hover:text-warm-brown-dark transition-colors">
                      {key}{" "}
                      <span className="text-text-muted text-xs">({desc})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* --- Availability --- */}
            <div>
              <label className="label-xs text-text-muted mb-3 block">
                Availability
              </label>
              <div className="space-y-2.5">
                {["Any", "Available this week", "Available today"].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="availability"
                      checked={availability === opt}
                      onChange={() => setAvailability(opt)}
                      className="w-4 h-4 border-clay-muted text-warm-brown focus:ring-warm-brown/30 accent-warm-brown"
                      style={{ accentColor: "var(--color-warm-brown)" }}
                    />
                    <span className="text-sm text-charcoal group-hover:text-warm-brown-dark transition-colors">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* --- SDG Alignment --- */}
            <div>
              <label className="label-xs text-text-muted mb-3 block">
                SDG Alignment
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {sdgData.map((sdg) => (
                  <button
                    key={sdg.id}
                    title={sdg.name}
                    onClick={() => toggleSdg(sdg.id)}
                    className="relative w-full aspect-square rounded-lg text-[10px] font-bold text-white flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: sdg.color,
                      opacity: selectedSdgs.size === 0 || selectedSdgs.has(sdg.id) ? 1 : 0.35,
                      outline: selectedSdgs.has(sdg.id)
                        ? `2px solid ${sdg.color}`
                        : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    {sdg.id}
                  </button>
                ))}
              </div>
            </div>

            {/* --- Apply Filters --- */}
            <button
              onClick={applyFilters}
              className="w-full py-2.5 text-sm font-medium rounded-xl bg-charcoal text-white hover:bg-charcoal-light transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </aside>

        {/* ========================================================= */}
        {/*  RIGHT MAIN CONTENT                                       */}
        {/* ========================================================= */}
        <main className="flex-1 min-w-0">
          {/* --- Header --- */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-semibold text-charcoal tracking-tight">
              Find Your Expert
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {filtered.length} expert{filtered.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {/* --- Quick Filter Tags --- */}
          <div className="flex flex-wrap gap-2 mb-8">
            {quickFilters.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setActiveQuick(tag);
                  setVisibleCount(PAGE_SIZE);
                }}
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

          {/* --- Expert Cards --- */}
          <div className="space-y-5">
            {displayed.map((expert, i) => (
              <motion.div
                key={expert.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="hover-card-lift group bg-surface-cream rounded-2xl border border-clay-muted/40 p-6"
              >
                <div className="flex gap-6">
                  {/* Avatar */}
                  <Link
                    href={`/expert/${expert.id}`}
                    className="shrink-0"
                  >
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-cream-200">
                      <img
                        src={expert.avatar}
                        alt={expert.name}
                        className="w-full h-full object-cover grayscale-hover"
                        width={112}
                        height={112}
                      />
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: name + badges */}
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <Link
                          href={`/expert/${expert.id}`}
                          className="font-serif text-xl font-semibold text-charcoal hover:text-warm-brown-dark transition-colors"
                        >
                          {expert.name}
                        </Link>
                        <p className="text-sm text-text-muted mt-0.5">
                          {expert.title} &middot; {expert.institution}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Verified badge */}
                        {expert.verified && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warm-brown bg-warm-brown/10 px-2.5 py-1 rounded-full">
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-1.06-1.06 3 3 0 01-5.304 0 3 3 0 00-1.06 1.06 3 3 0 010 5.304 3 3 0 001.06 1.06 3 3 0 015.304 0 3 3 0 001.06-1.06zM12 13a1 1 0 100-2 1 1 0 000 2z"
                                clipRule="evenodd"
                              />
                              <path d="M9.293 9.293a1 1 0 011.414 0L12 10.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-1-1a1 1 0 010-1.414z" />
                            </svg>
                            Verified
                          </span>
                        )}
                        {/* GR Rating tier badge */}
                        <span
                          className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            tierLabel(expert.ratingTier) === "Elite"
                              ? "bg-charcoal text-white"
                              : "bg-accent-tan/60 text-charcoal"
                          }`}
                        >
                          {tierLabel(expert.ratingTier)} &middot;{" "}
                          {expert.ratingTier}
                        </span>
                      </div>
                    </div>

                    {/* Expertise tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {expert.expertise.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-cream-100 text-charcoal-light border border-clay-muted/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* SDG dots */}
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className="text-[10px] text-text-muted mr-1 uppercase tracking-wider font-semibold">
                        SDGs
                      </span>
                      {expert.sdgs.map((sdgId) => {
                        const sdg = sdgData.find((s) => s.id === sdgId);
                        return (
                          <span
                            key={sdgId}
                            title={sdg?.name}
                            className="w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{ backgroundColor: sdg?.color }}
                          >
                            {sdgId}
                          </span>
                        );
                      })}
                    </div>

                    {/* Bottom row: availability, rate, CTA */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-clay-muted/30">
                      <div className="flex items-center gap-5">
                        {/* Availability */}
                        <span className="flex items-center gap-1.5 text-sm text-text-muted">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          {expert.availability}
                        </span>
                        {/* Hourly rate */}
                        <span className="text-sm font-semibold text-charcoal">
                          ${expert.hourlyRate}
                          <span className="font-normal text-text-muted">
                            /hr
                          </span>
                        </span>
                      </div>

                      <Link
                        href={`/expert/${expert.id}`}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-full bg-charcoal text-white hover:bg-charcoal-light transition-colors"
                      >
                        View Profile
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* --- Empty state --- */}
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted">
                No experts match your current filters.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setHourlyRange([50, 500]);
                  setRatingFilters(new Set());
                  setAvailability("Any");
                  setSelectedSdgs(new Set());
                  setActiveQuick("All");
                }}
                className="mt-4 text-sm font-medium text-warm-brown hover:text-warm-brown-dark underline underline-offset-2 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* --- Load More --- */}
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
