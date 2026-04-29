"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BookingData {
  expertName: string;
  expertPhoto: string;
  date: string;
  time: string;
  note: string;
  meetLink: string;
  createdAt: { seconds: number };
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const bounceIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

function BookingConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("id");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) { router.replace("/discover"); return; }
    getDoc(doc(db, "bookings", bookingId))
      .then((snap) => {
        if (snap.exists()) setBooking(snap.data() as BookingData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-brown border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-text-muted">Booking not found.</p>
        <Link href="/discover" className="mt-4 text-warm-brown hover:underline text-sm">Back to Discover</Link>
      </div>
    );
  }

  const details = [
    {
      label: "Date",
      value: booking.date,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: "Time",
      value: booking.time,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Duration",
      value: "30 minutes",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
        </svg>
      ),
    },
    {
      label: "Format",
      value: "Video Consultation",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-cream-bg flex items-center justify-center py-12 px-4">
      <motion.div
        className="max-w-2xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Success icon */}
        <motion.div variants={bounceIn} className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-warm-brown flex items-center justify-center shadow-lg shadow-warm-brown/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </motion.div>

        <motion.h1 variants={itemVariants} className="font-serif text-3xl md:text-4xl font-semibold text-charcoal text-center mb-8">
          Session Confirmed!
        </motion.h1>

        {/* Confirmation card */}
        <motion.div variants={itemVariants} className="bg-white border border-clay-muted/40 rounded-xl overflow-hidden shadow-sm">
          {/* Expert */}
          <div className="flex items-center gap-4 p-6 border-b border-clay-muted/30">
            <img
              src={booking.expertPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.expertName)}&background=8B5E3C&color=fff&size=200`}
              alt={booking.expertName}
              className="w-14 h-14 rounded-full object-cover border-2 border-warm-brown/20"
            />
            <div>
              <h2 className="text-lg font-semibold text-charcoal">{booking.expertName}</h2>
              <p className="text-sm text-text-muted mt-0.5">1-on-1 Consultation</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-px bg-clay-muted/20">
            {details.map((d) => (
              <div key={d.label} className="bg-white p-5 flex items-start gap-3">
                <span className="text-warm-brown mt-0.5">{d.icon}</span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{d.label}</p>
                  <p className="text-sm font-medium text-charcoal mt-0.5">{d.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Meet link */}
          <div className="p-6 border-t border-clay-muted/30 bg-green-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">Google Meet Link</p>
            <a
              href={booking.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-900 break-all"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {booking.meetLink}
            </a>
            <p className="text-xs text-green-600 mt-1.5">Share this link with both participants before the session.</p>
          </div>

          {/* Note */}
          {booking.note && (
            <div className="p-6 border-t border-clay-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Your Note</p>
              <p className="text-sm text-charcoal/80">{booking.note}</p>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <a
            href={booking.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-warm-brown rounded-xl hover:bg-warm-brown-dark transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            Join Meet
          </a>
          <Link
            href="/my-bookings"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-charcoal border border-clay-muted/50 rounded-xl hover:bg-cream-100 transition-colors flex items-center justify-center gap-2"
          >
            View My Bookings
          </Link>
          <Link
            href="/messages"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-charcoal border border-clay-muted/50 rounded-xl hover:bg-cream-100 transition-colors flex items-center justify-center gap-2"
          >
            Message Expert
          </Link>
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-sm text-text-muted mt-8">
          Booking ID: <span className="font-mono text-xs">{bookingId}</span>
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense>
      <BookingConfirmContent />
    </Suspense>
  );
}
