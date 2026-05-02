"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Expert {
  id: string;
  firebase_uid: string;
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
const quickFilters = ["All", "IoT", "AI/ML", "Biology", "Climate", "Security", "Medicine", "Materials", "Robotics", "Energy"] as const;
type QuickFilter = (typeof quickFilters)[number];

const quickFilterKeywords: Record<QuickFilter, string[]> = {
  All: [],
  IoT: ["iot", "internet of things", "smart", "sensor", "wireless"],
  "AI/ML": ["machine learning", "artificial intelligence", "nlp", "deep learning", "data science", "neural", "computer vision"],
  Biology: ["biology", "genomics", "crispr", "bioinformatics", "biomedical", "cancer", "clinical"],
  Climate: ["climate", "renewable energy", "carbon", "environmental", "sustainability", "ecology"],
  Security: ["cybersecurity", "security", "blockchain", "cryptography", "network security"],
  Medicine: ["medicine", "health", "pharmaceutical", "drug", "medical", "diagnosis", "therapy"],
  Materials: ["materials", "polymer", "composite", "battery", "supercapacitor", "nanomaterial"],
  Robotics: ["robotics", "automation", "mechatronics", "control systems"],
  Energy: ["energy", "solar", "photovoltaic", "fuel cell", "power systems"],
};

