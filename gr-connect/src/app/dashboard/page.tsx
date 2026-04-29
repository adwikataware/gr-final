"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Booking {
  id: string;
  expertName: string;
  seekerName: string;
  expertPhoto: string;
  seekerPhoto: string;
  date: string;
  time: string;
  meetLink: string;
  status: "upcoming" | "completed" | "cancelled";
  seekerId: string;
  expertId: string;
}

interface Expert {
  id: string;
  name: string;
  photo_url: string;
  topics: string[];
  gr_rating: number;
  tier_label: string;
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const { count, ref } = useCountUp(value);
  return (
    <motion.div
      ref={ref}
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
      className="bg-white border border-cream-200 rounded-xl p-6 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow duration-300"
    >
      <div className="w-11 h-11 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown mb-1">
        {icon}
      </div>
      <span className="text-3xl font-bold text-charcoal font-serif tabular-nums">{count}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const { user, profile, isLoggedIn } = useAuth();
  const router = useRouter();

  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ sessions: 0, messages: 0, experts: 0 });
  const [recommendedExperts, setRecommendedExperts] = useState<Expert[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!user) return;

    const field = profile?.role === "expert" ? "expertId" : "seekerId";
    const q = query(
      collection(db, "bookings"),
      where(field, "==", user.uid),
      where("status", "==", "upcoming"),
      orderBy("createdAt", "desc"),
      limit(3),
    );
    const unsub = onSnapshot(q, (snap) => {
      setUpcomingBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoadingBookings(false);
    }, () => setLoadingBookings(false));
    return unsub;
  }, [user, profile?.role]);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      const field = profile?.role === "expert" ? "expertId" : "seekerId";

      const [bookingsSnap, convSnap] = await Promise.all([
        getDocs(query(collection(db, "bookings"), where(field, "==", user!.uid))),
        getDocs(query(collection(db, "conversations"), where("participants", "array-contains", user!.uid))),
      ]);

      setStats({
        sessions: bookingsSnap.size,
        experts: convSnap.size,
        messages: convSnap.size * 3,
      });
    }
    loadStats().catch(console.error);
  }, [user, profile?.role]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=6`)
      .then((r) => r.json())
      .then((data) => setRecommendedExperts(data.researchers ?? []))
      .catch(() => {});
  }, []);

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal mb-2">Sign in to view your dashboard</h2>
          <p className="text-text-muted text-sm mb-6">You need to be logged in to access your profile and dashboard.</p>
          <Link href="/login" className="inline-block px-8 py-3 bg-charcoal text-white text-sm font-semibold rounded-full hover:bg-charcoal-light transition-colors">
            Log in
          </Link>
        </motion.div>
      </div>
    );
  }

  const roleBadge = profile?.role === "expert" ? "Expert" : "Seeker";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">

      {/* 1. PROFILE HEADER */}
      <motion.section initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="h-32 bg-warm-brown/10" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="shrink-0">
                {profile?.photoURL || user?.photoURL ? (
                  <img
                    src={profile?.photoURL || user?.photoURL || ""}
                    alt={profile?.displayName || "User"}
                    className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-md bg-cream-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-warm-brown/20 flex items-center justify-center text-warm-brown text-3xl font-semibold">
                    {(profile?.displayName || user.displayName || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-2 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h1 className="font-serif text-2xl font-semibold text-charcoal truncate">
                    {profile?.displayName || user.displayName || "User"}
                  </h1>
                  <span className={`inline-flex items-center self-start px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide ${roleBadge === "Expert" ? "bg-warm-brown/15 text-warm-brown-dark" : "bg-anthropic-tan/30 text-charcoal"}`}>
                    {roleBadge}
                  </span>
                </div>
                <p className="text-sm text-text-muted mt-0.5">{profile?.affiliation || ""}</p>
              </div>
              <Link href="/onboarding" className="self-start sm:self-end shrink-0 inline-flex items-center gap-1.5 px-5 py-2 border border-charcoal/20 text-charcoal text-sm font-medium rounded-full hover:bg-charcoal hover:text-white transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </Link>
            </div>
            {profile?.bio && <p className="mt-4 text-sm text-charcoal/80 leading-relaxed max-w-3xl">{profile.bio}</p>}
            {profile?.expertise?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.expertise.map((field: string) => (
                  <span key={field} className="px-3 py-1 text-xs font-medium rounded-full bg-cream-100 border border-cream-200 text-charcoal/70">{field}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </motion.section>

      {/* 2. STATS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10"
      >
        <StatCard value={stats.sessions} label="Sessions Booked" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
          </svg>
        } />
        <StatCard value={stats.experts} label="Experts Connected" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
          </svg>
        } />
        <StatCard value={stats.messages} label="Messages Sent" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
          </svg>
        } />
      </motion.section>

      {/* 3. UPCOMING SESSIONS */}
      <motion.section initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-charcoal">Upcoming Sessions</h2>
          <Link href="/my-bookings" className="text-sm font-medium text-warm-brown hover:underline">View all →</Link>
        </div>

        {loadingBookings && (
          <div className="bg-white border border-cream-200 rounded-xl p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-clay-muted/20" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-clay-muted/20 rounded w-48" />
                <div className="h-3 bg-clay-muted/10 rounded w-32" />
              </div>
            </div>
          </div>
        )}

        {!loadingBookings && upcomingBookings.length === 0 && (
          <div className="bg-white border border-cream-200 rounded-xl p-8 text-center">
            <p className="text-text-muted text-sm">No upcoming sessions.</p>
            {profile?.role !== "expert" && (
              <Link href="/discover" className="mt-3 inline-block text-sm font-medium text-warm-brown hover:underline">
                Find an expert to book →
              </Link>
            )}
          </div>
        )}

        <div className="space-y-4">
          {upcomingBookings.map((booking) => {
            const isExpert = profile?.role === "expert";
            const otherName = isExpert ? booking.seekerName : booking.expertName;
            const otherPhoto = isExpert ? booking.seekerPhoto : booking.expertPhoto;
            return (
              <div key={booking.id} className="bg-white border border-cream-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {otherPhoto ? (
                      <img src={otherPhoto} alt={otherName} className="w-12 h-12 rounded-full object-cover border border-warm-brown/20 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown font-semibold shrink-0">
                        {otherName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-charcoal">{otherName} — Video Call</h3>
                      <p className="text-sm text-text-muted mt-0.5">{booking.date} · {booking.time}</p>
                      <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                        Confirmed
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:self-center">
                    <a href={booking.meetLink} target="_blank" rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-warm-brown text-white text-sm font-semibold rounded-full hover:bg-warm-brown-dark transition-colors">
                      Join Call
                    </a>
                    <Link href="/my-bookings" className="text-sm font-medium text-text-muted hover:text-charcoal transition-colors">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* 4. RECOMMENDED EXPERTS */}
      <motion.section initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-charcoal">Recommended Experts</h2>
          <Link href="/discover" className="text-sm font-medium text-warm-brown hover:underline">Browse all →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {recommendedExperts.map((expert) => (
            <motion.div key={expert.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
              className="min-w-[220px] bg-white border border-cream-200 rounded-xl p-5 flex flex-col items-center text-center shrink-0">
              <img
                src={expert.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=8B5E3C&color=fff&size=200`}
                alt={expert.name}
                className="w-16 h-16 rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-300 border-2 border-cream-200 mb-3"
              />
              <h3 className="text-sm font-semibold text-charcoal truncate w-full">{expert.name}</h3>
              <p className="text-xs text-text-muted mt-0.5 truncate w-full">{expert.topics[0] || ""}</p>
              <span className="inline-flex items-center mt-2.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warm-brown/10 text-warm-brown">
                GR {expert.gr_rating}
              </span>
              <Link href={`/expert/${expert.id}`}
                className="mt-4 w-full py-2 text-center text-xs font-semibold rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal hover:text-white transition-colors duration-200">
                View Profile
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
