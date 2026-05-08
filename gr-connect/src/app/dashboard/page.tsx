"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth, UserProfile } from "@/lib/AuthContext";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs, doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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
  status: "pending" | "confirmed" | "upcoming" | "completed" | "cancelled";
  seekerId: string;
  expertId: string;
}

interface Expert {
  id: string;
  name: string;
  photo_url: string;
  topics: string[];
  gr_rating: number;
  tier: string;
}

interface GRData {
  gr_rating: number;
  tier: string;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p4_score: number;
  p5_score: number;
  rank_overall: number;
}

interface Connection {
  id: string;
  name: string;
  affiliation: string;
  photo: string;
  status: string;
  isIncoming: boolean;
  connId: string;
}

/* ------------------------------------------------------------------ */
/*  Profile Header                                                     */
/* ------------------------------------------------------------------ */
function ProfileHeader({ user, profile, roleBadge }: {
  user: { uid: string; displayName?: string | null; photoURL?: string | null };
  profile: UserProfile | null;
  roleBadge: string;
}) {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState<"banner" | "avatar" | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bannerUrl) setBannerUrl(data.bannerUrl);
        if (data.photoURL) setAvatarUrl(data.photoURL);
        else if (user.photoURL) setAvatarUrl(user.photoURL);
      } else if (user.photoURL) setAvatarUrl(user.photoURL);
    }).catch(() => { if (user.photoURL) setAvatarUrl(user.photoURL); });
  }, [user?.uid, user?.photoURL]);

  const handleUpload = useCallback(async (file: File, type: "banner" | "avatar") => {
    if (!user?.uid) return;
    setUploading(type);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "banner") setBannerUrl(e.target?.result as string);
      else setAvatarUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `user-uploads/${user.uid}/${type}.${ext}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      const field = type === "banner" ? "bannerUrl" : "photoURL";
      await updateDoc(doc(db, "users", user.uid), { [field]: url }).catch(async () => {
        await setDoc(doc(db, "users", user.uid), { [field]: url }, { merge: true });
      });
      if (type === "banner") setBannerUrl(url);
      else setAvatarUrl(url);
    } catch (err) { console.error("Upload failed", err); }
    finally { setUploading(null); }
  }, [user?.uid]);

  const displayName = profile?.displayName || user?.displayName || "User";
  const affiliation = profile?.affiliation || "";
  const bio = profile?.bio || "";
  const expertise: string[] = profile?.expertise || [];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-warm-brown/15 shadow-sm bg-white mb-8">
      {/* Banner */}
      <div
        className="relative h-36 sm:h-44 group cursor-pointer"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        onClick={() => bannerInputRef.current?.click()}
      >
        {/* Default banner — dark charcoal with subtle pattern */}
        {!bannerUrl && (
          <div className="absolute inset-0 bg-charcoal overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-warm-brown/20" />
            <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-warm-brown/10" />
            <div className="absolute top-4 left-1/3 w-24 h-24 rounded-full bg-white/5" />
            <div className="absolute bottom-2 right-1/4 w-16 h-16 rounded-full bg-warm-brown/15" />
            {/* Subtle grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {/* GR watermark */}
            <div className="absolute right-6 bottom-4 font-serif text-6xl font-bold text-white/5 select-none">GR</div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/60 text-white text-xs font-medium px-4 py-2 rounded-full">
            {uploading === "banner"
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading...</>
              : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>Change Banner</>}
          </div>
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "banner"); e.target.value = ""; }} />
      </div>

      {/* Avatar + info — sits below banner, no negative margin overlap */}
      <div className="px-6 pt-0 pb-6">
        {/* Avatar floats up over banner */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
          <div className="relative shrink-0 group cursor-pointer w-20 h-20" onClick={() => avatarInputRef.current?.click()}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-warm-brown flex items-center justify-center text-white text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "avatar"); e.target.value = ""; }} />
          </div>

          {/* Spacer so edit button aligns right */}
          <div className="flex-1" />

          <Link href="/onboarding" className="self-start sm:self-end shrink-0 mb-0.5 inline-flex items-center gap-1.5 px-4 py-1.5 border border-charcoal/20 text-charcoal text-sm font-medium rounded-full hover:bg-charcoal hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Profile
          </Link>
        </div>

        {/* Name + details below avatar row */}
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold text-charcoal">{displayName}</h1>
            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide ${roleBadge === "Expert" ? "bg-warm-brown/15 text-warm-brown-dark" : "bg-charcoal/8 text-charcoal"}`}>
              {roleBadge}
            </span>
          </div>
          {affiliation && <p className="text-sm text-text-muted mt-0.5">{affiliation}</p>}
          {bio && <p className="mt-1.5 text-sm text-charcoal/75 leading-relaxed max-w-2xl line-clamp-2">{bio}</p>}
          {expertise.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expertise.slice(0, 4).map((field: string) => (
                <span key={field} className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-cream-bg border border-warm-brown/15 text-charcoal/70">{field}</span>
              ))}
              {expertise.length > 4 && <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-cream-bg border border-warm-brown/15 text-charcoal/50">+{expertise.length - 4} more</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Completeness Bar                                           */
/* ------------------------------------------------------------------ */
function ProfileCompleteness({ profile }: { profile: UserProfile | null }) {
  const checks = [
    { label: "Name", done: !!profile?.displayName },
    { label: "Affiliation", done: !!profile?.affiliation },
    { label: "Bio", done: !!profile?.bio },
    { label: "Expertise", done: (profile?.expertise?.length ?? 0) > 0 },
    { label: "Photo", done: !!profile?.photoURL },
  ];
  const done = checks.filter(c => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  if (pct === 100) return null;

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-charcoal">Profile completeness</p>
        <span className="text-sm font-bold text-warm-brown">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-clay-muted/20 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-warm-brown rounded-full"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.filter(c => !c.done).map(c => (
          <Link key={c.label} href="/onboarding"
            className="flex items-center gap-1 text-xs text-text-muted border border-clay-muted/30 px-2.5 py-1 rounded-full hover:border-warm-brown/40 hover:text-warm-brown transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GR Rating Card (Expert only)                                       */
/* ------------------------------------------------------------------ */
const PILLAR_LABELS = ["Core Research", "Real-Time Impact", "Societal Impact", "Innovation", "Recognition"];
const PILLAR_COLORS = ["#8B5E3C", "#A0785A", "#B89275", "#C8AA94", "#D4B896"];

function GRRatingCard({ grData }: { grData: GRData }) {
  const pillars = [grData.p1_score, grData.p2_score, grData.p3_score, grData.p4_score, grData.p5_score];
  const tierColor = grData.tier === "GR-A" ? "text-amber-600 bg-amber-50 border-amber-200"
    : grData.tier === "GR-B" ? "text-warm-brown bg-warm-brown/10 border-warm-brown/20"
    : grData.tier === "GR-C" ? "text-blue-600 bg-blue-50 border-blue-200"
    : "text-text-muted bg-clay-muted/10 border-clay-muted/30";

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Your GR Rating</p>
          <div className="flex items-end gap-3">
            <span className="font-serif text-5xl font-bold text-charcoal">{grData.gr_rating.toFixed(1)}</span>
            <span className={`mb-1.5 px-3 py-1 rounded-full text-sm font-bold border ${tierColor}`}>{grData.tier}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">Global rank #{grData.rank_overall}</p>
        </div>
        {/* Circular progress */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#f0e8e0" strokeWidth="8" />
            <motion.circle
              cx="40" cy="40" r="32" fill="none"
              stroke="#8B5E3C" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - grData.gr_rating / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-charcoal">{Math.round(grData.gr_rating)}%</span>
          </div>
        </div>
      </div>

      {/* Pillar bars */}
      <div className="space-y-3">
        {pillars.map((score, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-charcoal/70 font-medium">{PILLAR_LABELS[i]}</span>
              <span className="text-xs font-bold text-charcoal">{score.toFixed(1)}</span>
            </div>
            <div className="w-full h-1.5 bg-clay-muted/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.9, delay: i * 0.1, ease: "easeOut" }}
                style={{ backgroundColor: PILLAR_COLORS[i] }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Cards                                                         */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 1200) {
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

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <motion.div
      ref={ref}
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      className="bg-white border border-cream-200 rounded-xl p-5 flex flex-col gap-2"
    >
      <div className="w-10 h-10 rounded-xl bg-warm-brown/10 flex items-center justify-center text-warm-brown">
        {icon}
      </div>
      <span className="text-3xl font-bold text-charcoal font-serif tabular-nums">{count}</span>
      <div>
        <span className="text-sm font-medium text-charcoal">{label}</span>
        {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Network Section                                                    */
/* ------------------------------------------------------------------ */
function NetworkSection({ uid }: { uid: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, "connections"), where("requesterId", "==", uid))),
        getDocs(query(collection(db, "connections"), where("targetId", "==", uid))),
      ]);
      const all: Connection[] = [];
      for (const d of sentSnap.docs) {
        const data = d.data();
        const u = (await getDoc(doc(db, "users", data.targetId))).data() || {};
        all.push({ id: data.targetId, name: u.displayName || "Unknown", affiliation: u.affiliation || "", photo: u.photoURL || "", status: data.status, isIncoming: false, connId: d.id });
      }
      for (const d of receivedSnap.docs) {
        const data = d.data();
        const u = (await getDoc(doc(db, "users", data.requesterId))).data() || {};
        all.push({ id: data.requesterId, name: u.displayName || "Unknown", affiliation: u.affiliation || "", photo: u.photoURL || "", status: data.status, isIncoming: true, connId: d.id });
      }
      setConnections(all);
      setLoading(false);
    };
    load();
  }, [uid]);

  async function acceptConnection(connId: string) {
    await updateDoc(doc(db, "connections", connId), { status: "accepted" });
    setConnections(prev => prev.map(c => c.connId === connId ? { ...c, status: "accepted" } : c));
  }

  const pending = connections.filter(c => c.isIncoming && c.status === "pending");
  const accepted = connections.filter(c => c.status === "accepted");

  if (loading) return (
    <div className="bg-white border border-cream-200 rounded-xl p-6">
      <div className="h-4 w-32 bg-clay-muted/20 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-clay-muted/10 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-charcoal">My Network</h2>
          <p className="text-xs text-text-muted mt-0.5">{accepted.length} connection{accepted.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/hub" className="text-xs font-medium text-warm-brown hover:underline">Find more →</Link>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{pending.length}</span>
            Pending requests
          </p>
          <div className="flex flex-col gap-2">
            {pending.map(c => (
              <div key={c.connId} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                {c.photo ? (
                  <img src={c.photo} alt={c.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown text-sm font-semibold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{c.name}</p>
                  <p className="text-xs text-text-muted truncate">{c.affiliation || "Researcher"}</p>
                </div>
                <button
                  onClick={() => acceptConnection(c.connId)}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted connections */}
      {accepted.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">No connections yet</p>
          <Link href="/hub" className="mt-2 inline-block text-xs font-medium text-warm-brown hover:underline">Browse Research Hub →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {accepted.map(c => (
            <Link key={c.id} href={`/expert/${c.id}`}
              className="flex items-center gap-2.5 p-3 bg-cream-bg rounded-xl border border-clay-muted/20 hover:border-warm-brown/30 hover:shadow-sm transition-all">
              {c.photo ? (
                <img src={c.photo} alt={c.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown text-sm font-semibold shrink-0">
                  {c.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-charcoal truncate">{c.name}</p>
                <p className="text-[10px] text-text-muted truncate">{c.affiliation || "Researcher"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Availability Settings (Expert only)                               */
/* ------------------------------------------------------------------ */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMES = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];
interface AvailabilitySlot { dow: number; time: string; }

function AvailabilitySettings({ uid }: { uid: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "availability", uid))
      .then((snap) => { if (snap.exists()) setSlots(snap.data().slots || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [uid]);

  function toggle(dow: number, time: string) {
    setSlots((prev) => {
      const exists = prev.some((s) => s.dow === dow && s.time === time);
      return exists ? prev.filter((s) => !(s.dow === dow && s.time === time)) : [...prev, { dow, time }];
    });
    setSaved(false); setSaveError("");
  }

  async function save() {
    setSaving(true); setSaveError("");
    try {
      await setDoc(doc(db, "availability", uid), { slots, updatedAt: new Date().toISOString() });
      setSaved(true);
    } catch (err) {
      console.error(err); setSaveError("Failed to save. Please try again.");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="h-8 flex items-center"><div className="w-4 h-4 border-2 border-warm-brown/30 border-t-warm-brown rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left py-1.5 text-text-muted font-medium pr-3 w-16">Time</th>
              {DAYS.map((d, i) => <th key={i} className="text-center py-1.5 text-text-muted font-medium px-1">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {TIMES.map((time) => (
              <tr key={time}>
                <td className="text-text-muted pr-3 py-1 whitespace-nowrap">{time}</td>
                {DAYS.map((_, dow) => {
                  const active = slots.some((s) => s.dow === dow && s.time === time);
                  return (
                    <td key={dow} className="text-center py-1 px-1">
                      <button onClick={() => toggle(dow, time)}
                        className={`w-7 h-7 rounded-md transition-colors ${active ? "bg-warm-brown text-white" : "bg-clay-muted/20 text-text-muted hover:bg-warm-brown/20"}`}>
                        {active ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} disabled={saving}
          className="px-5 py-2 bg-warm-brown text-white text-sm font-medium rounded-full hover:bg-warm-brown-dark transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save Availability"}
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
        {saveError && <span className="text-xs text-red-600 font-medium">{saveError}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const { user, profile, isLoggedIn } = useAuth();

  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState({ sessions: 0, connections: 0, completed: 0 });
  const [recommendedExperts, setRecommendedExperts] = useState<Expert[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [grData, setGrData] = useState<GRData | null>(null);

  const isExpert = profile?.role === "expert";

  // Bookings
  useEffect(() => {
    if (!user) return;
    const field = isExpert ? "expertId" : "seekerId";
    const q = query(collection(db, "bookings"), where(field, "==", user.uid), where("status", "in", ["pending", "confirmed", "upcoming"]), orderBy("createdAt", "desc"), limit(3));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      setUpcomingBookings(all.filter((b) => b.status !== "pending").slice(0, 3));
      setPendingCount(all.filter((b) => b.status === "pending").length);
      setLoadingBookings(false);
    }, () => setLoadingBookings(false));
    return unsub;
  }, [user, isExpert]);

  // Stats
  useEffect(() => {
    if (!user) return;
    async function loadStats() {
      const field = profile?.role === "expert" ? "expertId" : "seekerId";
      const [bookingsSnap, connSentSnap, connRecSnap] = await Promise.all([
        getDocs(query(collection(db, "bookings"), where(field, "==", user!.uid))),
        getDocs(query(collection(db, "connections"), where("requesterId", "==", user!.uid), where("status", "==", "accepted"))),
        getDocs(query(collection(db, "connections"), where("targetId", "==", user!.uid), where("status", "==", "accepted"))),
      ]);
      const completed = bookingsSnap.docs.filter(d => d.data().status === "completed").length;
      setStats({ sessions: bookingsSnap.size, connections: connSentSnap.size + connRecSnap.size, completed });
    }
    loadStats().catch(console.error);
  }, [user, profile?.role]);

  // GR rating for expert — look up by firebase_uid param
  useEffect(() => {
    if (!user || !isExpert) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=100&firebase_uid=${user.uid}`)
      .then(r => r.json())
      .then(data => {
        const match = (data.researchers || []).find((r: { firebase_uid: string }) => r.firebase_uid === user.uid);
        if (match) {
          fetch(`${apiUrl}/api/v1/discover/${match.id}`)
            .then(r => r.json())
            .then(d => setGrData({
              gr_rating: d.gr_rating, tier: d.tier,
              p1_score: d.p1_score, p2_score: d.p2_score,
              p3_score: d.p3_score, p4_score: d.p4_score,
              p5_score: d.p5_score, rank_overall: d.rank,
            }))
            .catch(() => {});
        }
      }).catch(() => {});
  }, [user, isExpert]);

  // Recommended experts
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=6`)
      .then((r) => r.json())
      .then((data) => setRecommendedExperts((data.researchers ?? []).filter((e: { firebase_uid: string }) => e.firebase_uid !== user?.uid)))
      .catch(() => {});
  }, [user]);

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
          <Link href="/login" className="inline-block px-8 py-3 bg-charcoal text-white text-sm font-semibold rounded-full hover:bg-charcoal-light transition-colors">Log in</Link>
        </motion.div>
      </div>
    );
  }

  const roleBadge = isExpert ? "Expert" : "Seeker";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <ProfileHeader user={user} profile={profile} roleBadge={roleBadge} />
      </motion.div>

      {/* Profile Completeness */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <ProfileCompleteness profile={profile} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* GR Rating Card — expert only */}
          {isExpert && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              {grData ? (
                <GRRatingCard grData={grData} />
              ) : (
                <div className="bg-white border border-cream-200 rounded-xl p-6 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">GR Rating not assigned yet</p>
                    <p className="text-xs text-text-muted mt-0.5">Complete your profile and claim your researcher record to get your GR score.</p>
                  </div>
                  <Link href="/onboarding" className="ml-auto shrink-0 px-4 py-2 bg-warm-brown text-white text-xs font-semibold rounded-full hover:bg-warm-brown-dark transition-colors">
                    Claim Profile
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* Stats */}
          <motion.section
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-3 gap-4"
          >
            <StatCard value={stats.sessions} label="Sessions" sub="Total booked" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            } />
            <StatCard value={stats.completed} label="Completed" sub="Sessions done" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            } />
            <StatCard value={stats.connections} label="Connections" sub="In your network" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            } />
          </motion.section>

          {/* Availability (expert only) */}
          {isExpert && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <div className="bg-white border border-cream-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-charcoal">My Availability</h2>
                    <p className="text-xs text-text-muted mt-0.5">Set the days and times you&apos;re open for consultations</p>
                  </div>
                  {pendingCount > 0 && (
                    <Link href="/my-bookings" className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-medium rounded-full hover:bg-amber-200 transition-colors">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingCount}</span>
                      Pending
                    </Link>
                  )}
                </div>
                <AvailabilitySettings uid={user.uid} />
              </div>
            </motion.div>
          )}

          {/* Upcoming Sessions */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="bg-white border border-cream-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-charcoal">
                  {isExpert ? "Confirmed Sessions" : "Upcoming Sessions"}
                </h2>
                <Link href="/my-bookings" className="text-sm font-medium text-warm-brown hover:underline">View all →</Link>
              </div>

              {loadingBookings && (
                <div className="animate-pulse space-y-3">
                  {[1,2].map(i => <div key={i} className="h-16 bg-clay-muted/10 rounded-xl" />)}
                </div>
              )}

              {!loadingBookings && upcomingBookings.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-text-muted text-sm">No confirmed sessions yet.</p>
                  {!isExpert && (
                    <Link href="/discover" className="mt-2 inline-block text-sm font-medium text-warm-brown hover:underline">
                      Find an expert to book →
                    </Link>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const otherName = isExpert ? booking.seekerName : booking.expertName;
                  const otherPhoto = isExpert ? booking.seekerPhoto : booking.expertPhoto;
                  return (
                    <div key={booking.id} className="flex items-center justify-between gap-4 p-4 bg-cream-bg rounded-xl border border-clay-muted/20">
                      <div className="flex items-center gap-3">
                        {otherPhoto ? (
                          <img src={otherPhoto} alt={otherName} className="w-10 h-10 rounded-full object-cover border border-warm-brown/15 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown font-semibold text-sm shrink-0">
                            {otherName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{otherName}</p>
                          <p className="text-xs text-text-muted">{booking.date} · {booking.time}</p>
                        </div>
                      </div>
                      {booking.meetLink && (
                        <a href={booking.meetLink} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 px-4 py-1.5 bg-warm-brown text-white text-xs font-semibold rounded-full hover:bg-warm-brown-dark transition-colors">
                          Join
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="bg-white border border-cream-200 rounded-xl p-5">
              <h2 className="font-serif text-lg font-semibold text-charcoal mb-3">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                {!isExpert && (
                  <Link href="/discover" className="flex items-center gap-3 px-4 py-3 bg-warm-brown text-white rounded-xl hover:bg-warm-brown-dark transition-colors">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <span className="text-sm font-semibold">Find an Expert</span>
                  </Link>
                )}
                <Link href="/my-bookings" className="flex items-center gap-3 px-4 py-3 bg-cream-bg border border-clay-muted/30 rounded-xl hover:border-warm-brown/30 hover:bg-warm-brown/5 transition-colors">
                  <svg className="w-4 h-4 shrink-0 text-warm-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  <span className="text-sm font-medium text-charcoal">My Bookings</span>
                  {pendingCount > 0 && <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingCount}</span>}
                </Link>
                <Link href="/messages" className="flex items-center gap-3 px-4 py-3 bg-cream-bg border border-clay-muted/30 rounded-xl hover:border-warm-brown/30 hover:bg-warm-brown/5 transition-colors">
                  <svg className="w-4 h-4 shrink-0 text-warm-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  <span className="text-sm font-medium text-charcoal">Messages</span>
                </Link>
                <Link href="/onboarding" className="flex items-center gap-3 px-4 py-3 bg-cream-bg border border-clay-muted/30 rounded-xl hover:border-warm-brown/30 hover:bg-warm-brown/5 transition-colors">
                  <svg className="w-4 h-4 shrink-0 text-warm-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  <span className="text-sm font-medium text-charcoal">Edit Profile</span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Network */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <NetworkSection uid={user.uid} />
          </motion.div>

          {/* Recommended Experts */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="bg-white border border-cream-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-charcoal">Top Experts</h2>
                <Link href="/discover" className="text-xs font-medium text-warm-brown hover:underline">Browse →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {recommendedExperts.slice(0, 5).map((expert) => (
                  <Link key={expert.id} href={`/expert/${expert.id}`}
                    className="flex items-center gap-3 hover:bg-cream-bg rounded-xl p-2 -mx-2 transition-colors">
                    <img
                      src={expert.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=8B5E3C&color=fff&size=200`}
                      alt={expert.name}
                      className="w-10 h-10 rounded-full object-cover border border-warm-brown/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">{expert.name}</p>
                      <p className="text-xs text-text-muted truncate">{expert.topics[0] || ""}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-warm-brown bg-warm-brown/10 px-2 py-0.5 rounded-full">
                      {expert.tier}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