const SDG_META_DISCOVER: Record<number, { label: string; color: string; short: string }> = {
  1:  { label: "No Poverty",              color: "#E5243B", short: "Poverty" },
  2:  { label: "Zero Hunger",             color: "#DDA63A", short: "Hunger" },
  3:  { label: "Good Health",             color: "#4C9F38", short: "Health" },
  4:  { label: "Quality Education",       color: "#C5192D", short: "Education" },
  5:  { label: "Gender Equality",         color: "#FF3A21", short: "Equality" },
  6:  { label: "Clean Water",             color: "#26BDE2", short: "Water" },
  7:  { label: "Clean Energy",            color: "#FCC30B", short: "Energy" },
  8:  { label: "Decent Work",             color: "#A21942", short: "Work" },
  9:  { label: "Industry & Innovation",   color: "#FD6925", short: "Innovation" },
  10: { label: "Reduced Inequalities",    color: "#DD1367", short: "Inequality" },
  11: { label: "Sustainable Cities",      color: "#FD9D24", short: "Cities" },
  12: { label: "Responsible Consumption", color: "#BF8B2E", short: "Consumption" },
  13: { label: "Climate Action",          color: "#3F7E44", short: "Climate" },
  14: { label: "Life Below Water",        color: "#0A97D9", short: "Ocean" },
  15: { label: "Life On Land",            color: "#56C02B", short: "Land" },
  16: { label: "Peace & Justice",         color: "#00689D", short: "Justice" },
  17: { label: "Partnerships",            color: "#19486A", short: "Partners" },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 6;

function tierBadgeClass() {
  return "bg-[#3D2B1F] text-[#F5D08A]";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function DiscoverPage() {
  const router = useRouter();
  const { user, profile, isLoggedIn } = useAuth();
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedSdgs, setSelectedSdgs] = useState<Set<number>>(new Set());
  const [activeQuick, setActiveQuick] = useState<QuickFilter>("All");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [minRating, setMinRating] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const hasFilters = search || selectedSdgs.size > 0 || activeQuick !== "All" || selectedTier !== "All" || minRating > 0;

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

    if (selectedTier !== "All") {
      list = list.filter((e) => e.tier === selectedTier);
    }

    if (minRating > 0) {
      list = list.filter((e) => e.gr_rating >= minRating);
    }

    return list;
  }, [experts, search, selectedSdgs, activeQuick, selectedTier, minRating]);

  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  function toggleSdg(id: number) {
    setSelectedSdgs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleMessage(expert: Expert) {
    if (!isLoggedIn || !user) { router.push("/login"); return; }
    if (!expert.firebase_uid) return;
    if (messagingId) return;
    setMessagingId(expert.id);
    try {
      const expertUid = expert.firebase_uid;
      const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
      const snap = await getDocs(q);
      const existing = snap.docs.find((d) => (d.data().participants as string[]).includes(expertUid));
      if (!existing) {
        await addDoc(collection(db, "conversations"), {
          participants: [user.uid, expertUid],
          participantNames: {
            [user.uid]: profile?.displayName || user.displayName || "You",
            [expertUid]: expert.name,
          },
          participantPhotos: {
            [user.uid]: profile?.photoURL || user.photoURL || "",
            [expertUid]: expert.photo_url || "",
          },
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
      router.push("/messages");
    } catch (err) {
      console.error(err);
    } finally {
      setMessagingId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-cream-bg">
      <div className="max-w-7xl mx-auto px-6 py-10 flex gap-8">

        {/* LEFT SIDEBAR */}
        <aside className="w-64 shrink-0 sticky top-24 overflow-y-auto max-h-[calc(100vh-6rem)] pr-1 hidden lg:block">
          <div className="space-y-6">

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input type="text" placeholder="Name, topic, institution..."
                value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-warm-brown/20 bg-white focus:outline-none focus:border-warm-brown placeholder:text-text-muted/50 transition shadow-sm" />
            </div>

            {/* Tier */}
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">GR Tier</p>
              <div className="space-y-1">
                {[
                  { label: "All Tiers", value: "All" },
                  { label: "GR-A", value: "GR-A", dot: "#3D2B1F" },
                  { label: "GR-B", value: "GR-B", dot: "#7A4F1E" },
                  { label: "GR-C", value: "GR-C", dot: "#9d8461" },
                  { label: "GR-D", value: "GR-D", dot: "#b5a080" },
                  { label: "GR-E", value: "GR-E", dot: "#ccc" },
                ].map(({ label, value, dot }) => (
                  <button key={value} onClick={() => { setSelectedTier(value); setVisibleCount(PAGE_SIZE); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${selectedTier === value ? "bg-charcoal text-white" : "text-charcoal hover:bg-warm-brown/8"}`}>
                    {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min GR Rating */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Min GR Rating</p>
                <span className="text-xs font-semibold text-warm-brown">{minRating > 0 ? `≥ ${minRating}` : "Any"}</span>
              </div>
              <input type="range" min={0} max={90} step={10} value={minRating}
                onChange={(e) => { setMinRating(Number(e.target.value)); setVisibleCount(PAGE_SIZE); }}
                className="w-full accent-warm-brown h-1.5 rounded-full" />
              <div className="flex justify-between text-[9px] text-text-muted mt-1">
                <span>0</span><span>30</span><span>60</span><span>90</span>
              </div>
            </div>

            {/* SDG Alignment */}
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">SDG Alignment</p>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(SDG_META_DISCOVER).map(([id, meta]) => {
                  const sdgId = Number(id);
                  const active = selectedSdgs.has(sdgId);
                  return (
                    <button key={sdgId} title={meta.label}
                      onClick={() => { toggleSdg(sdgId); setVisibleCount(PAGE_SIZE); }}
                      className="relative aspect-square rounded-lg text-[10px] font-bold text-white flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105"
                      style={{
                        backgroundColor: meta.color,
                        opacity: selectedSdgs.size === 0 || active ? 1 : 0.4,
                        boxShadow: active ? `0 0 0 2px white, 0 0 0 4px ${meta.color}` : "none",
                      }}>
                      <span className="text-[11px] font-bold">{sdgId}</span>
                      <span className="text-[7px] font-semibold uppercase tracking-wide leading-tight text-center px-0.5 opacity-90 line-clamp-1">{meta.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button onClick={() => { setSearch(""); setSelectedSdgs(new Set()); setActiveQuick("All"); setSelectedTier("All"); setMinRating(0); setVisibleCount(PAGE_SIZE); }}
                className="w-full py-2 text-xs font-semibold rounded-lg border border-warm-brown/20 text-warm-brown hover:bg-warm-brown/5 transition-colors">
                Clear All Filters
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
                    {/* Avatar with GR badge */}
                    <Link href={`/expert/${expert.id}`} className="shrink-0">
                      <div className="relative w-28" style={{ paddingBottom: "1.25rem" }}>
                        <div className="w-28 h-28 rounded-xl overflow-hidden bg-cream-200">
                          <img
                            src={expert.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=8B5E3C&color=fff&size=200`}
                            alt={expert.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* GR Rating badge */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#3D2B1F] text-[#F5D08A] px-2.5 py-1 rounded-full shadow-md border border-[#F5D08A]/20 whitespace-nowrap">
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">GR</span>
                          <span className="text-sm font-black leading-none">{expert.gr_rating}</span>
                        </div>
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

                        <Link href={`/expert/${expert.id}`} className="shrink-0">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${tierBadgeClass()}`}>
                            {expert.tier}
                          </span>
                        </Link>
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
                            const meta = SDG_META_DISCOVER[sdgId];
                            return (
                              <span key={sdgId} title={meta?.label}
                                className="w-5 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center"
                                style={{ backgroundColor: meta?.color ?? "#888" }}>
                                {sdgId}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-clay-muted/30">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMessage(expert)}
                            disabled={messagingId === expert.id || !expert.firebase_uid}
                            title={!expert.firebase_uid ? "This researcher hasn't claimed their profile yet" : undefined}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border border-warm-brown text-warm-brown hover:bg-warm-brown hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {messagingId === expert.id ? "Opening..." : "Message"}
                          </button>
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
