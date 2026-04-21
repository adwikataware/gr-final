"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { experts, sdgData } from "@/data/mockData";
import CountUp from "@/components/CountUp";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface ExpertPageProps {
  params: Promise<{ id: string }>;
}

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                 */
/* ------------------------------------------------------------------ */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ------------------------------------------------------------------ */
/*  SDG ICON MAP (material-style SVGs)                                 */
/* ------------------------------------------------------------------ */

const sdgIcons: Record<number, React.ReactNode> = {
  3: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  4: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 14l9-5-9-5-9 5 9 5zm0 0v7m-9-12l9 5 9-5" />
    </svg>
  ),
  7: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  9: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  11: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  13: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  15: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  16: (
    <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  SDG DISPLAY DATA (custom colors matching the HTML design)          */
/* ------------------------------------------------------------------ */

function getSdgDisplayInfo(sdgId: number, isActive: boolean) {
  const sdgNames: Record<number, string[]> = {
    3: ["Good", "Health"],
    4: ["Quality", "Education"],
    7: ["Affordable", "Energy"],
    8: ["Decent", "Work"],
    9: ["Industry,", "Innovation"],
    10: ["Reduced", "Inequalities"],
    11: ["Sustainable", "Cities"],
    13: ["Climate", "Action"],
    14: ["Life Below", "Water"],
    15: ["Life", "On Land"],
    16: ["Peace &", "Justice"],
  };
  const activeBgs: Record<number, string> = {
    13: "#4a4a4a",
    9: "#6d5e4b",
    11: "#9d8461",
    4: "#7A6548",
    16: "#5C5C5C",
    3: "#4C6B4A",
  };
  return {
    lines: sdgNames[sdgId] || [`SDG`, `${sdgId}`],
    bg: isActive ? (activeBgs[sdgId] || "#5C5C5C") : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  CALENDAR COMPONENT                                                 */
/* ------------------------------------------------------------------ */

function CalendarWidget({ onBook }: { onBook: () => void }) {
  const [selectedDate, setSelectedDate] = useState<number | null>(13);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const times = ["09:00", "11:00", "14:00", "16:00"];
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="bg-surface-cream rounded-lg overflow-hidden border border-warm-brown/20 p-6 shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button className="p-1 hover:bg-warm-brown/10 rounded transition-colors">
          <svg className="w-4 h-4 text-charcoal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h5 className="font-serif font-medium text-charcoal">March 2026</h5>
        <button className="p-1 hover:bg-warm-brown/10 rounded transition-colors">
          <svg className="w-4 h-4 text-charcoal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayHeaders.map((d) => (
          <div key={d} className="text-[10px] font-medium text-text-muted text-center uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDate(day)}
            className={`py-2 text-xs rounded cursor-pointer transition-all ${
              selectedDate === day
                ? "bg-warm-brown text-white font-medium shadow-sm"
                : "text-charcoal hover:bg-warm-brown/10"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Time slots */}
      <div className="mt-8 grid grid-cols-2 gap-2">
        {times.map((time) => (
          <button
            key={time}
            onClick={() => setSelectedTime(time)}
            className={`py-2 px-4 border rounded text-xs transition-all ${
              selectedTime === time
                ? "border-warm-brown bg-warm-brown/10 text-charcoal font-medium"
                : "border-warm-brown/20 text-charcoal hover:bg-warm-brown/5"
            }`}
          >
            {time}
          </button>
        ))}
      </div>

      {/* Confirm */}
      <button
        onClick={onBook}
        className="w-full mt-6 bg-warm-brown hover:bg-warm-brown-dark text-white font-serif font-medium py-3 rounded transition-all shadow-md hover:shadow-lg"
      >
        Confirm Booking
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function ExpertProfilePage(props: ExpertPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const expert = experts.find((e) => e.id === params.id);

  const mainRef = useRef(null);
  const mainInView = useInView(mainRef, { once: true, margin: "-60px" });

  const ratingRef = useRef(null);
  const ratingInView = useInView(ratingRef, { once: true, margin: "-60px" });

  const sdgRef = useRef(null);
  const sdgInView = useInView(sdgRef, { once: true, margin: "-60px" });

  const pubRef = useRef(null);
  const pubInView = useInView(pubRef, { once: true, margin: "-60px" });

  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [showPremiumInput, setShowPremiumInput] = useState(false);

  if (!expert) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="font-serif text-3xl font-semibold text-charcoal mb-4">Expert Not Found</h1>
        <Link href="/discover" className="text-warm-brown hover:text-warm-brown-dark underline underline-offset-4">
          Browse all experts
        </Link>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 60;
  const ratingProgress = (expert.grRating / 100) * circumference;
  const impactPercentile = Math.min(Math.round(expert.grRating * 0.88), 99);

  const handleAiSubmit = () => {
    if (!aiQuery.trim()) return;
    setAiResponse(
      `Based on ${expert.name}'s research in ${expert.expertise[0]}, their published work extensively covers this topic. Their key findings in "${expert.keyPublications[0]?.title}" provide foundational insights. I'd recommend reviewing their ${expert.publications} publications for comprehensive coverage, particularly the work in ${expert.keyPublications[0]?.journal}.`
    );
  };

  const otherExperts = experts.filter((e) => e.id !== expert.id).slice(0, 2);

  // Determine active and inactive SDGs for display
  const activeSdgs = expert.sdgs;
  const inactiveSdgs = [4, 7, 15].filter((s) => !activeSdgs.includes(s));
  const allDisplaySdgs = [...activeSdgs, ...inactiveSdgs];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        {/* ============================================================ */}
        {/*  LEFT / MAIN COLUMN (8 cols)                                 */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 space-y-8">
          {/* ---- PROFILE HEADER ---- */}
          <motion.div
            ref={mainRef}
            initial={{ opacity: 0, y: 30 }}
            animate={mainInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease }}
            className="bg-surface-cream border border-warm-brown/20 p-8 sm:p-10 relative overflow-hidden shadow-sm"
          >
            {/* Decorative blur */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-warm-brown/5 rounded-full blur-3xl" />

            <div className="flex flex-col sm:flex-row gap-8 items-start relative z-10">
              {/* Avatar */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={mainInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2, ease }}
                className="relative group"
              >
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-sm overflow-hidden shadow-md border border-warm-brown/20">
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-warm-brown w-4 h-4 rounded-full border-2 border-white" title="Online" />
              </motion.div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <motion.h1
                      initial={{ opacity: 0, y: 15 }}
                      animate={mainInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.3, ease }}
                      className="text-3xl sm:text-4xl font-serif font-medium text-charcoal leading-tight"
                    >
                      {expert.name}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={mainInView ? { opacity: 1 } : {}}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="text-warm-brown font-medium mt-2 font-serif text-lg italic"
                    >
                      {expert.expertise[0]} & {expert.expertise[1]}
                    </motion.p>
                  </div>

                  {/* Verified badge */}
                  {expert.verified && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={mainInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: 0.5 }}
                      className="flex items-center gap-2 bg-charcoal text-cream-bg px-3 py-1 rounded-full self-start"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wider">Verified</span>
                    </motion.div>
                  )}
                </div>

                {/* Institution & Location */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={mainInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex items-center gap-3 mt-4 text-sm text-text-muted flex-wrap"
                >
                  <svg className="w-[18px] h-[18px] text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium text-charcoal/80">{expert.institution}</span>
                </motion.div>

                {/* Bio */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={mainInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="mt-6 text-text-main leading-relaxed text-base border-l-2 border-warm-brown/30 pl-4 font-light"
                >
                  {expert.bio}
                </motion.p>

                {/* Expertise tags */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={mainInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {expert.expertise.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-cream-bg text-xs font-medium text-charcoal border border-warm-brown/20 hover:border-warm-brown transition-colors cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ---- GR RATING + RESEARCH IMPACT (1:2 grid) ---- */}
          <motion.div
            ref={ratingRef}
            variants={stagger}
            initial="hidden"
            animate={ratingInView ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* GR Rating Card */}
            <motion.div
              variants={fadeUp}
              className="md:col-span-1 bg-surface-cream border border-warm-brown/20 p-6 flex flex-col items-center justify-center relative shadow-sm group hover:border-warm-brown/50 transition-colors duration-300"
            >
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6">
                GR Rating
              </h3>

              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                  <circle
                    cx="72" cy="72" r="60"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-warm-brown/10"
                  />
                  <motion.circle
                    cx="72" cy="72" r="60"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={ratingInView ? { strokeDashoffset: circumference - ratingProgress } : {}}
                    transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
                    className="text-warm-brown"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={ratingInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 1 }}
                    className="text-4xl font-serif font-medium text-charcoal"
                  >
                    {expert.grRating}
                  </motion.span>
                  <span className="text-[9px] font-bold text-warm-brown uppercase tracking-[0.15em] mt-1">GR Rating</span>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={ratingInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 1.2 }}
                className="mt-6 border border-warm-brown/30 bg-warm-brown/5 text-warm-brown-dark px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {expert.ratingTier}
              </motion.div>
            </motion.div>

            {/* Research Impact Card */}
            <motion.div
              variants={fadeUp}
              className="md:col-span-2 bg-surface-cream border border-warm-brown/20 p-8 flex flex-col justify-between shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                  Research Impact
                </h3>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-text-muted font-medium">Scopus</span>
                  <div className="w-px h-3 bg-warm-brown/40" />
                  <span className="text-xs text-text-muted font-serif italic">Web of Science</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8 h-full items-center divide-x divide-warm-brown/20">
                <div className="text-center">
                  <div className="text-3xl font-serif font-medium text-charcoal">
                    <CountUp target={expert.citations} className="text-3xl font-serif font-medium text-charcoal" />
                  </div>
                  <div className="text-xs text-text-muted mt-2 font-medium tracking-wide uppercase">
                    Total Citations
                  </div>
                </div>
                <div className="text-center pl-8">
                  <div className="text-3xl font-serif font-medium text-warm-brown">
                    <CountUp target={expert.hIndex} className="text-3xl font-serif font-medium text-warm-brown" />
                  </div>
                  <div className="text-xs text-text-muted mt-2 font-medium tracking-wide uppercase">
                    H-Index
                  </div>
                </div>
                <div className="text-center pl-8">
                  <div className="text-3xl font-serif font-medium text-charcoal">
                    <CountUp target={expert.i10Index} className="text-3xl font-serif font-medium text-charcoal" />
                  </div>
                  <div className="text-xs text-text-muted mt-2 font-medium tracking-wide uppercase">
                    I10-Index
                  </div>
                </div>
              </div>

              {/* Impact percentile bar */}
              <div className="mt-8">
                <div className="w-full bg-warm-brown/10 h-1">
                  <motion.div
                    className="bg-charcoal h-1"
                    initial={{ width: 0 }}
                    animate={ratingInView ? { width: `${impactPercentile}%` } : {}}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">
                    Impact Percentile
                  </span>
                  <span className="text-[10px] font-bold text-charcoal font-serif">
                    {impactPercentile}th Percentile
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ---- SDG INDEX ---- */}
          <motion.div
            ref={sdgRef}
            initial={{ opacity: 0, y: 30 }}
            animate={sdgInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease }}
            className="bg-surface-cream border border-warm-brown/20 p-8 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-warm-brown/10 pb-4">
              <div>
                <h2 className="text-xl font-serif font-medium text-charcoal flex items-center gap-2">
                  <svg className="w-5 h-5 text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                  GR SDG Index
                </h2>
                <p className="text-sm text-text-muted mt-1 font-light">
                  Research contribution to UN Sustainable Development Goals
                </p>
              </div>
              <button className="text-sm text-warm-brown hover:text-charcoal font-medium border-b border-warm-brown/50 hover:border-charcoal transition-colors pb-0.5">
                View Analysis Report
              </button>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              animate={sdgInView ? "visible" : "hidden"}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
            >
              {allDisplaySdgs.map((sdgId) => {
                const isActive = activeSdgs.includes(sdgId);
                const info = getSdgDisplayInfo(sdgId, isActive);
                const sdg = sdgData.find((s) => s.id === sdgId);

                if (isActive) {
                  return (
                    <motion.div
                      key={sdgId}
                      variants={fadeUp}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="group relative aspect-square p-4 flex flex-col justify-between text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                      style={{ backgroundColor: info.bg }}
                    >
                      <span className="text-xs font-serif italic opacity-60">
                        {String(sdgId).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold leading-tight mt-auto z-10 tracking-widest uppercase">
                        {info.lines[0]}<br />{info.lines[1]}
                      </span>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <div className="absolute top-3 right-3">
                        {sdgIcons[sdgId] || (
                          <svg className="w-7 h-7 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        )}
                      </div>
                      {/* Active dot for primary SDGs */}
                      {sdgId === activeSdgs[0] && (
                        <div className="absolute top-2 right-2 p-1">
                          <div className="bg-white/90 rounded-full w-1.5 h-1.5" />
                        </div>
                      )}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={sdgId}
                    variants={fadeUp}
                    className="aspect-square bg-warm-brown/5 border border-warm-brown/10 p-4 flex flex-col justify-between text-text-muted opacity-50"
                  >
                    <span className="text-xs font-serif italic">
                      {String(sdgId).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-bold leading-tight mt-auto tracking-widest uppercase text-charcoal/60">
                      {info.lines[0]}<br />{info.lines[1]}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>

          {/* ---- PUBLICATIONS ---- */}
          <motion.div
            ref={pubRef}
            initial={{ opacity: 0, y: 30 }}
            animate={pubInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease }}
            className="bg-surface-cream border border-warm-brown/20 p-8 shadow-sm"
          >
            <h3 className="text-xl font-serif font-medium text-charcoal mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Selected Publications
            </h3>

            <div className="space-y-6">
              {expert.keyPublications.map((pub, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={pubInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease }}
                  className="group border-b border-warm-brown/10 pb-6 last:border-0 last:pb-0 cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div>
                      <h4 className="text-lg font-medium text-charcoal group-hover:text-warm-brown transition-colors font-serif leading-snug">
                        {pub.title}
                      </h4>
                      <p className="text-sm text-text-muted mt-2 font-light">
                        {pub.journal} &bull; <span className="italic">{pub.year}</span>
                      </p>
                    </div>
                    <span className="bg-warm-brown/10 text-warm-brown-dark text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-sm whitespace-nowrap shrink-0">
                      {pub.citations} Citations
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ---- AWARDS & RECOGNITION ---- */}
          {expert.awards && expert.awards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease }}
              className="bg-surface-cream border border-warm-brown/20 p-8 shadow-sm"
            >
              <h3 className="text-xl font-serif font-medium text-charcoal mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Awards &amp; Recognition
              </h3>
              <div className="space-y-4">
                {expert.awards.map((award, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1, ease }}
                    className="flex items-center gap-4 p-4 border border-warm-brown/10 hover:border-warm-brown/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-sm bg-warm-brown/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-charcoal">{award}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  RIGHT SIDEBAR (4 cols, sticky)                              */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="sticky top-28 space-y-6">
            {/* ---- AI ASSISTANT ---- */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease }}
              className="bg-charcoal text-cream-bg rounded-xl shadow-xl overflow-hidden border border-warm-brown/10 hover:-translate-x-1 transition-transform duration-300"
            >
              <div className="bg-charcoal-light/50 p-6 border-b border-warm-brown/10">
                <div className="flex items-center gap-4">
                  <div className="bg-warm-brown/10 p-2 rounded border border-warm-brown/20">
                    <svg className="w-5 h-5 text-accent-tan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-serif font-medium text-lg">AI Assistant</h3>
                    <p className="text-white/50 text-xs font-light tracking-wide">
                      Trained on {expert.publications} papers
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 py-10">
                <label className="font-bold text-accent-tan uppercase tracking-[0.2em] text-xs">
                  What do you want to know about {expert.name.split(",")[0]}&apos;s research?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiSubmit()}
                    placeholder={`e.g. Findings on ${expert.expertise[0]}?`}
                    className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-accent-tan focus:border-accent-tan outline-none transition-all duration-300 placeholder-white/20"
                  />
                  <button
                    onClick={handleAiSubmit}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-accent-tan hover:text-white transition-colors duration-300"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* AI Response */}
                <AnimatePresence>
                  {aiResponse && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 leading-relaxed"
                    >
                      {aiResponse}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[10px] text-white/30 text-center font-light">
                  Free &bull; Instant AI Response
                </p>
              </div>
            </motion.div>

            {/* ---- PREMIUM MESSAGE ---- */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease }}
              className="bg-surface-cream rounded-xl shadow-lg border border-warm-brown/10 p-1 hover:-translate-x-1 transition-transform duration-300 group"
            >
              <button
                onClick={() => setShowPremiumInput(!showPremiumInput)}
                className="w-full flex items-center justify-between p-5 rounded-lg border border-transparent hover:border-warm-brown/20 hover:bg-warm-brown/5 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center text-accent-tan">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-charcoal">Premium Message</div>
                    <div className="text-[10px] text-text-muted font-light">Guaranteed response in 48h</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-white bg-charcoal px-3 py-1 rounded-full">
                  ${expert.sessionTypes.find((s) => s.type === "Premium Message")?.price || 50}
                </span>
              </button>

              <AnimatePresence>
                {showPremiumInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <textarea
                        rows={3}
                        placeholder="Write your message..."
                        className="w-full p-3 text-sm border border-warm-brown/20 rounded-lg bg-cream-bg focus:ring-1 focus:ring-warm-brown focus:border-warm-brown outline-none resize-none"
                      />
                      <button className="w-full mt-2 bg-charcoal text-white text-sm font-medium py-2.5 rounded-lg hover:bg-charcoal-light transition-colors">
                        Send Message
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---- SCHEDULING & CALENDAR ---- */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease }}
              className="bg-charcoal text-cream-bg rounded-xl shadow-xl overflow-hidden border border-warm-brown/10 hover:-translate-x-1 transition-transform duration-300"
            >
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-accent-tan uppercase tracking-[0.2em]">
                    Check Availability
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-accent-tan/30 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer">
                      <div className="text-xs text-white/80">Tomorrow, 10:00 AM EST</div>
                      <span className="text-[10px] font-bold text-accent-tan uppercase">Select</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-accent-tan/30 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer">
                      <div className="text-xs text-white/80">Wed, Mar 18, 2:00 PM EST</div>
                      <span className="text-[10px] font-bold text-accent-tan uppercase">Select</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 italic">All times shown in EST</p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => router.push("/booking")}
                    className="w-full bg-accent-tan hover:bg-warm-brown-light text-charcoal font-bold py-4 px-4 rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="uppercase tracking-wider text-xs">Schedule Consultation</span>
                  </button>
                  <p className="text-[10px] text-white/40 text-center mt-3 font-light">
                    Rates start from ${expert.hourlyRate}/hr
                  </p>

                  {/* Calendar */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <CalendarWidget onBook={() => router.push("/booking")} />
                  </div>
                  <p className="text-[10px] text-white/30 text-center mt-4 italic">
                    Select a date and time to confirm your booking
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ---- SIMILAR EXPERTS ---- */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.75, ease }}
              className="pt-8 border-t border-warm-brown/20"
            >
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6">
                Similar Experts
              </h4>
              <div className="space-y-5">
                {otherExperts.map((other) => (
                  <Link
                    key={other.id}
                    href={`/expert/${other.id}`}
                    className="flex items-center gap-4 p-3 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-warm-brown/10 hover:shadow-sm group"
                  >
                    <img
                      src={other.avatar}
                      alt={other.name}
                      className="w-12 h-12 rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all shadow-sm"
                    />
                    <div>
                      <div className="text-sm font-serif font-medium text-charcoal">{other.name}</div>
                      <div className="text-xs text-text-muted italic">{other.expertise[0]}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
