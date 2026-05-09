"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, addDoc, onSnapshot, query, orderBy, limit,
  doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp,
  getDoc, setDoc, getDocs, where, deleteDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar: string;
  authorAffiliation: string;
  content: string;
  tags: string[];
  likes: string[];
  commentCount: number;
  createdAt: { toDate?: () => Date } | null;
  postType: string;
  imageUrls?: string[];
  fileTypes?: string[]; // parallel to imageUrls: "image" | "pdf" | "file"
}

interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: { toDate?: () => Date } | null;
}

interface Scholar {
  id: string;
  firebase_uid?: string;
  name: string;
  affiliation: string;
  photo_url: string;
  gr_rating: number;
  tier_label: string;
  bio?: string;
  topics?: string[];
  openalex_id?: string;
}

interface ResearchEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  url?: string;
}

type Tab = "feed" | "network" | "saved";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function timeAgo(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function extractTags(content: string): string[] {
  const matches = content.match(/#\w+/g) || [];
  return [...new Set(matches)].slice(0, 5);
}

function avatarFallback(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5E3C&color=fff&size=80`;
}

/* ------------------------------------------------------------------ */
/* SVG Icons                                                           */
/* ------------------------------------------------------------------ */
const FeedIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
  </svg>
);
const NetworkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const SavedIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? "fill-red-500 text-red-500" : ""}`} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const CommentIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? "fill-warm-brown text-warm-brown" : ""}`} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const ImageIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const TrendingIcon = () => (
  <svg className="w-4 h-4 text-warm-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const XCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const UsersIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const HandIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const BellIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Profile Peek Panel                                                  */
/* ------------------------------------------------------------------ */
interface ProfilePeekProps {
  scholar: Scholar | null;
  currentUid: string | null;
  onClose: () => void;
}

function ProfilePeekPanel({ scholar, currentUid, onClose }: ProfilePeekProps) {
  const [connStatus, setConnStatus] = useState<"none" | "pending" | "accepted">("none");
  const router = useRouter();

  useEffect(() => {
    if (!currentUid || !scholar) return;
    setConnStatus("none");
    const checkBoth = async () => {
      const a = await getDoc(doc(db, "connections", `${currentUid}_${scholar.firebase_uid || scholar.id}`));
      if (a.exists()) { setConnStatus(a.data().status); return; }
      const b = await getDoc(doc(db, "connections", `${scholar.firebase_uid || scholar.id}_${currentUid}`));
      if (b.exists()) { setConnStatus(b.data().status); }
    };
    checkBoth();
  }, [scholar, currentUid]);

  async function handleConnect() {
    if (!currentUid || !scholar || connStatus !== "none") return;
    const targetUid = scholar.firebase_uid || scholar.id;
    const connRef = doc(db, "connections", `${currentUid}_${targetUid}`);
    await setDoc(connRef, {
      requesterId: currentUid,
      targetId: targetUid,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setConnStatus("pending");
  }

  return (
    <AnimatePresence>
      {scholar && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-clay-muted/30 shrink-0">
              <h2 className="font-semibold text-sm text-charcoal">Researcher Profile</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream-bg text-charcoal/60">
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 flex flex-col gap-5">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center gap-2">
                <img
                  src={scholar.photo_url || avatarFallback(scholar.name)}
                  alt={scholar.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-clay-muted/20"
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(scholar.name); }}
                />
                <div>
                  <h3 className="text-base font-semibold text-charcoal">{scholar.name}</h3>
                  <p className="text-xs text-text-muted">{scholar.affiliation || "Researcher"}</p>
                </div>
                {scholar.tier_label && (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-warm-brown/10 text-warm-brown">
                    {scholar.tier_label}
                  </span>
                )}
              </div>

              {/* Bio */}
              {scholar.bio && (
                <p className="text-xs text-charcoal/80 leading-relaxed text-center">{scholar.bio}</p>
              )}

              {/* Topics */}
              {scholar.topics && scholar.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {scholar.topics.slice(0, 6).map(t => (
                    <span key={t} className="px-2.5 py-1 text-[11px] bg-cream-bg border border-clay-muted/30 text-charcoal rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* GR Rating */}
              {scholar.gr_rating > 0 && (
                <div className="flex items-center justify-center gap-2 bg-cream-bg rounded-xl p-3 border border-clay-muted/20">
                  <span className="text-xs text-text-muted">GR Rating</span>
                  <span className="text-sm font-bold text-warm-brown">{scholar.gr_rating.toFixed(1)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {currentUid !== (scholar.firebase_uid || scholar.id) && (
                  <button
                    onClick={handleConnect}
                    disabled={connStatus !== "none"}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      connStatus === "accepted"
                        ? "bg-green-50 border border-green-400 text-green-700"
                        : connStatus === "pending"
                        ? "bg-amber-50 border border-amber-400 text-amber-700"
                        : "bg-warm-brown text-white hover:bg-warm-brown-dark"
                    }`}
                  >
                    {connStatus === "accepted" ? "✓ Connected" : connStatus === "pending" ? "Request Sent" : "Connect"}
                  </button>
                )}
                <Link
                  href={`/expert/${scholar.id}`}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-clay-muted/40 text-charcoal hover:bg-cream-bg transition-colors text-center flex items-center justify-center gap-2"
                >
                  View Full Profile <ArrowRightIcon />
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Send to Connection Modal                                            */
/* ------------------------------------------------------------------ */
interface SendPostModalProps {
  post: Post;
  currentUid: string;
  currentProfile: { displayName?: string; photoURL?: string } | null;
  onClose: () => void;
}

