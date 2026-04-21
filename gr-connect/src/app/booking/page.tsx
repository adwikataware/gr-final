"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { experts } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/* Animation variants                                                  */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const bounceIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
      duration: 0.6,
    },
  },
};

/* ------------------------------------------------------------------ */
/* SVG Icons                                                           */
/* ------------------------------------------------------------------ */
const CheckIcon = () => (
  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DurationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Booking details                                                     */
/* ------------------------------------------------------------------ */
const expert = experts[0];

const details = [
  { icon: <CalendarIcon />, label: "Date", value: "March 15, 2026" },
  { icon: <ClockIcon />, label: "Time", value: "2:00 PM IST" },
  { icon: <DurationIcon />, label: "Duration", value: "30 minutes" },
  { icon: <LinkIcon />, label: "Access", value: "Join via GR Connect" },
];

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */
export default function BookingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-cream-bg flex items-center justify-center py-12 px-4">
      <motion.div
        className="max-w-2xl w-full mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ------ Success Icon ------ */}
        <motion.div variants={bounceIn} className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-warm-brown flex items-center justify-center shadow-lg shadow-warm-brown/20">
            <CheckIcon />
          </div>
        </motion.div>

        {/* ------ Heading ------ */}
        <motion.h1
          variants={itemVariants}
          className="font-serif text-3xl md:text-4xl font-semibold text-charcoal text-center mb-8"
        >
          Session Confirmed!
        </motion.h1>

        {/* ------ Confirmation Card ------ */}
        <motion.div
          variants={itemVariants}
          className="bg-white border border-clay-muted/40 rounded-xl overflow-hidden shadow-sm"
        >
          {/* Expert section */}
          <div className="flex items-center gap-4 p-6 border-b border-clay-muted/30">
            <img
              src={expert.avatar}
              alt={expert.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-warm-brown/20"
            />
            <div>
              <h2 className="text-lg font-semibold text-charcoal">{expert.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <VideoIcon />
                <span className="text-sm text-text-muted">Video Consultation</span>
              </div>
            </div>
          </div>

          {/* Details grid */}
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
        </motion.div>

        {/* ------ Action Buttons ------ */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
        >
          <button className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-warm-brown rounded-xl hover:bg-warm-brown-dark transition-colors flex items-center justify-center gap-2">
            <CalendarIcon />
            Add to Calendar
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-charcoal border border-clay-muted/50 rounded-xl hover:bg-cream-100 transition-colors flex items-center justify-center gap-2"
          >
            <DashboardIcon />
            View Dashboard
          </Link>
          <Link
            href="/messages"
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-charcoal border border-clay-muted/50 rounded-xl hover:bg-cream-100 transition-colors flex items-center justify-center gap-2"
          >
            <MessageIcon />
            Message Expert
          </Link>
        </motion.div>

        {/* ------ Footer ------ */}
        <motion.p variants={itemVariants} className="text-center text-sm text-text-muted mt-8">
          Need to reschedule?{" "}
          <Link href="/messages" className="text-warm-brown font-medium hover:underline">
            Contact us here
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
