"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  getPrivateKey,
  encryptMessage,
  encryptForSelf,
  decryptMessage,
  decryptForSelf,
} from "@/lib/crypto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface RawMessage {
  id: string;
  senderId: string;
  // each message stores two ciphertexts: one for recipient, one for sender
  cipherForRecipient?: string;
  cipherForSender?: string;
  createdAt: { seconds: number } | null;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: { seconds: number } | null;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage: string;
  lastMessageAt: { seconds: number } | null;
  unreadCount?: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* SVG Icons                                                           */
/* ------------------------------------------------------------------ */
const SearchIcon = () => (
  <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const LockIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatTime(ts: { seconds: number } | null) {
  if (!ts) return "";
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getOtherParticipant(conv: Conversation, myUid: string) {
  const otherId = conv.participants.find((p) => p !== myUid) ?? "";
  return {
    uid: otherId,
    name: conv.participantNames?.[otherId] ?? "Unknown",
    photo: conv.participantPhotos?.[otherId] ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* User Profile Slide-over Panel                                       */
/* ------------------------------------------------------------------ */
interface UserProfile {
  uid: string;
  name: string;
  photo: string;
  role?: string;
  bio?: string;
  affiliation?: string;
  expertise?: string[];
  researcherId?: string; // set if they're an expert with a researcher record
}

function UserProfilePanel({ uid, name, photo, onClose }: { uid: string; name: string; photo: string; onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    // Load from Firestore
    getDoc(doc(db, "users", uid)).then((snap) => {
      const data = snap.exists() ? snap.data() : {};
      setProfile({
        uid,
        name: data.displayName || name,
        photo: data.photoURL || photo,
        role: data.role,
        bio: data.bio,
        affiliation: data.affiliation,
        expertise: data.expertise || [],
      });
    }).finally(() => setLoading(false));
  }, [uid, name, photo]);

  // Also check if they have a researcher record
  const [researcherId, setResearcherId] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=200`)
      .then(r => r.json())
      .then(data => {
        const match = (data.researchers || []).find((r: { firebase_uid: string; id: string }) => r.firebase_uid === uid);
        if (match) setResearcherId(match.id);
      }).catch(() => {});
  }, [uid]);

  return (
    <AnimatePresence>
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
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-clay-muted/30">
          <span className="text-sm font-semibold text-charcoal">Profile</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream-bg transition-colors text-charcoal/60">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-warm-brown border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name */}
            <div className="px-5 py-6 flex flex-col items-center text-center border-b border-clay-muted/20">
              {profile.photo ? (
                <img src={profile.photo} alt={profile.name} className="w-20 h-20 rounded-full object-cover shadow-md mb-3" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown text-2xl font-semibold mb-3">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="font-serif text-lg font-semibold text-charcoal">{profile.name}</h3>
              {profile.affiliation && <p className="text-xs text-text-muted mt-0.5">{profile.affiliation}</p>}
              <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-medium ${profile.role === "expert" ? "bg-warm-brown/15 text-warm-brown-dark" : "bg-charcoal/8 text-charcoal"}`}>
                {profile.role === "expert" ? "Expert" : "Seeker"}
              </span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="px-5 py-4 border-b border-clay-muted/20">
                <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-2">About</p>
                <p className="text-sm text-charcoal/80 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Expertise tags */}
            {profile.expertise && profile.expertise.length > 0 && (
              <div className="px-5 py-4 border-b border-clay-muted/20">
                <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.expertise.map((t) => (
                    <span key={t} className="px-2.5 py-1 text-xs rounded-full bg-cream-bg border border-warm-brown/15 text-charcoal/70">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Link to full expert profile if they're an expert */}
            {researcherId && (
              <div className="px-5 py-4">
                <Link
                  href={`/expert/${researcherId}`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-warm-brown text-white text-sm font-medium rounded-xl hover:bg-warm-brown-dark transition-colors"
                >
                  View Full Research Profile
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            )}

            {/* Empty state */}
            {!profile.bio && (!profile.expertise || profile.expertise.length === 0) && !researcherId && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-text-muted">No additional profile info available.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-muted">Could not load profile.</p>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}

export default function MessagesPage() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [rawMessages, setRawMessages] = useState<RawMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [sendError, setSendError] = useState("");
  const [otherPublicKeys, setOtherPublicKeys] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace("/login");
  }, [authLoading, isLoggedIn, router]);

  /* load conversations */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);
      if (!activeConvId && convs.length > 0) setActiveConvId(convs[0].id);
    });
    return unsub;
  }, [user]);

  /* fetch other user's public key — always re-fetch on conversation change to get latest */
  useEffect(() => {
    if (!activeConvId || !user) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;
    const otherId = conv.participants.find((p) => p !== user.uid);
    if (!otherId) return;
    getDoc(doc(db, "users", otherId)).then((snap) => {
      const pk = snap.data()?.publicKey;
      if (pk) setOtherPublicKeys((prev) => ({ ...prev, [otherId]: pk }));
    });
  }, [activeConvId, user]);

  /* load raw messages */
  useEffect(() => {
    if (!activeConvId || !user) return;
    const q = query(
      collection(db, "conversations", activeConvId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setRawMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RawMessage)));
    });
    return unsub;
  }, [activeConvId, user]);

  /* decrypt messages — re-runs whenever raw messages or keys change */
  useEffect(() => {
    if (!user || !activeConvId) return;
    const myPrivKey = getPrivateKey(user.uid);
    const conv = conversations.find((c) => c.id === activeConvId);
    const otherId = conv?.participants.find((p) => p !== user.uid) ?? "";
    const otherPubKey = otherPublicKeys[otherId];

    const decrypted: Message[] = rawMessages.map((raw) => {
      let text = "[encrypted]";
      if (myPrivKey) {
        if (raw.senderId === user.uid) {
          if (raw.cipherForSender)
            text = decryptForSelf(raw.cipherForSender, myPrivKey) ?? "[encrypted]";
        } else {
          if (raw.cipherForRecipient && otherPubKey)
            text = decryptMessage(raw.cipherForRecipient, otherPubKey, myPrivKey) ?? "[encrypted]";
        }
      }
      return { id: raw.id, senderId: raw.senderId, text, createdAt: raw.createdAt };
    });
    setMessages(decrypted);
  }, [rawMessages, otherPublicKeys, user, activeConvId, conversations]);

  /* auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!inputText.trim() || !activeConvId || !user || sending) return;
    setSendError("");

    const conv = conversations.find((c) => c.id === activeConvId);
    const otherId = conv?.participants.find((p) => p !== user.uid) ?? "";
    let otherPubKey = otherPublicKeys[otherId];
    const myPrivKey = getPrivateKey(user.uid);

    // If other user's public key isn't cached yet, try to fetch it now
    if (!otherPubKey && otherId) {
      try {
        const snap = await getDoc(doc(db, "users", otherId));
        const pk = snap.data()?.publicKey;
        if (pk) {
          setOtherPublicKeys((prev) => ({ ...prev, [otherId]: pk }));
          otherPubKey = pk;
        }
      } catch {
        // will fall through to error below
      }
    }

    if (!otherPubKey) {
      setSendError("Cannot send message — the other user's encryption key isn't available yet. They may need to log in once first.");
      return;
    }
    if (!myPrivKey) {
      setSendError("Your encryption key is missing. Try refreshing the page.");
      return;
    }

    setSending(true);
    const text = inputText.trim();
    setInputText("");

    try {
      const cipherForRecipient = encryptMessage(text, otherPubKey, myPrivKey);
      const cipherForSender = encryptForSelf(text, myPrivKey);

      await addDoc(collection(db, "conversations", activeConvId, "messages"), {
        senderId: user.uid,
        cipherForRecipient,
        cipherForSender,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "conversations", activeConvId), {
        lastMessage: "🔒 Encrypted message",
        lastMessageAt: serverTimestamp(),
      });
    } catch {
      setSendError("Failed to send message. Please try again.");
      setInputText(text); // restore input so user doesn't lose their message
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (authLoading || !user) return null;

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherUser = activeConv ? getOtherParticipant(activeConv, user.uid) : null;
  const filteredConvs = conversations.filter((c) =>
    getOtherParticipant(c, user.uid).name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* empty state */
  if (!authLoading && conversations.length === 0) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-cream-50">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="font-serif text-xl font-semibold text-charcoal mb-2">No conversations yet</h2>
          <p className="text-sm text-text-muted mb-6">Find an expert and start a conversation to connect.</p>
          <button
            onClick={() => router.push("/discover")}
            className="px-6 py-2.5 bg-warm-brown text-white text-sm font-medium rounded-full hover:bg-warm-brown-dark transition-colors"
          >
            Find Experts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex bg-cream-50">
      {/* LEFT SIDEBAR */}
      <aside className="w-80 border-r border-clay-muted/40 bg-white overflow-y-auto flex flex-col shrink-0">
        <div className="p-4 border-b border-clay-muted/30">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-100 rounded-xl border border-clay-muted/30 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 placeholder:text-text-muted/60 transition-all"
            />
          </div>
        </div>

        <div className="flex-1">
          {filteredConvs.map((conv) => {
            const other = getOtherParticipant(conv, user.uid);
            const isActive = conv.id === activeConvId;
            const unread = conv.unreadCount?.[user.uid] ?? 0;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-l-[3px] ${
                  isActive ? "border-l-warm-brown bg-cream-50" : "border-l-transparent hover:bg-cream-50/60"
                }`}
              >
                <div className="shrink-0">
                  {other.photo ? (
                    <img src={other.photo} alt={other.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown font-semibold text-sm">
                      {other.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium truncate ${isActive ? "text-charcoal" : "text-charcoal/80"}`}>
                      {other.name}
                    </span>
                    <span className="text-[11px] text-text-muted shrink-0">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1">
                    <LockIcon />
                    {conv.lastMessage || "No messages yet"}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-warm-brown rounded-full">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER CHAT */}
      {activeConv && otherUser ? (
        <section className="flex-1 flex flex-col min-w-0 bg-cream-50">
          <header className="h-16 px-6 flex items-center justify-between border-b border-clay-muted/30 bg-white shrink-0">
            <button
              onClick={() => setShowProfilePanel(true)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
            >
              {otherUser.photo ? (
                <img src={otherUser.photo} alt={otherUser.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown font-semibold text-sm">
                  {otherUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-charcoal underline-offset-2 hover:underline">{otherUser.name}</span>
                <p className="flex items-center gap-1 text-[11px] text-green-600 mt-0.5">
                  <LockIcon />
                  End-to-end encrypted
                </p>
              </div>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {/* encryption notice */}
            <div className="flex justify-center">
              <span className="flex items-center gap-1.5 text-[11px] text-text-muted bg-white border border-clay-muted/30 px-3 py-1.5 rounded-full">
                <LockIcon />
                Messages are end-to-end encrypted. Only you and {otherUser.name.split(" ")[0]} can read them.
              </span>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isMine = msg.senderId === user.uid;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-md">
                      <div className={`px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
                        isMine
                          ? "bg-charcoal text-white rounded-br-sm"
                          : "bg-white border border-clay-muted/40 text-charcoal rounded-bl-sm"
                      }`}>
                        {msg.text}
                      </div>
                      <p className={`text-[10px] text-text-muted mt-1 ${isMine ? "text-right" : ""}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-clay-muted/30 bg-white p-4 shrink-0">
            {sendError && (
              <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {sendError}
              </div>
            )}
            <div className="flex items-end gap-3">
              <textarea
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); if (sendError) setSendError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none py-2.5 px-4 text-sm bg-cream-50 rounded-xl border border-clay-muted/30 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 placeholder:text-text-muted/50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-charcoal text-white rounded-xl hover:bg-charcoal-light disabled:opacity-40 transition-colors"
              >
                <SendIcon />
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-2 text-center flex items-center justify-center gap-1">
              <LockIcon />
              Encrypted with NaCl · Messages never stored in plaintext
            </p>
          </div>
        </section>
      ) : (
        <section className="flex-1 flex items-center justify-center text-text-muted text-sm bg-cream-50">
          Select a conversation
        </section>
      )}

      {/* Other user's profile slide-over */}
      {showProfilePanel && otherUser && (
        <UserProfilePanel
          uid={otherUser.uid}
          name={otherUser.name}
          photo={otherUser.photo}
          onClose={() => setShowProfilePanel(false)}
        />
      )}
    </div>
  );
}
