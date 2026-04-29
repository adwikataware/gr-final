"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  collection, query, where, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

interface Booking {
  id: string;
  seekerId: string;
  expertId: string;
  expertName: string;
  expertPhoto: string;
  seekerName: string;
  seekerPhoto: string;
  date: string;
  time: string;
  note: string;
  meetLink: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: { seconds: number } | null;
}

function statusBadge(status: Booking["status"]) {
  if (status === "upcoming") return "bg-green-100 text-green-700";
  if (status === "completed") return "bg-clay-muted/40 text-charcoal/60";
  return "bg-red-100 text-red-600";
}

export default function MyBookingsPage() {
  const { user, profile, isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "all">("upcoming");

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace("/login");
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!user) return;

    const field = profile?.role === "expert" ? "expertId" : "seekerId";
    const q = query(
      collection(db, "bookings"),
      where(field, "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user, profile?.role]);

  if (authLoading || !user) return null;

  const displayed = tab === "upcoming"
    ? bookings.filter((b) => b.status === "upcoming")
    : bookings;

  return (
    <div className="min-h-screen bg-cream-bg">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-charcoal">My Bookings</h1>
          <p className="text-sm text-text-muted mt-1">
            {profile?.role === "expert" ? "Sessions booked with you" : "Your scheduled consultations"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-clay-muted/20 rounded-xl p-1 w-fit">
          {(["upcoming", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t ? "bg-white text-charcoal shadow-sm" : "text-text-muted hover:text-charcoal"
              }`}
            >
              {t === "upcoming" ? "Upcoming" : "All"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-clay-muted/40 p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-clay-muted/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-clay-muted/30 rounded w-40" />
                    <div className="h-3 bg-clay-muted/20 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-2">
              {tab === "upcoming" ? "No upcoming sessions" : "No bookings yet"}
            </h2>
            <p className="text-sm text-text-muted mb-6">
              {tab === "upcoming" ? "Your upcoming consultations will appear here." : "Book a session with an expert to get started."}
            </p>
            {profile?.role !== "expert" && (
              <Link
                href="/discover"
                className="px-6 py-2.5 bg-warm-brown text-white text-sm font-medium rounded-full hover:bg-warm-brown-dark transition-colors"
              >
                Find Experts
              </Link>
            )}
          </div>
        )}

        <div className="space-y-4">
          {displayed.map((booking, i) => {
            const isExpert = profile?.role === "expert";
            const otherName = isExpert ? booking.seekerName : booking.expertName;
            const otherPhoto = isExpert ? booking.seekerPhoto : booking.expertPhoto;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-clay-muted/40 p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {otherPhoto ? (
                    <img src={otherPhoto} alt={otherName} className="w-12 h-12 rounded-full object-cover border border-warm-brown/20 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown font-semibold shrink-0">
                      {otherName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-medium text-charcoal">{otherName}</h3>
                        <p className="text-sm text-text-muted mt-0.5">
                          {booking.date} · {booking.time} · 30 min
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>

                    {booking.note && (
                      <p className="text-sm text-charcoal/70 mt-2 italic">"{booking.note}"</p>
                    )}

                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                      {booking.status === "upcoming" && (
                        <a
                          href={booking.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-warm-brown text-white text-xs font-semibold rounded-full hover:bg-warm-brown-dark transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                          </svg>
                          Join Meet
                        </a>
                      )}
                      <Link
                        href={`/booking/confirm?id=${booking.id}`}
                        className="text-xs font-medium text-warm-brown hover:underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
