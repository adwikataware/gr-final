"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  openalex_id: string;
  h_index: number;
  total_citations: number;
  publications_count: number;
  i10_index: number;
  total_patents: number;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p4_score: number;
}

interface Publication {
  title: string;
  year: number | null;
  citations: number;
  doi: string;
  venue: string;
  type: string;
  open_access: boolean;
}

interface ExpertPageProps {
  params: Promise<{ id: string }>;
}

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const SDG_META: Record<number, { label: string; color: string }> = {
  1:  { label: "No Poverty",            color: "#E5243B" },
  2:  { label: "Zero Hunger",           color: "#DDA63A" },
  3:  { label: "Good Health",           color: "#4C9F38" },
  4:  { label: "Quality Education",     color: "#C5192D" },
  5:  { label: "Gender Equality",       color: "#FF3A21" },
  6:  { label: "Clean Water",           color: "#26BDE2" },
  7:  { label: "Clean Energy",          color: "#FCC30B" },
  8:  { label: "Decent Work",           color: "#A21942" },
  9:  { label: "Industry Innovation",   color: "#FD6925" },
  10: { label: "Reduced Inequalities",  color: "#DD1367" },
  11: { label: "Sustainable Cities",    color: "#FD9D24" },
  12: { label: "Responsible Consumption", color: "#BF8B2E" },
  13: { label: "Climate Action",        color: "#3F7E44" },
  14: { label: "Life Below Water",      color: "#0A97D9" },
  15: { label: "Life On Land",          color: "#56C02B" },
  16: { label: "Peace & Justice",       color: "#00689D" },
  17: { label: "Partnerships",          color: "#19486A" },
};

function getDesignation(name: string, tierLabel: string, affiliation: string): string {
  const isProf = /^Prof\.?/i.test(name);
  const isDr = /^Dr\.?/i.test(name);
  const inst = affiliation ? `at ${affiliation}` : "";
  if (isProf) return `Professor ${inst}`.trim();
  if (isDr) return `Researcher ${inst}`.trim();
  if (tierLabel === "Elite") return `Distinguished Researcher ${inst}`.trim();
  if (tierLabel === "Premier") return `Senior Researcher ${inst}`.trim();
  return `Researcher ${inst}`.trim();
}

/* ------------------------------------------------------------------ */
/*  CALENDAR WIDGET                                                    */
/* ------------------------------------------------------------------ */
interface AvailabilitySlot { dow: number; time: string; }
interface CalendarWidgetProps {
  expert: ExpertData; seekerId: string; seekerName: string;
  seekerPhoto: string; seekerEmail: string; expertEmail: string;
}

