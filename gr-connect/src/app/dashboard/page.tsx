"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { experts } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

/* ------------------------------------------------------------------ */
/*  Section animation variants                                        */
/* ------------------------------------------------------------------ */
const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/*  Stat card component                                               */
/* ------------------------------------------------------------------ */
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const { count, ref } = useCountUp(value);

  return (
    <motion.div
      ref={ref}
      variants={staggerItem}
      className="bg-white border border-cream-200 rounded-xl p-6 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow duration-300"
    >
      <div className="w-11 h-11 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown mb-1">
        {icon}
      </div>
      <span className="text-3xl font-bold text-charcoal font-serif tabular-nums">
        {count}
      </span>
      <span className="text-sm text-text-muted">{label}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity item                                                     */
/* ------------------------------------------------------------------ */
const activities = [
  {
    text: "Messaged Dr. Parikshit Mahalle",
    time: "2 hours ago",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    text: "Booked session with Dr. Elena Vasquez",
    time: "1 day ago",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
  {
    text: "Completed session with Dr. Rajesh Kumar",
    time: "3 days ago",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
  {
    text: "Left a review for Dr. Sarah Chen",
    time: "5 days ago",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Dashboard page                                                    */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const { user, isLoggedIn } = useAuth();

  /* ---- Not authenticated gate ---- */
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal mb-2">
            Sign in to view your dashboard
          </h2>
          <p className="text-text-muted text-sm mb-6">
            You need to be logged in to access your profile and dashboard.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-charcoal text-white text-sm font-semibold rounded-full hover:bg-charcoal-light transition-colors"
          >
            Log in
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ---- Mock user fields ---- */
  const fieldsOfStudy = (user as { field?: string }).field
    ? (user as { field?: string }).field!.split(/[,&-]/).map((s: string) => s.trim()).filter(Boolean)
    : ["Computer Science", "IoT", "Security"];

  const roleBadge =
    (user as { role?: string }).role === "expert" ? "Expert" : "Seeker";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* ============================================================ */}
      {/*  1. PROFILE HEADER                                          */}
      {/* ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
        className="mb-10"
      >
        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="h-32 bg-warm-brown/10" />

          {/* Avatar + info row */}
          <div className="px-6 pb-6">
            {/* Avatar overlapping banner */}
            <div className="-mt-12 flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="shrink-0">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-md bg-cream-100"
                />
              </div>

              <div className="flex-1 min-w-0 pt-2 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h1 className="font-serif text-2xl font-semibold text-charcoal truncate">
                    {user.name}
                  </h1>
                  <span
                    className={`inline-flex items-center self-start px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                      roleBadge === "Expert"
                        ? "bg-warm-brown/15 text-warm-brown-dark"
                        : "bg-anthropic-tan/30 text-charcoal"
                    }`}
                  >
                    {roleBadge}
                  </span>
                </div>

                <p className="text-sm text-text-muted mt-0.5">
                  {(user as { institution?: string }).institution ?? "University of Pune"}
                </p>
              </div>

              <Link
                href="#"
                className="self-start sm:self-end shrink-0 inline-flex items-center gap-1.5 px-5 py-2 border border-charcoal/20 text-charcoal text-sm font-medium rounded-full hover:bg-charcoal hover:text-white transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </Link>
            </div>

            {/* Bio */}
            <p className="mt-4 text-sm text-charcoal/80 leading-relaxed max-w-3xl">
              {(user as { bio?: string }).bio ??
                "Masters student researching IoT security protocols and federated learning applications."}
            </p>

            {/* Field tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {fieldsOfStudy.map((field: string) => (
                <span
                  key={field}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-cream-100 border border-cream-200 text-charcoal/70"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ============================================================ */}
      {/*  2. STATS ROW                                                */}
      {/* ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
      >
        <StatCard
          value={12}
          label="Sessions Completed"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
            </svg>
          }
        />
        <StatCard
          value={5}
          label="Experts Connected"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
            </svg>
          }
        />
        <StatCard
          value={34}
          label="Messages Sent"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
            </svg>
          }
        />
        <StatCard
          value={8}
          label="Hours of Mentorship"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          }
        />
      </motion.section>

      {/* ============================================================ */}
      {/*  3. UPCOMING SESSIONS                                        */}
      {/* ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
        className="mb-10"
      >
        <h2 className="font-serif text-xl font-semibold text-charcoal mb-4">
          Upcoming Sessions
        </h2>

        <div className="bg-white border border-cream-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: session info */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warm-brown/10 flex items-center justify-center shrink-0 text-warm-brown">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-charcoal">
                  Dr. Parikshit N. Mahalle &mdash; Video Call
                </h3>
                <p className="text-sm text-text-muted mt-0.5">
                  March 15, 2026 &bull; 2:00 PM
                </p>
                <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                  Confirmed
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-3 sm:self-center">
              <Link
                href="#"
                className="px-5 py-2.5 bg-warm-brown text-white text-sm font-semibold rounded-full hover:bg-warm-brown-dark transition-colors"
              >
                Join Call
              </Link>
              <Link
                href="#"
                className="text-sm font-medium text-text-muted hover:text-charcoal transition-colors"
              >
                Reschedule
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ============================================================ */}
      {/*  4. RECENT ACTIVITY                                          */}
      {/* ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
        className="mb-10"
      >
        <h2 className="font-serif text-xl font-semibold text-charcoal mb-4">
          Recent Activity
        </h2>

        <div className="bg-white border border-cream-200 rounded-xl p-6">
          <div className="space-y-0">
            {activities.map((activity, i) => (
              <div key={i} className="flex gap-4 relative">
                {/* Vertical line connector */}
                {i < activities.length - 1 && (
                  <div className="absolute left-[17px] top-10 bottom-0 w-px bg-cream-200" />
                )}

                {/* Dot + icon */}
                <div className="relative z-10 shrink-0 w-[35px] h-[35px] rounded-full bg-cream-100 border border-cream-200 flex items-center justify-center text-charcoal/60">
                  {activity.icon}
                </div>

                {/* Text */}
                <div className={`pb-6 ${i === activities.length - 1 ? "pb-0" : ""}`}>
                  <p className="text-sm font-medium text-charcoal">
                    {activity.text}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ============================================================ */}
      {/*  5. RECOMMENDED EXPERTS                                      */}
      {/* ============================================================ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
      >
        <h2 className="font-serif text-xl font-semibold text-charcoal mb-4">
          Recommended Experts
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-thin scrollbar-thumb-cream-200 scrollbar-track-transparent">
          {experts.map((expert) => (
            <motion.div
              key={expert.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="min-w-[220px] bg-white border border-cream-200 rounded-xl p-5 flex flex-col items-center text-center shrink-0"
            >
              {/* Avatar */}
              <img
                src={expert.avatar}
                alt={expert.name}
                className="w-16 h-16 rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-300 border-2 border-cream-200 mb-3"
              />

              {/* Name */}
              <h3 className="text-sm font-semibold text-charcoal truncate w-full">
                {expert.name}
              </h3>

              {/* Field */}
              <p className="text-xs text-text-muted mt-0.5 truncate w-full">
                {expert.expertise[0]}
              </p>

              {/* GR rating badge */}
              <span className="inline-flex items-center mt-2.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warm-brown/10 text-warm-brown">
                GR {expert.grRating}
              </span>

              {/* View button */}
              <Link
                href={`/expert/${expert.id}`}
                className="mt-4 w-full py-2 text-center text-xs font-semibold rounded-full border border-charcoal/15 text-charcoal hover:bg-charcoal hover:text-white transition-colors duration-200"
              >
                View Profile
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