function SendPostModal({ post, currentUid, currentProfile, onClose }: SendPostModalProps) {
  const [connections, setConnections] = useState<Array<{ uid: string; name: string; photo: string }>>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const [sentSnap, recvSnap] = await Promise.all([
        getDocs(query(collection(db, "connections"), where("requesterId", "==", currentUid), where("status", "==", "accepted"))),
        getDocs(query(collection(db, "connections"), where("targetId", "==", currentUid), where("status", "==", "accepted"))),
      ]);
      const uids = new Set<string>();
      const list: Array<{ uid: string; name: string; photo: string }> = [];
      for (const d of [...sentSnap.docs, ...recvSnap.docs]) {
        const data = d.data();
        const otherUid = data.requesterId === currentUid ? data.targetId : data.requesterId;
        if (uids.has(otherUid)) continue;
        uids.add(otherUid);
        const uSnap = await getDoc(doc(db, "users", otherUid));
        const u = uSnap.exists() ? uSnap.data() : {};
        list.push({ uid: otherUid, name: u.displayName || "Unknown", photo: u.photoURL || avatarFallback(u.displayName || "U") });
      }
      setConnections(list);
    };
    load();
  }, [currentUid]);

  async function sendToUser(targetUid: string) {
    setSending(targetUid);
    try {
      const myName = currentProfile?.displayName || "User";
      const myPhoto = currentProfile?.photoURL || "";
      const target = connections.find(c => c.uid === targetUid);

      // Find existing conversation — same pattern as expert page (query, not hardcoded ID)
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUid)
      );
      const snap = await getDocs(q);
      const existing = snap.docs.find(d =>
        (d.data().participants as string[]).includes(targetUid)
      );

      let convId: string;
      if (existing) {
        convId = existing.id;
        await updateDoc(doc(db, "conversations", convId), {
          lastMessage: "📎 Shared a post",
          lastMessageAt: serverTimestamp(),
        });
      } else {
        const convRef = await addDoc(collection(db, "conversations"), {
          participants: [currentUid, targetUid],
          participantNames: { [currentUid]: myName, [targetUid]: target?.name || "User" },
          participantPhotos: { [currentUid]: myPhoto, [targetUid]: target?.photo || "" },
          lastMessage: "📎 Shared a post",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        convId = convRef.id;
      }

      await addDoc(collection(db, "conversations", convId, "messages"), {
        senderId: currentUid,
        type: "shared_post",
        text: "📎 Shared a post",
        postContent: post.content,
        postAuthor: post.authorName,
        postType: post.postType,
        createdAt: serverTimestamp(),
      });

      setSent(prev => [...prev, targetUid]);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 mb-4 sm:mb-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-clay-muted/20">
          <h3 className="text-sm font-semibold text-charcoal">Send to connection</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cream-100 text-text-muted">
            <CloseIcon />
          </button>
        </div>

        {/* Post preview */}
        <div className="px-5 py-3 bg-cream-50 border-b border-clay-muted/20">
          <p className="text-xs text-charcoal/70 line-clamp-2">{post.content}</p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {connections.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No connections yet.</p>
          ) : (
            connections.map(c => (
              <div key={c.uid} className="flex items-center gap-3 px-5 py-3 hover:bg-cream-50 transition-colors">
                <img src={c.photo} alt={c.name} className="w-9 h-9 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.name); }} />
                <span className="flex-1 text-sm font-medium text-charcoal truncate">{c.name}</span>
                <button
                  onClick={() => sendToUser(c.uid)}
                  disabled={!!sending || sent.includes(c.uid)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    sent.includes(c.uid)
                      ? "bg-green-50 text-green-700 border border-green-300"
                      : "bg-warm-brown text-white hover:bg-warm-brown-dark disabled:opacity-50"
                  }`}
                >
                  {sent.includes(c.uid) ? "Sent ✓" : sending === c.uid ? "..." : "Send"}
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Responders Modal (who clicked Interested / I'll Review / etc.)     */
/* ------------------------------------------------------------------ */
interface RespondersModalProps {
  postId: string;
  label: string;
  onClose: () => void;
}

function RespondersModal({ postId, label, onClose }: RespondersModalProps) {
  const [responders, setResponders] = useState<Array<{ uid: string; name: string; photo: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "posts", postId, "responses"));
      const list = await Promise.all(snap.docs.map(async d => {
        const uSnap = await getDoc(doc(db, "users", d.id));
        const u = uSnap.exists() ? uSnap.data() : {};
        return { uid: d.id, name: u.displayName || "Unknown", photo: u.photoURL || avatarFallback(u.displayName || "U") };
      }));
      setResponders(list);
      setLoading(false);
    };
    load();
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-clay-muted/20">
          <h3 className="text-sm font-semibold text-charcoal">{label}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cream-100 text-text-muted"><CloseIcon /></button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-text-muted text-center py-8">Loading...</p>
          ) : responders.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No responses yet.</p>
          ) : (
            responders.map(r => (
              <div key={r.uid} className="flex items-center gap-3 px-5 py-3 hover:bg-cream-50">
                <img src={r.photo} alt={r.name} className="w-9 h-9 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(r.name); }} />
                <span className="text-sm font-medium text-charcoal">{r.name}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PostCard                                                            */
/* ------------------------------------------------------------------ */
const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  "Collab Call":      { label: "Interested",  icon: <HandIcon />,        color: "text-purple-700 border-purple-300 bg-purple-50 hover:bg-purple-100" },
  "Review Request":   { label: "I'll Review", icon: <CheckCircleIcon />, color: "text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100" },
  "Announcement":     { label: "Attending",   icon: <BellIcon />,        color: "text-green-700 border-green-300 bg-green-50 hover:bg-green-100" },
  "Snippet":          { label: "Cite",        icon: <CopyIcon />,        color: "text-orange-700 border-orange-300 bg-orange-50 hover:bg-orange-100" },
};

function PostCard({
  post,
  currentUid,
  isBookmarked,
  onBookmarkToggle,
  onAuthorClick,
}: {
  post: Post;
  currentUid: string | null;
  isBookmarked: boolean;
  onBookmarkToggle: (postId: string, bookmarked: boolean) => void;
  onAuthorClick: (uid: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showResponders, setShowResponders] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [hasResponded, setHasResponded] = useState(false);
  const [citeCopied, setCiteCopied] = useState(false);
  const { profile } = useAuth();

  const liked = currentUid ? post.likes.includes(currentUid) : false;
  const typeConfig = TYPE_CONFIG[post.postType];

  // Load response count
  useEffect(() => {
    if (!typeConfig) return;
    getDocs(collection(db, "posts", post.id, "responses")).then(snap => {
      setResponseCount(snap.size);
      if (currentUid) setHasResponded(snap.docs.some(d => d.id === currentUid));
    });
  }, [post.id, typeConfig, currentUid]);

  async function toggleLike() {
    if (!currentUid) return;
    const ref = doc(db, "posts", post.id);
    if (liked) await updateDoc(ref, { likes: arrayRemove(currentUid) });
    else await updateDoc(ref, { likes: arrayUnion(currentUid) });
  }

  async function loadComments() {
    if (loadingComments) return;
    setLoadingComments(true);
    const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"), limit(50));
    const snap = await getDocs(q);
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    setLoadingComments(false);
  }

  async function toggleComments() {
    if (!showComments) await loadComments();
    setShowComments(!showComments);
  }

  async function submitComment() {
    if (!commentText.trim() || !currentUid || !profile) return;
    const colRef = collection(db, "posts", post.id, "comments");
    await addDoc(colRef, {
      authorUid: currentUid,
      authorName: profile.displayName || "User",
      authorAvatar: profile.photoURL || avatarFallback(profile.displayName || "U"),
      content: commentText.trim(),
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", post.id), { commentCount: (post.commentCount || 0) + 1 });
    setCommentText("");
    await loadComments();
  }

  async function handleResponse() {
    if (!currentUid || !typeConfig) return;
    const ref = doc(db, "posts", post.id, "responses", currentUid);
    if (hasResponded) {
      await deleteDoc(ref);
      setHasResponded(false);
      setResponseCount(c => c - 1);
    } else {
      if (post.postType === "Snippet") {
        // Cite = copy a citation string
        const text = `${post.authorName}. "${post.content.slice(0, 80)}..." — GR Research Hub, ${new Date().getFullYear()}.`;
        navigator.clipboard.writeText(text).then(() => {
          setCiteCopied(true);
          setTimeout(() => setCiteCopied(false), 2000);
        });
        return;
      }
      await setDoc(ref, { respondedAt: serverTimestamp() });
      setHasResponded(true);
      setResponseCount(c => c + 1);
    }
  }

  const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : null;
  const isOwnPost = currentUid === post.authorUid;

  return (
    <>
      <article className="bg-white border border-clay-muted/30 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-5">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => onAuthorClick(post.authorUid)} className="shrink-0">
              <img
                src={post.authorAvatar || avatarFallback(post.authorName)}
                alt={post.authorName}
                className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(post.authorName); }}
              />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAuthorClick(post.authorUid)}
                  className="text-sm font-semibold text-charcoal hover:text-warm-brown transition-colors truncate"
                >
                  {post.authorName}
                </button>
                {post.postType && post.postType !== "General" && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold italic font-serif rounded-full bg-warm-brown/10 text-warm-brown shrink-0">
                    {post.postType}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {post.authorAffiliation || "Researcher"}
                {postDate && <> &middot; {timeAgo(postDate)}</>}
              </p>
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-charcoal/85 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

          {/* Images — shown inline */}
          {post.imageUrls && post.imageUrls.length > 0 && (() => {
            const imageItems = post.imageUrls
              .map((url, i) => ({ url, type: post.fileTypes?.[i] ?? "image" }))
              .filter(f => f.type === "image");
            const fileItems = post.imageUrls
              .map((url, i) => ({ url, type: post.fileTypes?.[i] ?? "image", name: `Document ${i + 1}` }))
              .filter(f => f.type !== "image");

            return (
              <>
                {imageItems.length > 0 && (
                  <div className={`mb-3 grid gap-2 ${imageItems.length === 1 ? "grid-cols-1" : imageItems.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                    {imageItems.map((item, i) => (
                      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-clay-muted/20 bg-cream-100">
                        <img
                          src={item.url}
                          alt={`image ${i + 1}`}
                          className={`w-full object-cover hover:opacity-95 transition-opacity ${imageItems.length === 1 ? "max-h-[480px]" : "h-52"}`}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </a>
                    ))}
                  </div>
                )}
                {fileItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {fileItems.map((item, i) => (
                      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-cream-50 border border-clay-muted/30 rounded-xl hover:bg-cream-100 hover:border-warm-brown/30 transition-colors group">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                          <path d="M14 2v6h6"/>
                          <path fill="white" d="M9 13h6M9 17h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="text-xs font-medium text-charcoal group-hover:text-warm-brown transition-colors">PDF</span>
                        <svg className="w-3 h-3 text-text-muted group-hover:text-warm-brown transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map(tag => (
                <span key={tag} className="px-2.5 py-0.5 text-[11px] font-medium bg-cream-100 text-warm-brown rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-4 pt-3 border-t border-clay-muted/20 flex-wrap">
            <button onClick={toggleLike}
              className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-red-500" : "text-text-muted hover:text-red-500"}`}>
              <HeartIcon filled={liked} /><span>{post.likes.length}</span>
            </button>
            <button onClick={toggleComments}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-charcoal transition-colors">
              <CommentIcon /><span>{post.commentCount || 0}</span>
            </button>

            {/* Type-specific CTA */}
            {typeConfig && (
              <button
                onClick={isOwnPost ? () => setShowResponders(true) : handleResponse}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  isOwnPost
                    ? "text-charcoal/60 border-clay-muted/40 bg-cream-50 hover:bg-cream-100"
                    : hasResponded && post.postType !== "Snippet"
                    ? "text-charcoal/50 border-clay-muted/30 bg-cream-50"
                    : typeConfig.color
                }`}
              >
                {typeConfig.icon}
                <span>
                  {isOwnPost
                    ? `${responseCount} ${typeConfig.label}`
                    : post.postType === "Snippet"
                    ? (citeCopied ? "Copied!" : typeConfig.label)
                    : hasResponded
                    ? "✓ " + typeConfig.label
                    : typeConfig.label}
                </span>
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-charcoal transition-colors"
            >
              <SendIcon />
            </button>

            {/* Bookmark */}
            <button
              onClick={() => onBookmarkToggle(post.id, isBookmarked)}
              className={`ml-auto transition-colors ${isBookmarked ? "text-warm-brown" : "text-text-muted hover:text-warm-brown"}`}
            >
              <BookmarkIcon filled={isBookmarked} />
            </button>
          </div>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-clay-muted/20 overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-3 bg-cream-50">
                {loadingComments ? (
                  <p className="text-xs text-text-muted">Loading...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-text-muted">No comments yet. Be the first!</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <button onClick={() => onAuthorClick(c.authorUid)} className="shrink-0 mt-0.5">
                        <img src={c.authorAvatar || avatarFallback(c.authorName)} alt={c.authorName}
                          className="w-7 h-7 rounded-full object-cover hover:opacity-80 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.authorName); }} />
                      </button>
                      <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-clay-muted/20">
                        <button onClick={() => onAuthorClick(c.authorUid)}
                          className="text-[11px] font-semibold text-charcoal hover:text-warm-brown transition-colors">
                          {c.authorName}
                        </button>
                        <p className="text-xs text-charcoal/80 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {currentUid && profile && (
                  <div className="flex gap-2 mt-1">
                    <img src={profile.photoURL || avatarFallback(profile.displayName || "U")} alt="You"
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(profile.displayName || "U"); }} />
                    <div className="flex-1 flex gap-2">
                      <input value={commentText} onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()}
                        placeholder="Write a comment..."
                        className="flex-1 text-xs bg-white rounded-xl border border-clay-muted/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50"
                      />
                      <button onClick={submitComment} disabled={!commentText.trim()}
                        className="p-2 bg-warm-brown text-white rounded-lg disabled:opacity-40 hover:bg-warm-brown-dark transition-colors">
                        <SendIcon />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </article>

      {/* Modals */}
      <AnimatePresence>
        {showSendModal && currentUid && (
          <SendPostModal post={post} currentUid={currentUid} currentProfile={profile} onClose={() => setShowSendModal(false)} />
        )}
        {showResponders && typeConfig && (
          <RespondersModal postId={post.id} label={`${typeConfig.label} (${responseCount})`} onClose={() => setShowResponders(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* ScholarCard                                                         */
/* ------------------------------------------------------------------ */
function ScholarCard({ scholar, currentUid, onPeek }: {
  scholar: Scholar;
  currentUid: string | null;
  onPeek: (s: Scholar) => void;
}) {
  const [connStatus, setConnStatus] = useState<"none" | "pending" | "accepted">("none");

  useEffect(() => {
    if (!currentUid || !scholar.firebase_uid) return;
    const check = async () => {
      const a = await getDoc(doc(db, "connections", `${currentUid}_${scholar.firebase_uid}`));
      if (a.exists()) { setConnStatus(a.data().status); return; }
      const b = await getDoc(doc(db, "connections", `${scholar.firebase_uid}_${currentUid}`));
      if (b.exists()) { setConnStatus(b.data().status); }
    };
    check();
  }, [currentUid, scholar.firebase_uid]);

  async function handleConnect(e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUid || !scholar.firebase_uid || connStatus !== "none") return;
    const connRef = doc(db, "connections", `${currentUid}_${scholar.firebase_uid}`);
    await setDoc(connRef, {
      requesterId: currentUid,
      targetId: scholar.firebase_uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setConnStatus("pending");
  }

  return (
    <div
      className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-clay-muted/20 cursor-pointer hover:border-warm-brown/30 transition-colors"
      onClick={() => onPeek(scholar)}
    >
      <img src={scholar.photo_url || avatarFallback(scholar.name)} alt={scholar.name}
        className="w-9 h-9 rounded-full object-cover shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(scholar.name); }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-charcoal truncate hover:text-warm-brown transition-colors">{scholar.name}</p>
        <p className="text-[10px] text-text-muted truncate">{scholar.affiliation || "Researcher"}</p>
      </div>
      <button onClick={handleConnect} disabled={connStatus !== "none"}
        className={`shrink-0 text-[11px] font-semibold px-3 py-1 border rounded-full transition-colors ${
          connStatus === "accepted" ? "bg-green-50 border-green-400 text-green-700"
          : connStatus === "pending" ? "bg-amber-50 border-amber-400 text-amber-700"
          : "text-warm-brown border-warm-brown/40 hover:bg-warm-brown/10"
        }`}
      >
        {connStatus === "accepted" ? "✓" : connStatus === "pending" ? "..." : "Connect"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Network Tab                                                         */
/* ------------------------------------------------------------------ */
function NetworkTab({ currentUid, onPeekUid }: { currentUid: string; onPeekUid: (uid: string) => void }) {
  const [connections, setConnections] = useState<Array<{
    id: string; name: string; affiliation: string; photo: string; status: string; isIncoming: boolean; connId: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, "connections"), where("requesterId", "==", currentUid))),
        getDocs(query(collection(db, "connections"), where("targetId", "==", currentUid))),
      ]);
      const all: typeof connections = [];
      for (const d of sentSnap.docs) {
        const data = d.data();
        const userSnap = await getDoc(doc(db, "users", data.targetId));
        const u = userSnap.exists() ? userSnap.data() : {};
        all.push({ id: data.targetId, name: u.displayName || "Unknown", affiliation: u.affiliation || "", photo: u.photoURL || avatarFallback(u.displayName || "U"), status: data.status, isIncoming: false, connId: d.id });
      }
      for (const d of receivedSnap.docs) {
        const data = d.data();
        const userSnap = await getDoc(doc(db, "users", data.requesterId));
        const u = userSnap.exists() ? userSnap.data() : {};
        all.push({ id: data.requesterId, name: u.displayName || "Unknown", affiliation: u.affiliation || "", photo: u.photoURL || avatarFallback(u.displayName || "U"), status: data.status, isIncoming: true, connId: d.id });
      }
      setConnections(all);
      setLoading(false);
    };
    load();
  }, [currentUid]);

  async function acceptConnection(connId: string) {
    await updateDoc(doc(db, "connections", connId), { status: "accepted" });
    setConnections(prev => prev.map(c => c.connId === connId ? { ...c, status: "accepted" } : c));
  }

  const pending = connections.filter(c => c.isIncoming && c.status === "pending");
  const accepted = connections.filter(c => c.status === "accepted");

  if (loading) return <p className="text-sm text-text-muted py-8 text-center">Loading your network...</p>;

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-charcoal mb-3">Pending Requests ({pending.length})</h3>
          <div className="flex flex-col gap-3">
            {pending.map(c => (
              <div key={c.connId} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <button onClick={() => onPeekUid(c.id)} className="shrink-0">
                  <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.name); }} />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onPeekUid(c.id)} className="text-sm font-semibold text-charcoal hover:text-warm-brown transition-colors truncate text-left">{c.name}</button>
                  <p className="text-xs text-text-muted truncate">{c.affiliation}</p>
                </div>
                <button onClick={() => acceptConnection(c.connId)}
                  className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors">
                  <CheckIcon /> Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3">My Network ({accepted.length})</h3>
        {accepted.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-muted text-sm">No connections yet.</p>
            <p className="text-text-muted text-xs mt-1">Connect with researchers from the Suggested Scholars panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {accepted.map(c => (
              <button key={c.id} onClick={() => onPeekUid(c.id)}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-clay-muted/30 hover:shadow-md transition-shadow text-left">
                <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.name); }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-charcoal truncate">{c.name}</p>
                  <p className="text-[10px] text-text-muted truncate">{c.affiliation || "Researcher"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PostComposer Modal                                                  */
/* ------------------------------------------------------------------ */
interface PostComposerProps {
  onClose: () => void;
  onSubmit: (content: string, type: string, files: File[], previews: string[], fileTypes: string[]) => Promise<void>;
}

function PostComposerModal({ onClose, onSubmit }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);
  useEffect(() => { return () => { previews.forEach(URL.revokeObjectURL); }; }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    if (!accepted.length) return;
    const newFiles = [...files, ...accepted].slice(0, 4);
    const newPreviews = newFiles.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : "");
    setFiles(newFiles);
    setPreviews(newPreviews);
  }, [files]);

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles(f => f.filter((_, i) => i !== index));
    setPreviews(p => p.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleSubmit() {
    if ((!content.trim() && files.length === 0) || submitting) return;
    setSubmitting(true);
    const fileTypes = files.map(f => f.type.startsWith("image/") ? "image" : "pdf");
    onSubmit(content.trim(), postType, files, previews, fileTypes);
    onClose();
  }

  const types = ["General", "Collab Call", "Snippet", "Review Request", "Announcement"];

  const typeDescriptions: Record<string, string> = {
    "General": "Share thoughts, findings, or updates",
    "Collab Call": "Looking for collaborators on a project",
    "Snippet": "Share a research finding, quote, or code",
    "Review Request": "Seeking feedback on your work",
    "Announcement": "Conference, paper publish, lab news",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-charcoal">New Scroll</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-text-muted transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Post type selector */}
        <div className="flex flex-wrap gap-2 mb-2">
          {types.map(t => (
            <button key={t} onClick={() => setPostType(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                postType === t ? "bg-warm-brown text-white border-warm-brown" : "bg-cream-50 text-charcoal/70 border-clay-muted/40 hover:border-warm-brown/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted mb-4">{typeDescriptions[postType]}</p>

        <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
          placeholder={"Share a research insight, collaboration call, or idea...\n\nUse #tags to categorize your post."}
          rows={5}
          className="w-full resize-none text-sm bg-cream-50 rounded-xl border border-clay-muted/30 p-3 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50 placeholder:text-text-muted/60"
        />

        {content.trim() && extractTags(content).length > 0 && (
          <p className="text-[11px] text-text-muted mt-1.5">Tags: {extractTags(content).join(", ")}</p>
        )}

        {previews.length > 0 && (
          <div className={`mt-3 grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {files.map((file, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-clay-muted/20">
                {file.type.startsWith("image/") ? (
                  <img src={previews[i]} alt={file.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-cream-100">
                    <span className="text-xs text-charcoal/70 truncate px-2">{file.name}</span>
                  </div>
                )}
                <button onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                  <XCircleIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length < 4 && (
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
            className={`mt-3 border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
              dragOver ? "border-warm-brown bg-warm-brown/5" : "border-clay-muted/40 hover:border-warm-brown/50 hover:bg-cream-50"
            }`}
          >
            <UploadIcon />
            <p className="text-xs text-text-muted text-center">{dragOver ? "Drop to add" : "Drag & drop images or click to browse"}</p>
            <p className="text-[10px] text-text-muted/60">PNG, JPG, GIF, PDF · max 4 files</p>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)} />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-charcoal/70 hover:bg-cream-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={(!content.trim() && files.length === 0) || submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-charcoal rounded-lg hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function HubPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [allScholars, setAllScholars] = useState<Scholar[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<Array<{ tag: string; count: number }>>([]);
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [peekScholar, setPeekScholar] = useState<Scholar | null>(null);

  // Real-time feed
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30));
    const unsub = onSnapshot(q, snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      setPosts(loaded);
      setLoadingPosts(false);
      const tagCounts: Record<string, number> = {};
      snap.docs.forEach(d => {
        ((d.data().tags as string[]) || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      });
      const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }));
      setTrendingTopics(sorted);
    });
    return () => unsub();
  }, []);

  // Filter posts by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredPosts(posts.filter(p =>
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.authorName.toLowerCase().includes(q) ||
      p.postType.toLowerCase().includes(q)
    ));
  }, [posts, searchQuery]);

  // Scholars
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=50`)
      .then(r => r.json())
      .then(data => {
        const all = (data.researchers || []) as Scholar[];
        setAllScholars(all);
        const onboarded = all.filter(
          (r) => r.openalex_id?.startsWith("g_") && r.firebase_uid !== user?.uid
        );
        setScholars(onboarded.slice(0, 6));
      })
      .catch(() => {});
  }, [user?.uid]);

  // Events
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"), limit(3));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as ResearchEvent)));
    });
    return () => unsub();
  }, []);

  // Bookmarks
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "bookmarks")).then(snap => {
      setBookmarks(new Set(snap.docs.map(d => d.id)));
    });
  }, [user?.uid]);

  // Load saved posts when tab changes
  useEffect(() => {
    if (activeTab !== "saved" || !user) return;
    const load = async () => {
      const snap = await getDocs(collection(db, "users", user.uid, "bookmarks"));
      const postIds = snap.docs.map(d => d.id);
      const loaded: Post[] = [];
      for (const pid of postIds) {
        const pSnap = await getDoc(doc(db, "posts", pid));
        if (pSnap.exists()) loaded.push({ id: pSnap.id, ...pSnap.data() } as Post);
      }
      setSavedPosts(loaded);
    };
    load();
  }, [activeTab, user?.uid]);

  async function toggleBookmark(postId: string, isBookmarked: boolean) {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "bookmarks", postId);
    if (isBookmarked) {
      await deleteDoc(ref);
      setBookmarks(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setSavedPosts(prev => prev.filter(p => p.id !== postId));
    } else {
      await setDoc(ref, { savedAt: serverTimestamp() });
      setBookmarks(prev => new Set([...prev, postId]));
    }
  }

  // Profile peek by firebase UID
  async function peekByUid(uid: string) {
    if (uid === user?.uid) return;
    // Try to find in allScholars first
    const found = allScholars.find(s => s.firebase_uid === uid);
    if (found) { setPeekScholar(found); return; }
    // Fallback: load from users collection
    const uSnap = await getDoc(doc(db, "users", uid));
    if (uSnap.exists()) {
      const u = uSnap.data();
      setPeekScholar({
        id: uid,
        firebase_uid: uid,
        name: u.displayName || "Unknown",
        affiliation: u.affiliation || "",
        photo_url: u.photoURL || "",
        gr_rating: 0,
        tier_label: "",
        bio: u.bio || "",
        topics: u.expertise || [],
      });
    }
  }

  async function handlePost(content: string, postType: string, files: File[], blobPreviews: string[], fileTypes: string[]) {
    if (!user || !profile) return;
    const tags = extractTags(content);
    const docRef = await addDoc(collection(db, "posts"), {
      authorUid: user.uid,
      authorName: profile.displayName || "Anonymous",
      authorAvatar: profile.photoURL || avatarFallback(profile.displayName || "A"),
      authorAffiliation: profile.affiliation || "",
      content, tags, likes: [], commentCount: 0, postType,
      imageUrls: blobPreviews,
      fileTypes,
      createdAt: serverTimestamp(),
    });
    if (files.length > 0) {
      try {
        const realUrls = await Promise.all(files.map(async (file, i) => {
          const ext = file.name.split(".").pop() || "bin";
          const path = `hub-posts/${user.uid}/${docRef.id}_${i}.${ext}`;
          const ref = storageRef(storage, path);
          await uploadBytes(ref, file, { contentType: file.type });
          return getDownloadURL(ref);
        }));
        await updateDoc(docRef, { imageUrls: realUrls, fileTypes });
        blobPreviews.forEach(URL.revokeObjectURL);
      } catch { /* silent */ }
    }
  }

  const navItems = [
    { label: "Scrolls Feed", icon: "feed", tab: "feed" as Tab },
    { label: "My Network", icon: "network", tab: "network" as Tab },
    { label: "Saved", icon: "saved", tab: "saved" as Tab },
  ];
  const navIcons: Record<string, React.ReactNode> = {
    feed: <FeedIcon />, network: <NetworkIcon />, saved: <SavedIcon />,
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-cream-50 overflow-hidden">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 shrink-0 border-r border-clay-muted/30 bg-white p-4 flex flex-col gap-6 overflow-y-auto">
        {profile && (
          <Link href="/dashboard" className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-clay-muted/20 hover:border-warm-brown/30 transition-colors">
            <img src={profile.photoURL || avatarFallback(profile.displayName || "U")} alt={profile.displayName || ""}
              className="w-9 h-9 rounded-full object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(profile.displayName || "U"); }} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-charcoal truncate">{profile.displayName || "Your Profile"}</p>
              <p className="text-[10px] text-text-muted truncate">{profile.affiliation || profile.role || "Researcher"}</p>
            </div>
          </Link>
        )}

        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <button key={item.label} onClick={() => setActiveTab(item.tab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.tab ? "bg-charcoal text-white" : "text-charcoal/70 hover:bg-cream-100"
              }`}
            >
              {navIcons[item.icon]}{item.label}
            </button>
          ))}
        </nav>

        <button onClick={() => setShowComposer(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-warm-brown rounded-lg hover:bg-warm-brown-dark transition-colors">
          <PlusIcon />New Scroll
        </button>
      </aside>

      {/* CENTER FEED */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          {/* Search bar */}
          {activeTab === "feed" && (
            <div className="bg-white border border-clay-muted/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
              <SearchIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts by topic, tag, or author..."
                className="flex-1 text-sm text-charcoal bg-transparent outline-none placeholder:text-text-muted/60"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-charcoal transition-colors">
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          {/* Feed */}
          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
              {searchQuery && (
                <p className="text-xs text-text-muted">
                  {filteredPosts.length === 0 ? "No results for" : `${filteredPosts.length} result${filteredPosts.length !== 1 ? "s" : ""} for`}{" "}
                  <span className="font-medium text-charcoal">"{searchQuery}"</span>
                </p>
              )}
              {loadingPosts ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white border border-clay-muted/30 rounded-xl p-5 animate-pulse">
                      <div className="flex gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-cream-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-cream-100 rounded w-32" />
                          <div className="h-2.5 bg-cream-100 rounded w-24" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-cream-100 rounded" />
                        <div className="h-3 bg-cream-100 rounded w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length === 0 && !searchQuery ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FeedIcon />
                  </div>
                  <h3 className="text-base font-semibold text-charcoal mb-1">No posts yet</h3>
                  <p className="text-sm text-text-muted mb-4">Be the first to share a research insight!</p>
                  <button onClick={() => setShowComposer(true)}
                    className="px-5 py-2 text-sm font-semibold text-white bg-warm-brown rounded-lg hover:bg-warm-brown-dark transition-colors">
                    Write the first post
                  </button>
                </div>
              ) : filteredPosts.length === 0 && searchQuery ? (
                <div className="text-center py-16">
                  <p className="text-text-muted text-sm">No posts match your search.</p>
                  <button onClick={() => setSearchQuery("")} className="mt-2 text-xs text-warm-brown hover:underline">Clear search</button>
                </div>
              ) : (
                filteredPosts.map((post, index) => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index < 5 ? index * 0.06 : 0 }}>
                    <PostCard
                      post={post}
                      currentUid={user?.uid || null}
                      isBookmarked={bookmarks.has(post.id)}
                      onBookmarkToggle={toggleBookmark}
                      onAuthorClick={peekByUid}
                    />
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Network tab */}
          {activeTab === "network" && user && <NetworkTab currentUid={user.uid} onPeekUid={peekByUid} />}
          {activeTab === "network" && !user && (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">Sign in to see your network.</p>
            </div>
          )}

          {/* Saved tab */}
          {activeTab === "saved" && (
            <div className="flex flex-col gap-4">
              {savedPosts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SavedIcon />
                  </div>
                  <h3 className="text-base font-semibold text-charcoal mb-1">No saved posts</h3>
                  <p className="text-sm text-text-muted">Bookmark posts from the feed to see them here.</p>
                </div>
              ) : (
                savedPosts.map((post, index) => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index < 5 ? index * 0.06 : 0 }}>
                    <PostCard
                      post={post}
                      currentUid={user?.uid || null}
                      isBookmarked={bookmarks.has(post.id)}
                      onBookmarkToggle={toggleBookmark}
                      onAuthorClick={peekByUid}
                    />
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-72 shrink-0 border-l border-clay-muted/30 bg-white overflow-y-auto p-5 flex flex-col gap-6">
        {/* Trending topics */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingIcon />
            <h4 className="text-sm font-semibold text-charcoal">Trending Topics</h4>
          </div>
          {trendingTopics.length === 0 ? (
            <p className="text-xs text-text-muted">Topics will appear as people post with #hashtags.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {trendingTopics.map(t => (
                <button key={t.tag} onClick={() => { setActiveTab("feed"); setSearchQuery(t.tag); }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors text-left">
                  <span className="text-sm font-medium text-warm-brown">{t.tag}</span>
                  <span className="text-[10px] text-text-muted">{t.count} {t.count === 1 ? "post" : "posts"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Suggested Scholars */}
        <div>
          <h4 className="text-sm font-semibold text-charcoal mb-3">Suggested Scholars</h4>
          {scholars.length === 0 ? (
            <p className="text-xs text-text-muted">No onboarded researchers yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {scholars.map(s => (
                <ScholarCard key={s.id} scholar={s} currentUid={user?.uid || null} onPeek={setPeekScholar} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        {events.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon />
              <h4 className="text-sm font-semibold text-charcoal">Upcoming Events</h4>
            </div>
            <div className="flex flex-col gap-3">
              {events.map(ev => (
                <div key={ev.id} className="rounded-xl bg-charcoal text-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-brown-light mb-1">Event</p>
                  <h4 className="text-sm font-semibold leading-snug mb-1">{ev.title}</h4>
                  <p className="text-[11px] text-white/60 mb-2">{ev.date}{ev.location ? ` · ${ev.location}` : ""}</p>
                  {ev.description && <p className="text-[11px] text-white/70 leading-relaxed mb-3 line-clamp-3">{ev.description}</p>}
                  {ev.url && (
                    <a href={ev.url} target="_blank" rel="noopener noreferrer"
                      className="inline-block text-[11px] font-semibold px-4 py-1.5 bg-warm-brown text-white rounded-lg hover:bg-warm-brown-dark transition-colors">
                      Learn More
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Composer modal */}
      <AnimatePresence>
        {showComposer && (
          <PostComposerModal onClose={() => setShowComposer(false)} onSubmit={handlePost} />
        )}
      </AnimatePresence>

      {/* Profile Peek Panel */}
      <ProfilePeekPanel
        scholar={peekScholar}
        currentUid={user?.uid || null}
        onClose={() => setPeekScholar(null)}
      />
    </div>
  );
}
