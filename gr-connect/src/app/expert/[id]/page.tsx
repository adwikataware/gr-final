"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { sdgData } from "@/data/mockData";
import { useAuth } from "@/lib/AuthContext";
import {
  collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ExpertData {
  id: string;
  firebase_uid: string;
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

interface CalendarWidgetProps {
  expert: ExpertData;
  seekerId: string;
  seekerName: string;
  seekerPhoto: string;
}

function CalendarWidget({ expert, seekerId, seekerName, seekerPhoto }: CalendarWidgetProps) {
  const router = useRouter();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [booking, setBooking] = useState(false);

  const displayMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = displayMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDow = displayMonth.getDay();
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const times = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"];
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const isPast = (day: number) => {
    if (monthOffset > 0) return false;
    return day < today.getDate();
  };

  async function handleConfirm() {
    if (!selectedDay || !selectedTime || booking) return;
    setBooking(true);

    const dateStr = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), selectedDay)
      .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

    // Generate a fake but plausible Google Meet link using a random code
    const meetCode = Math.random().toString(36).substring(2, 5) + "-" +
      Math.random().toString(36).substring(2, 7) + "-" +
      Math.random().toString(36).substring(2, 5);
    const meetLink = `https://meet.google.com/${meetCode}`;

    try {
      const docRef = await addDoc(collection(db, "bookings"), {
        seekerId,
        expertId: expert.firebase_uid || expert.id,
        expertName: expert.name,
        expertPhoto: expert.photo_url || "",
        seekerName,
        seekerPhoto,
        date: dateStr,
        time: selectedTime,
        note: note.trim(),
        meetLink,
        status: "upcoming",
        createdAt: serverTimestamp(),
      });
      router.push(`/booking/confirm?id=${docRef.id}`);
    } catch (err) {
      console.error(err);
      setBooking(false);
    }
  }

  return (
    <div className="bg-surface-cream rounded-lg overflow-hidden border border-warm-brown/20 p-6 shadow-inner">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { setMonthOffset((m) => Math.max(0, m - 1)); setSelectedDay(null); }}
          className="p-1 hover:bg-warm-brown/10 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-charcoal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h5 className="font-serif font-medium text-charcoal text-sm">{monthName}</h5>
        <button
          onClick={() => { setMonthOffset((m) => m + 1); setSelectedDay(null); }}
          className="p-1 hover:bg-warm-brown/10 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-charcoal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayHeaders.map((d) => (
          <div key={d} className="text-[10px] font-medium text-text-muted text-center uppercase">{d}</div>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            disabled={isPast(day)}
            onClick={() => setSelectedDay(day)}
            className={`py-1.5 text-xs rounded transition-all ${
              isPast(day) ? "text-text-muted/30 cursor-not-allowed" :
              selectedDay === day ? "bg-warm-brown text-white font-medium shadow-sm" :
              "text-charcoal hover:bg-warm-brown/10"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Time slots */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {times.map((time) => (
          <button
            key={time}
            onClick={() => setSelectedTime(time)}
            className={`py-2 px-3 border rounded text-xs transition-all ${
              selectedTime === time
                ? "border-warm-brown bg-warm-brown/10 text-charcoal font-medium"
                : "border-warm-brown/20 text-charcoal hover:bg-warm-brown/5"
            }`}
          >
            {time}
          </button>
        ))}
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)..."
        rows={2}
        className="w-full mt-4 p-3 text-xs border border-warm-brown/20 rounded bg-white/60 text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown resize-none"
      />

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!selectedDay || !selectedTime || booking}
        className="w-full mt-4 bg-warm-brown hover:bg-warm-brown-dark text-white font-serif font-medium py-3 rounded transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {booking ? "Booking..." : "Confirm Booking"}
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

  const [expert, setExpert] = useState<ExpertData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  const mainRef = useRef(null);
  const mainInView = useInView(mainRef, { once: true, margin: "-60px" });
  const ratingRef = useRef(null);
  const ratingInView = useInView(ratingRef, { once: true, margin: "-60px" });
  const sdgRef = useRef(null);
  const sdgInView = useInView(sdgRef, { once: true, margin: "-60px" });
  const pubRef = useRef(null);
  const pubInView = useInView(pubRef, { once: true, margin: "-60px" });

  const { user, profile, isLoggedIn } = useAuth();
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showPremiumInput, setShowPremiumInput] = useState(false);
  const [messageSending, setMessageSending] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setExpert(data); setFetchLoading(false); })
      .catch(() => setFetchLoading(false));
  }, [params.id]);

  if (fetchLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-brown border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
  const ratingProgress = (expert.gr_rating / 100) * circumference;
  const impactPercentile = Math.min(Math.round(expert.gr_rating * 0.88), 99);

  const handleAiSubmit = async () => {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuery,
          expertName: expert.name,
          expertise: expert.topics,
          publications: 0,
        }),
      });
      const data = await res.json();
      setAiResponse(data.answer ?? data.error ?? "No response.");
    } catch {
      setAiResponse("Failed to get AI response. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!isLoggedIn || !user) { router.push("/login"); return; }
    if (!expert.firebase_uid) return;
    if (messageSending) return;
    setMessageSending(true);
    const expertUid = expert.firebase_uid;
    try {
      const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
      const snap = await getDocs(q);
      const existing = snap.docs.find((d) => (d.data().participants as string[]).includes(expertUid));
      if (existing) { router.push("/messages"); return; }
      const expertDoc = await getDoc(doc(db, "users", expertUid)).catch(() => null);
      const expertData = expertDoc?.data();
      await addDoc(collection(db, "conversations"), {
        participants: [user.uid, expertUid],
        participantNames: {
          [user.uid]: profile?.displayName || user.displayName || "You",
          [expertUid]: expertData?.displayName || expert.name,
        },
        participantPhotos: {
          [user.uid]: profile?.photoURL || user.photoURL || "",
          [expertUid]: expertData?.photoURL || expert.photo_url || "",
        },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      router.push("/messages");
    } catch (err) {
      console.error(err);
    } finally {
      setMessageSending(false);
    }
  };

  // Determine active and inactive SDGs for display
  const activeSdgs = expert.sdg_ids;
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
                    src={expert.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=8B5E3C&color=fff&size=200`}
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
                      {expert.topics[0]}{expert.topics[1] ? ` & ${expert.topics[1]}` : ""}
                    </motion.p>
                  </div>

                  {/* Verified badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={mainInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="flex items-center gap-2 bg-charcoal text-cream-bg px-3 py-1 rounded-full self-start"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider">{expert.tier_label}</span>
                  </motion.div>
                </div>

                {/* Institution */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={mainInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex items-center gap-3 mt-4 text-sm text-text-muted flex-wrap"
                >
                  <svg className="w-[18px] h-[18px] text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium text-charcoal/80">{expert.affiliation}</span>
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

                {/* Topic tags */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={mainInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {expert.topics.map((tag) => (
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
                    {expert.gr_rating}
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
                {expert.tier} · {expert.tier_label}
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

              <div className="grid grid-cols-2 gap-8 h-full items-center divide-x divide-warm-brown/20">
                <div className="text-center">
                  <div className="text-3xl font-serif font-medium text-warm-brown">
                    {expert.rank ? `#${expert.rank}` : "—"}
                  </div>
                  <div className="text-xs text-text-muted mt-2 font-medium tracking-wide uppercase">
                    GR Rank
                  </div>
                </div>
                <div className="text-center pl-8">
                  <div className="text-3xl font-serif font-medium text-charcoal">
                    {expert.tier}
                  </div>
                  <div className="text-xs text-text-muted mt-2 font-medium tracking-wide uppercase">
                    Tier
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

            <div className="space-y-4">
              {expert.topics.map((topic, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={pubInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease }}
                  className="group border-b border-warm-brown/10 pb-4 last:border-0 last:pb-0"
                >
                  <h4 className="text-base font-medium text-charcoal group-hover:text-warm-brown transition-colors font-serif leading-snug">
                    {topic}
                  </h4>
                </motion.div>
              ))}
            </div>
          </motion.div>
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
                      Ask about {expert.name.split(" ")[0]}&apos;s research
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
                    placeholder={`e.g. What is ${expert.name.split(" ")[0]}'s research focus?`}
                    className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-1 focus:ring-accent-tan focus:border-accent-tan outline-none transition-all duration-300 placeholder-white/20"
                  />
                  <button
                    onClick={handleAiSubmit}
                    disabled={aiLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-accent-tan hover:text-white transition-colors duration-300 disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
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
                  $50
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
                      <button
                        onClick={handleStartConversation}
                        disabled={messageSending || !expert.firebase_uid}
                        title={!expert.firebase_uid ? "This researcher hasn't claimed their profile yet" : undefined}
                        className="w-full mt-2 bg-charcoal text-white text-sm font-medium py-2.5 rounded-lg hover:bg-charcoal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {messageSending ? "Opening chat..." : !expert.firebase_uid ? "Not yet available" : "Send Message"}
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
                    onClick={() => isLoggedIn ? null : router.push("/login")}
                    className="w-full bg-accent-tan hover:bg-warm-brown-light text-charcoal font-bold py-4 px-4 rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span className="uppercase tracking-wider text-xs">Schedule Consultation</span>
                  </button>
                  <p className="text-[10px] text-white/40 text-center mt-3 font-light">
                    Book a consultation session
                  </p>

                  {/* Calendar */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    {isLoggedIn && user ? (
                      <CalendarWidget
                        expert={expert}
                        seekerId={user.uid}
                        seekerName={profile?.displayName || user.displayName || "Anonymous"}
                        seekerPhoto={profile?.photoURL || user.photoURL || ""}
                      />
                    ) : (
                      <button
                        onClick={() => router.push("/login")}
                        className="w-full bg-warm-brown hover:bg-warm-brown-dark text-white font-serif font-medium py-3 rounded transition-all shadow-md"
                      >
                        Log in to Book
                      </button>
                    )}
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
              <div className="text-sm text-text-muted">
                <Link href="/discover" className="text-warm-brown hover:underline">Browse all experts →</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
