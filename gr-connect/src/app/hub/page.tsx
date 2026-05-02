"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, addDoc, onSnapshot, query, orderBy, limit,
  doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp,
  getDoc, setDoc, getDocs, where,
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
  name: string;
  affiliation: string;
  photo_url: string;
  gr_rating: number;
  tier_label: string;
}

interface ResearchEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  url?: string;
}

interface Connection {
  id: string;
  requesterId: string;
  targetId: string;
  status: "pending" | "accepted";
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
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

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* PostCard                                                            */
/* ------------------------------------------------------------------ */
function PostCard({ post, currentUid }: { post: Post; currentUid: string | null }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const { profile } = useAuth();

  const liked = currentUid ? post.likes.includes(currentUid) : false;

  async function toggleLike() {
    if (!currentUid) return;
    const ref = doc(db, "posts", post.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(currentUid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUid) });
    }
  }

  async function loadComments() {
    if (loadingComments) return;
    setLoadingComments(true);
    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc"),
      limit(50)
    );
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
    const newComment = {
      authorUid: currentUid,
      authorName: profile.displayName || "User",
      authorAvatar: profile.photoURL || avatarFallback(profile.displayName || "U"),
      content: commentText.trim(),
      createdAt: serverTimestamp(),
    };
    await addDoc(colRef, newComment);
    await updateDoc(doc(db, "posts", post.id), { commentCount: (post.commentCount || 0) + 1 });
    setCommentText("");
    await loadComments();
  }

  function sharePost() {
    const url = `${window.location.origin}/hub/post/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : null;

  return (
    <article className="bg-white border border-clay-muted/30 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={post.authorAvatar || avatarFallback(post.authorName)}
            alt={post.authorName}
            className="w-10 h-10 rounded-full object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(post.authorName); }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-charcoal truncate">{post.authorName}</span>
              {post.postType && post.postType !== "General" && (
                <span className="px-2 py-0.5 text-[10px] font-semibold italic font-serif rounded-full bg-warm-brown/10 text-warm-brown">
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

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className={`mb-4 grid gap-2 ${post.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {post.imageUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`attachment ${i + 1}`}
                  className={`w-full rounded-xl object-cover border border-clay-muted/20 hover:opacity-90 transition-opacity cursor-zoom-in ${
                    post.imageUrls!.length === 1 ? "max-h-96" : "h-48"
                  }`}
                />
              </a>
            ))}
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 text-[11px] font-medium bg-cream-100 text-warm-brown rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-5 pt-3 border-t border-clay-muted/20">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-red-500" : "text-text-muted hover:text-red-500"}`}
          >
            <HeartIcon filled={liked} />
            <span>{post.likes.length}</span>
          </button>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-charcoal transition-colors"
          >
            <CommentIcon />
            <span>{post.commentCount || 0}</span>
          </button>
          <button
            onClick={sharePost}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-charcoal transition-colors"
          >
            <ShareIcon />
            <span>{copied ? "Copied!" : "Share"}</span>
          </button>
          <button className="ml-auto text-text-muted hover:text-charcoal transition-colors">
            <BookmarkIcon filled={false} />
          </button>
        </div>
      </div>

      {/* Comments section */}
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
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <img
                      src={c.authorAvatar || avatarFallback(c.authorName)}
                      alt={c.authorName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.authorName); }}
                    />
                    <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-clay-muted/20">
                      <p className="text-[11px] font-semibold text-charcoal">{c.authorName}</p>
                      <p className="text-xs text-charcoal/80 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
              {currentUid && profile && (
                <div className="flex gap-2 mt-1">
                  <img
                    src={profile.photoURL || avatarFallback(profile.displayName || "U")}
                    alt="You"
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(profile.displayName || "U"); }}
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
                      placeholder="Write a comment..."
                      className="flex-1 text-xs bg-white rounded-xl border border-clay-muted/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50"
                    />
                    <button
                      onClick={submitComment}
                      disabled={!commentText.trim()}
                      className="p-2 bg-warm-brown text-white rounded-lg disabled:opacity-40 hover:bg-warm-brown-dark transition-colors"
                    >
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
  );
}

/* ------------------------------------------------------------------ */
/* ScholarCard (Suggested Scholars)                                    */
/* ------------------------------------------------------------------ */
function ScholarCard({ scholar, currentUid }: { scholar: Scholar; currentUid: string | null }) {
  const [connStatus, setConnStatus] = useState<"none" | "pending" | "accepted">("none");

  useEffect(() => {
    if (!currentUid || !scholar.id) return;
    const check = async () => {
      const connRef = doc(db, "connections", `${currentUid}_${scholar.id}`);
      const snap = await getDoc(connRef);
      if (snap.exists()) setConnStatus(snap.data().status);
    };
    check();
  }, [currentUid, scholar.id]);

  async function handleConnect() {
    if (!currentUid || connStatus !== "none") return;
    const connRef = doc(db, "connections", `${currentUid}_${scholar.id}`);
    await setDoc(connRef, {
      requesterId: currentUid,
      targetId: scholar.id,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    setConnStatus("pending");
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-clay-muted/20">
      <Link href={`/expert/${scholar.id}`}>
        <img
          src={scholar.photo_url || avatarFallback(scholar.name)}
          alt={scholar.name}
          className="w-9 h-9 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(scholar.name); }}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/expert/${scholar.id}`}>
          <p className="text-xs font-semibold text-charcoal truncate hover:text-warm-brown transition-colors">{scholar.name}</p>
        </Link>
        <p className="text-[10px] text-text-muted truncate">{scholar.affiliation || "Researcher"}</p>
      </div>
      <button
        onClick={handleConnect}
        disabled={connStatus !== "none"}
        className={`shrink-0 text-[11px] font-semibold px-3 py-1 border rounded-full transition-colors ${
          connStatus === "accepted"
            ? "bg-green-50 border-green-400 text-green-700"
            : connStatus === "pending"
            ? "bg-amber-50 border-amber-400 text-amber-700"
            : "text-warm-brown border-warm-brown/40 hover:bg-warm-brown/10"
        }`}
      >
        {connStatus === "accepted" ? "Connected" : connStatus === "pending" ? "Pending" : "Connect"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Network Tab                                                         */
/* ------------------------------------------------------------------ */
function NetworkTab({ currentUid }: { currentUid: string }) {
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
        all.push({
          id: data.targetId,
          name: u.displayName || "Unknown",
          affiliation: u.affiliation || "",
          photo: u.photoURL || avatarFallback(u.displayName || "U"),
          status: data.status,
          isIncoming: false,
          connId: d.id,
        });
      }

      for (const d of receivedSnap.docs) {
        const data = d.data();
        const userSnap = await getDoc(doc(db, "users", data.requesterId));
        const u = userSnap.exists() ? userSnap.data() : {};
        all.push({
          id: data.requesterId,
          name: u.displayName || "Unknown",
          affiliation: u.affiliation || "",
          photo: u.photoURL || avatarFallback(u.displayName || "U"),
          status: data.status,
          isIncoming: true,
          connId: d.id,
        });
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
                <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.name); }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{c.name}</p>
                  <p className="text-xs text-text-muted truncate">{c.affiliation}</p>
                </div>
                <button
                  onClick={() => acceptConnection(c.connId)}
                  className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
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
              <Link key={c.id} href={`/expert/${c.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-clay-muted/30 hover:shadow-md transition-shadow">
                <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-full object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(c.name); }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-charcoal truncate">{c.name}</p>
                  <p className="text-[10px] text-text-muted truncate">{c.affiliation || "Researcher"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PostComposer modal                                                  */
/* ------------------------------------------------------------------ */
interface PostComposerProps {
  onClose: () => void;
  onSubmit: (content: string, type: string, files: File[], previews: string[]) => Promise<void>;
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

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach(URL.revokeObjectURL); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    if (!accepted.length) return;
    const newFiles = [...files, ...accepted].slice(0, 4); // max 4 attachments
    const newPreviews = newFiles.map(f =>
      f.type.startsWith("image/") ? URL.createObjectURL(f) : ""
    );
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
    // Close immediately — upload happens in background
    onSubmit(content.trim(), postType, files, previews);
    onClose();
  }

  const types = ["General", "Collab Call", "Snippet", "Review Request", "Announcement"];

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
        <div className="flex flex-wrap gap-2 mb-4">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setPostType(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                postType === t
                  ? "bg-warm-brown text-white border-warm-brown"
                  : "bg-cream-50 text-charcoal/70 border-clay-muted/40 hover:border-warm-brown/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={"Share a research insight, collaboration call, or idea...\n\nUse #tags to categorize your post."}
          rows={5}
          className="w-full resize-none text-sm bg-cream-50 rounded-xl border border-clay-muted/30 p-3 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50 placeholder:text-text-muted/60"
        />

        {content.trim() && extractTags(content).length > 0 && (
          <p className="text-[11px] text-text-muted mt-1.5">
            Tags: {extractTags(content).join(", ")}
          </p>
        )}

        {/* Image previews */}
        {previews.length > 0 && (
          <div className={`mt-3 grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {files.map((file, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-clay-muted/20">
                {file.type.startsWith("image/") ? (
                  <img
                    src={previews[i]}
                    alt={file.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-cream-100">
                    <span className="text-xs text-charcoal/70 truncate px-2">{file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <XCircleIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drag-and-drop zone */}
        {files.length < 4 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-3 border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
              dragOver
                ? "border-warm-brown bg-warm-brown/5"
                : "border-clay-muted/40 hover:border-warm-brown/50 hover:bg-cream-50"
            }`}
          >
            <UploadIcon />
            <p className="text-xs text-text-muted text-center">
              {dragOver ? "Drop to add" : "Drag & drop images or click to browse"}
            </p>
            <p className="text-[10px] text-text-muted/60">PNG, JPG, GIF, PDF · max 4 files</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-charcoal/70 hover:bg-cream-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && files.length === 0) || submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-charcoal rounded-lg hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */
export default function HubPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<Array<{ tag: string; count: number }>>([]);
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Real-time feed
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30));
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
      setLoadingPosts(false);

      // Build trending topics from post tags
      const tagCounts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const tags: string[] = (d.data().tags as string[]) || [];
        tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      });
      const sorted = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => ({ tag, count }));
      setTrendingTopics(sorted);
    });
    return () => unsub();
  }, []);

  // Suggested scholars — only Google-onboarded users (openalex_id starts with g_)
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=30`)
      .then(r => r.json())
      .then(data => {
        const onboarded = (data.researchers || []).filter(
          (r: Scholar & { openalex_id?: string }) => r.openalex_id?.startsWith("g_")
        );
        setScholars(onboarded.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  // Events from Firestore
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"), limit(3));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as ResearchEvent)));
    });
    return () => unsub();
  }, []);

  async function handlePost(content: string, postType: string, files: File[], blobPreviews: string[]) {
    if (!user || !profile) return;
    const tags = extractTags(content);

    // Post immediately with blob URLs so it appears in feed right away
    const docRef = await addDoc(collection(db, "posts"), {
      authorUid: user.uid,
      authorName: profile.displayName || "Anonymous",
      authorAvatar: profile.photoURL || avatarFallback(profile.displayName || "A"),
      authorAffiliation: profile.affiliation || "",
      content,
      tags,
      likes: [],
      commentCount: 0,
      postType,
      imageUrls: blobPreviews, // temporary blob URLs shown locally
      createdAt: serverTimestamp(),
    });

    // Upload in background and patch with real URLs
    if (files.length > 0) {
      try {
        const realUrls = await Promise.all(
          files.map(async (file, i) => {
            const ext = file.name.split(".").pop() || "bin";
            const path = `hub-posts/${user.uid}/${docRef.id}_${i}.${ext}`;
            const ref = storageRef(storage, path);
            await uploadBytes(ref, file, { contentType: file.type });
            return getDownloadURL(ref);
          })
        );
        await updateDoc(docRef, { imageUrls: realUrls });
        // Revoke blob URLs now that real URLs are stored
        blobPreviews.forEach(URL.revokeObjectURL);
      } catch {
        // Upload failed — post is still visible without images, silently ignore
      }
    }
  }

  const navItems = [
    { label: "Scrolls Feed", icon: "feed", tab: "feed" as Tab },
    { label: "My Network", icon: "network", tab: "network" as Tab },
    { label: "Saved", icon: "saved", tab: "saved" as Tab },
  ];

  const navIcons: Record<string, React.ReactNode> = {
    feed: <FeedIcon />,
    network: <NetworkIcon />,
    saved: <SavedIcon />,
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-cream-50 overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT SIDEBAR                                                  */}
      {/* ============================================================ */}
      <aside className="w-64 shrink-0 border-r border-clay-muted/30 bg-white p-4 flex flex-col gap-6 overflow-y-auto">
        {/* User profile mini card */}
        {profile && (
          <Link href="/dashboard" className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-clay-muted/20 hover:border-warm-brown/30 transition-colors">
            <img
              src={profile.photoURL || avatarFallback(profile.displayName || "U")}
              alt={profile.displayName || ""}
              className="w-9 h-9 rounded-full object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(profile.displayName || "U"); }}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-charcoal truncate">{profile.displayName || "Your Profile"}</p>
              <p className="text-[10px] text-text-muted truncate">{profile.affiliation || profile.role || "Researcher"}</p>
            </div>
          </Link>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.tab
                  ? "bg-charcoal text-white"
                  : "text-charcoal/70 hover:bg-cream-100"
              }`}
            >
              {navIcons[item.icon]}
              {item.label}
            </button>
          ))}
        </nav>

        {/* New Scroll button */}
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-warm-brown rounded-lg hover:bg-warm-brown-dark transition-colors"
        >
          <PlusIcon />
          New Scroll
        </button>
      </aside>

      {/* ============================================================ */}
      {/* CENTER FEED                                                   */}
      {/* ============================================================ */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          {/* Inline composer bar */}
          {activeTab === "feed" && (
            <div
              className="bg-white border border-clay-muted/30 rounded-xl p-4 mb-6 flex items-center gap-3 cursor-pointer hover:border-warm-brown/40 transition-colors"
              onClick={() => setShowComposer(true)}
            >
              <img
                src={profile?.photoURL || avatarFallback(profile?.displayName || "U")}
                alt="You"
                className="w-10 h-10 rounded-full object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = avatarFallback(profile?.displayName || "U"); }}
              />
              <div className="flex-1 bg-cream-50 rounded-xl border border-clay-muted/20 px-4 py-3 text-sm text-text-muted/60 select-none">
                Share a research insight...
              </div>
              <button className="p-2 rounded-lg hover:bg-cream-100 text-text-muted transition-colors">
                <ImageIcon />
              </button>
            </div>
          )}

          {/* Feed */}
          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
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
                        <div className="h-3 bg-cream-100 rounded w-3/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FeedIcon />
                  </div>
                  <h3 className="text-base font-semibold text-charcoal mb-1">No posts yet</h3>
                  <p className="text-sm text-text-muted mb-4">Be the first to share a research insight!</p>
                  <button
                    onClick={() => setShowComposer(true)}
                    className="px-5 py-2 text-sm font-semibold text-white bg-warm-brown rounded-lg hover:bg-warm-brown-dark transition-colors"
                  >
                    Write the first post
                  </button>
                </div>
              ) : (
                posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index < 5 ? index * 0.06 : 0 }}
                  >
                    <PostCard post={post} currentUid={user?.uid || null} />
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Network tab */}
          {activeTab === "network" && user && (
            <NetworkTab currentUid={user.uid} />
          )}
          {activeTab === "network" && !user && (
            <div className="text-center py-16">
              <p className="text-text-muted text-sm">Sign in to see your network.</p>
            </div>
          )}

          {/* Saved tab placeholder */}
          {activeTab === "saved" && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SavedIcon />
              </div>
              <h3 className="text-base font-semibold text-charcoal mb-1">Saved Posts</h3>
              <p className="text-sm text-text-muted">Your bookmarked posts will appear here.</p>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* RIGHT SIDEBAR                                                 */}
      {/* ============================================================ */}
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
              {trendingTopics.map((t) => (
                <button
                  key={t.tag}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors"
                >
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
              {scholars.map((s) => (
                <ScholarCard key={s.id} scholar={s} currentUid={user?.uid || null} />
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
                  {ev.description && (
                    <p className="text-[11px] text-white/70 leading-relaxed mb-3 line-clamp-3">{ev.description}</p>
                  )}
                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] font-semibold px-4 py-1.5 bg-warm-brown text-white rounded-lg hover:bg-warm-brown-dark transition-colors"
                    >
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
          <PostComposerModal
            onClose={() => setShowComposer(false)}
            onSubmit={handlePost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