function CalendarWidget({ expert, seekerId, seekerName, seekerPhoto, seekerEmail, expertEmail }: CalendarWidgetProps) {
  const router = useRouter();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [booking, setBooking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const expertUid = expert.firebase_uid || expert.id;

  useEffect(() => {
    if (!expertUid) { setLoadingAvail(false); return; }
    getDoc(doc(db, "availability", expertUid))
      .then((snap) => { if (snap.exists()) setAvailability(snap.data().slots || []); })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [expertUid]);

  const displayMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = displayMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDow = displayMonth.getDay();
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const isPast = (day: number) => {
    if (monthOffset > 0) return false;
    if (monthOffset < 0) return true;
    return day < today.getDate();
  };
  const getDow = (day: number) => new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day).getDay();
  const timesForDay = (day: number) => availability.filter((s) => s.dow === getDow(day)).map((s) => s.time);
  const isAvailable = (day: number) => !isPast(day) && timesForDay(day).length > 0;
  const timeSlotsForSelected = selectedDay ? timesForDay(selectedDay) : [];

  async function handleConfirm() {
    if (!selectedDay || !selectedTime || booking) return;
    setBooking(true);
    const dateStr = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), selectedDay)
      .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    try {
      const docRef = await addDoc(collection(db, "bookings"), {
        seekerId, expertId: expertUid, expertName: expert.name,
        expertPhoto: expert.photo_url || "", expertEmail,
        seekerName, seekerPhoto, seekerEmail,
        date: dateStr, time: selectedTime, note: note.trim(),
        meetLink: "", status: "pending", createdAt: serverTimestamp(),
      });
      router.push(`/booking/confirm?id=${docRef.id}`);
    } catch (err) { console.error(err); setBooking(false); }
  }

  if (loadingAvail) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 border-2 border-warm-brown/30 border-t-warm-brown rounded-full animate-spin" />
    </div>
  );

  if (availability.length === 0) return (
    <div className="bg-warm-brown/5 rounded-lg p-4 text-center border border-warm-brown/10">
      <p className="text-xs text-text-muted italic">This expert hasn&apos;t set availability yet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setMonthOffset((m) => Math.max(0, m - 1)); setSelectedDay(null); setSelectedTime(null); }}
          className="p-1 hover:bg-warm-brown/10 rounded transition-colors">
          <svg className="w-4 h-4 text-charcoal/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-semibold text-charcoal">{monthName}</span>
        <button onClick={() => { setMonthOffset((m) => m + 1); setSelectedDay(null); setSelectedTime(null); }}
          className="p-1 hover:bg-warm-brown/10 rounded transition-colors">
          <svg className="w-4 h-4 text-charcoal/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {dayHeaders.map((d) => <div key={d} className="text-[9px] font-bold text-text-muted text-center uppercase py-1">{d}</div>)}
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const avail = isAvailable(day); const past = isPast(day); const selected = selectedDay === day;
          return (
            <button key={day} disabled={past || !avail}
              onClick={() => { setSelectedDay(day); setSelectedTime(null); }}
              className={`py-1.5 text-[11px] rounded relative transition-all ${past ? "text-text-muted/30 cursor-not-allowed" : !avail ? "text-text-muted/40 cursor-not-allowed" : selected ? "bg-warm-brown text-white font-semibold" : "text-charcoal hover:bg-warm-brown/10 font-medium"}`}>
              {day}
              {avail && !selected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-warm-brown" />}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2">Available times</p>
          <div className="grid grid-cols-2 gap-1.5">
            {timeSlotsForSelected.map((time) => (
              <button key={time} onClick={() => setSelectedTime(time)}
                className={`py-2 px-2 rounded text-xs transition-all ${selectedTime === time ? "bg-warm-brown text-white font-medium" : "bg-white text-charcoal hover:bg-warm-brown/5 border border-warm-brown/20"}`}>
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
      <textarea value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)..." rows={2}
        className="w-full p-2.5 text-xs bg-white border border-warm-brown/20 rounded text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown resize-none" />
      <button onClick={handleConfirm} disabled={!selectedDay || !selectedTime || booking}
        className="w-full bg-warm-brown hover:bg-warm-brown-dark text-white font-semibold py-3 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
        {booking ? "Sending request..." : "Schedule Consultation"}
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
  const [publications, setPublications] = useState<Publication[]>([]);
  const [pubsLoading, setPubsLoading] = useState(false);
  const [expertEmail, setExpertEmail] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [msgError, setMsgError] = useState("");

  const { user, profile, isLoggedIn } = useAuth();

  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const sdgRef = useRef(null);
  const pubRef = useRef(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setExpert(data);
        setFetchLoading(false);
        if (data?.firebase_uid) {
          getDoc(doc(db, "users", data.firebase_uid))
            .then((snap) => { if (snap.exists()) setExpertEmail(snap.data()?.email || ""); })
            .catch(() => {});
        }
        if (data?.id) {
          setPubsLoading(true);
          fetch(`${apiUrl}/api/v1/discover/${data.id}/publications`)
            .then((r) => r.ok ? r.json() : { publications: [] })
            .then((d) => setPublications(d.publications || []))
            .catch(() => {})
            .finally(() => setPubsLoading(false));
        }
      })
      .catch(() => setFetchLoading(false));
  }, [params.id]);

  const handleAiSubmit = async () => {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true); setAiResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: aiQuery, expertName: expert?.name, expertise: expert?.topics, publications: expert?.publications_count || 0 }),
      });
      const data = await res.json();
      setAiResponse(data.answer ?? data.error ?? "No response.");
    } catch { setAiResponse("Failed to get AI response."); }
    finally { setAiLoading(false); }
  };

  const handleStartConversation = async () => {
    if (!isLoggedIn || !user) { router.push("/login"); return; }
    if (!expert?.firebase_uid || messageSending) return;
    setMessageSending(true); setMsgError("");
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
        participantNames: { [user.uid]: profile?.displayName || user.displayName || "You", [expertUid]: expertData?.displayName || expert.name },
        participantPhotos: { [user.uid]: profile?.photoURL || user.photoURL || "", [expertUid]: expertData?.photoURL || expert.photo_url || "" },
        lastMessage: "", lastMessageAt: serverTimestamp(), createdAt: serverTimestamp(),
      });
      router.push("/messages");
    } catch (err) { console.error(err); setMsgError("Failed to open chat. Please try again."); }
    finally { setMessageSending(false); }
  };

  if (fetchLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-warm-brown border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!expert) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <h1 className="font-serif text-3xl font-semibold text-charcoal">Expert Not Found</h1>
      <Link href="/discover" className="text-warm-brown hover:underline">Browse all experts →</Link>
    </div>
  );

  const circumference = 2 * Math.PI * 52;
  const ratingOffset = circumference - (expert.gr_rating / 100) * circumference;
  const impactPercentile = Math.min(Math.round(expert.gr_rating * 0.88), 99);
  const isOwnProfile = user && expert.firebase_uid === user.uid;
  const activeSdgs = (expert.sdg_ids || []).slice(0, 6);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">

        {/* ============================================================ */}
        {/*  LEFT COLUMN (8 cols)                                        */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 space-y-6">

          {/* ── PROFILE HEADER ── */}
          <motion.div ref={headerRef}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="bg-surface-cream border border-warm-brown/20 p-8 shadow-sm relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-warm-brown/3 to-transparent pointer-events-none" />

            {/* Edit button for own profile */}
            {isOwnProfile && (
              <Link href="/profile/edit"
                className="absolute top-6 right-6 flex items-center gap-1.5 text-xs font-medium text-warm-brown hover:text-charcoal border border-warm-brown/30 hover:border-charcoal/30 px-3 py-1.5 rounded-full transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </Link>
            )}

            <div className="flex flex-col sm:flex-row gap-7 items-start relative z-10">
              {/* Photo */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded overflow-hidden shadow border border-warm-brown/20">
                  <img
                    src={expert.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=8B5E3C&color=fff&size=200`}
                    alt={expert.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
              </div>

              <div className="flex-1 min-w-0 pr-16">
                <div className="flex items-start gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-charcoal leading-tight">{expert.name}</h1>
                  <span className="flex items-center gap-1.5 bg-charcoal text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {expert.tier_label}
                  </span>
                </div>

                <p className="text-warm-brown font-medium mt-1.5 font-serif italic text-base">
                  {getDesignation(expert.name, expert.tier_label, expert.affiliation)}
                </p>

                {expert.affiliation && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-charcoal/70">
                    <svg className="w-4 h-4 text-warm-brown shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium">{expert.affiliation}</span>
                  </div>
                )}

                {expert.orcid && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                    <span className="font-mono bg-warm-brown/10 px-2 py-0.5 rounded text-warm-brown-dark">ORCID: {expert.orcid}</span>
                  </div>
                )}

                {expert.bio && (
                  <p className="mt-4 text-sm text-text-main leading-relaxed border-l-2 border-warm-brown/30 pl-3 font-light">
                    {expert.bio}
                  </p>
                )}

                {expert.topics.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expert.topics.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-cream-bg text-xs font-medium text-charcoal border border-warm-brown/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── GR RATING + RESEARCH IMPACT ── */}
          <motion.div ref={statsRef} variants={stagger} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* GR Rating */}
            <motion.div variants={fadeUp}
              className="bg-surface-cream border border-warm-brown/20 p-6 flex flex-col items-center shadow-sm">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">GR Rating</p>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="5" className="text-warm-brown/10" />
                  <motion.circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: ratingOffset }}
                    transition={{ duration: 2, delay: 0.2, ease: "easeOut" }}
                    className="text-warm-brown" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                    className="text-3xl font-serif font-semibold text-charcoal">{expert.gr_rating}</motion.span>
                  <span className="text-[8px] font-bold text-warm-brown uppercase tracking-widest mt-0.5">Score</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-xs font-bold text-warm-brown">{expert.tier} · {expert.tier_label}</span>
                {expert.rank && <p className="text-[10px] text-text-muted mt-1">Rank #{expert.rank} globally</p>}
              </div>
              <div className="mt-4 w-full">
                <div className="flex justify-between text-[9px] text-text-muted uppercase tracking-wider mb-1">
                  <span>Impact Percentile</span>
                  <span className="font-bold text-charcoal">{impactPercentile}th</span>
                </div>
                <div className="w-full bg-warm-brown/10 h-1 rounded-full">
                  <motion.div className="bg-warm-brown h-1 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${impactPercentile}%` }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }} />
                </div>
              </div>
            </motion.div>

            {/* Research Impact */}
            <motion.div variants={fadeUp}
              className="md:col-span-2 bg-surface-cream border border-warm-brown/20 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Research Impact</p>
                <div className="flex gap-2 text-[10px] text-text-muted">
                  <span>OpenAlex</span><span className="opacity-40">·</span><span className="italic">Verified</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Citations", value: expert.total_citations ? expert.total_citations.toLocaleString() : "—", big: true },
                  { label: "H-Index", value: expert.h_index || "—", big: true },
                  { label: "i10-Index", value: expert.i10_index || "—", big: false },
                  { label: "Publications", value: expert.publications_count || "—", big: false },
                ].map(({ label, value, big }, idx) => (
                  <div key={label} className={`text-center ${idx > 0 ? "border-l border-warm-brown/10 pl-4" : ""}`}>
                    <div className={`font-serif font-semibold text-warm-brown ${big ? "text-3xl" : "text-2xl"}`}>{value}</div>
                    <div className="text-[10px] text-text-muted mt-1 uppercase tracking-wide">{label}</div>
                  </div>
                ))}
              </div>

              {/* GR Score Breakdown */}
              <div className="mt-6 pt-5 border-t border-warm-brown/10 space-y-3">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">GR Score Breakdown</p>
                {[
                  { label: "Publications", score: expert.p1_score },
                  { label: "Citations", score: expert.p2_score },
                  { label: "H-Index", score: expert.p3_score },
                  { label: "Engagement", score: expert.p4_score },
                ].map(({ label, score }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-24 shrink-0">{label}</span>
                    <div className="flex-1 bg-warm-brown/10 h-1.5 rounded-full overflow-hidden">
                      <motion.div className="bg-warm-brown h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(score ?? 0, 100)}%` }}
                        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }} />
                    </div>
                    <span className="text-xs font-semibold text-charcoal w-10 text-right">{score?.toFixed(1) ?? "—"}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ── SDG INDEX ── */}
          {activeSdgs.length > 0 && (
            <motion.div ref={sdgRef}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="bg-surface-cream border border-warm-brown/20 p-7 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-charcoal flex items-center gap-2">
                    <svg className="w-5 h-5 text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    GR SDG Index
                  </h2>
                  <p className="text-xs text-text-muted mt-1">Research contribution to UN Sustainable Development Goals</p>
                </div>
              </div>
              <motion.div variants={stagger} initial="hidden" animate={sdgInView ? "visible" : "hidden"}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {activeSdgs.map((sdgId) => {
                  const meta = SDG_META[sdgId];
                  if (!meta) return null;
                  return (
                    <motion.div key={sdgId} variants={fadeUp}
                      whileHover={{ y: -3, transition: { duration: 0.15 } }}
                      className="aspect-square rounded-sm p-3 flex flex-col justify-between text-white shadow-sm cursor-default"
                      style={{ backgroundColor: meta.color }}>
                      <span className="text-[10px] font-serif italic opacity-60">{String(sdgId).padStart(2, "0")}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider leading-tight mt-auto">
                        {meta.label.split(" ").slice(0, 2).join("\n")}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* ── PUBLICATIONS ── */}
          <motion.div ref={pubRef}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="bg-surface-cream border border-warm-brown/20 p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-serif font-semibold text-charcoal flex items-center gap-2">
                <svg className="w-5 h-5 text-warm-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Selected Publications
              </h3>
              <span className="text-[10px] text-text-muted italic">via OpenAlex</span>
            </div>

            {pubsLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-warm-brown/30 border-t-warm-brown rounded-full animate-spin" />
              </div>
            ) : publications.length === 0 ? (
              <p className="text-sm text-text-muted italic text-center py-8">No publications found on OpenAlex.</p>
            ) : (
              <div className="space-y-0">
                {publications.map((pub, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.08 * i, ease }}
                    className="group flex items-start justify-between gap-4 py-4 border-b border-warm-brown/10 last:border-0">
                    <div className="flex-1 min-w-0">
                      {pub.doi ? (
                        <a href={`https://doi.org/${pub.doi.replace("https://doi.org/", "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-charcoal group-hover:text-warm-brown transition-colors font-serif leading-snug hover:underline underline-offset-2 line-clamp-2">
                          {pub.title}
                        </a>
                      ) : (
                        <h4 className="text-sm font-medium text-charcoal font-serif leading-snug line-clamp-2">{pub.title}</h4>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {pub.venue && <span className="text-[11px] text-text-muted italic">{pub.venue}</span>}
                        {pub.venue && pub.year && <span className="text-text-muted/30">·</span>}
                        {pub.year && <span className="text-[11px] text-text-muted">{pub.year}</span>}
                        {pub.open_access && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">OA</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-base font-serif font-semibold text-warm-brown">{pub.citations.toLocaleString()}</div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wide">citations</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/*  RIGHT SIDEBAR (4 cols)                                      */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 mt-6 lg:mt-0">
          <div className="sticky top-24 space-y-5">

            {/* ── AI ASSISTANT ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2, ease }}
              className="bg-charcoal rounded-xl overflow-hidden border border-warm-brown/10 shadow-xl">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 bg-warm-brown/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-tan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
                  {expert.publications_count > 0 && (
                    <p className="text-white/40 text-[10px]">Trained on {expert.publications_count} papers</p>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-[10px] font-bold text-accent-tan uppercase tracking-widest">
                  What do you want to know about {expert.name.split(" ")[0]}&apos;s research?
                </p>
                <div className="relative">
                  <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAiSubmit()}
                    placeholder={`e.g. Findings on ${expert.topics[0] || "research"}...`}
                    className="w-full pl-3 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-warm-brown/50" />
                  <button onClick={handleAiSubmit} disabled={aiLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-accent-tan hover:text-white disabled:opacity-40 transition-colors">
                    {aiLoading
                      ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 3v3m0 12v3M3 12h3m12 0h3" /></svg>
                      : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                  </button>
                </div>
                <AnimatePresence>
                  {aiResponse && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/80 leading-relaxed">
                      {aiResponse}
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-[9px] text-white/20 text-center">Free · Instant AI Response</p>
              </div>
            </motion.div>

            {/* ── MESSAGE ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3, ease }}
              className="bg-surface-cream border border-warm-brown/10 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-accent-tan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-charcoal">Send Message</div>
                  <div className="text-[9px] text-text-muted">Start a direct conversation</div>
                </div>
              </div>
              <button onClick={handleStartConversation} disabled={messageSending || !expert.firebase_uid}
                className="w-full bg-charcoal text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-charcoal/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {messageSending ? "Opening..." : !expert.firebase_uid ? "Profile not claimed" : "Message Expert"}
              </button>
              {msgError && <p className="text-xs text-red-500 mt-2 text-center">{msgError}</p>}
            </motion.div>

            {/* ── BOOK SESSION ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4, ease }}
              className="bg-surface-cream rounded-xl overflow-hidden border border-warm-brown/20 shadow-sm">
              <div className="px-5 py-4 border-b border-warm-brown/10">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Check Availability</p>
              </div>
              <div className="p-5">
                {isLoggedIn && user ? (
                  <CalendarWidget expert={expert} seekerId={user.uid}
                    seekerName={profile?.displayName || user.displayName || "Anonymous"}
                    seekerPhoto={profile?.photoURL || user.photoURL || ""}
                    seekerEmail={profile?.email || user.email || ""}
                    expertEmail={expertEmail} />
                ) : (
                  <button onClick={() => router.push("/login")}
                    className="w-full bg-warm-brown hover:bg-warm-brown-dark text-white font-semibold py-3 rounded text-sm transition-all">
                    Log in to Book
                  </button>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </main>
  );
}
