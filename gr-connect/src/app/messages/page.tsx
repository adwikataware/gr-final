"use client";

import { useState, useRef, useEffect } from "react";
import { messages as initialMessages, experts } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Message {
  id: number;
  type?: string;
  sender?: string;
  senderName?: string;
  content: string;
  tags?: string[];
  timestamp: string;
  attachment?: { name: string; size: string };
}

interface Thread {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  expertise: string[];
  rating: number;
  ratingTier: string;
}

/* ------------------------------------------------------------------ */
/* Hardcoded threads (derived from mock experts)                        */
/* ------------------------------------------------------------------ */
const threads: Thread[] = [
  {
    id: "parikshit-mahalle",
    name: "Dr. Parikshit Mahalle",
    avatar: experts[0].avatar,
    lastMessage: "I've attached our latest preprint that covers this...",
    time: "11:02 AM",
    unread: 0,
    online: true,
    expertise: ["IoT", "ML", "Cybersecurity"],
    rating: 4.98,
    ratingTier: "Top 1%",
  },
  {
    id: "elena-vasquez",
    name: "Dr. Elena Vasquez",
    avatar: experts[1].avatar,
    lastMessage: "The CRISPR efficiency results look promising!",
    time: "Yesterday",
    unread: 2,
    online: false,
    expertise: ["Computational Biology", "Genomics", "CRISPR"],
    rating: 4.96,
    ratingTier: "Top 1%",
  },
  {
    id: "rajesh-kumar",
    name: "Dr. Rajesh Kumar",
    avatar: experts[2].avatar,
    lastMessage: "Let me review the NLP pipeline and get back to you.",
    time: "Mon",
    unread: 0,
    online: true,
    expertise: ["AI", "NLP", "Reinforcement Learning"],
    rating: 4.85,
    ratingTier: "Top 3%",
  },
  {
    id: "sarah-chen",
    name: "Dr. Sarah Chen",
    avatar: experts[3].avatar,
    lastMessage: "Great question about the ethical AI framework.",
    time: "Mar 1",
    unread: 1,
    online: false,
    expertise: ["HCI", "Ethical AI", "Accessibility"],
    rating: 4.78,
    ratingTier: "Top 5%",
  },
];

/* ------------------------------------------------------------------ */
/* SVG icon helpers                                                    */
/* ------------------------------------------------------------------ */
const SearchIcon = () => (
  <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const VideoIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const BoldIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);

const ItalicIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const AttachIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const RobotIcon = () => (
  <svg className="w-5 h-5 text-warm-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <circle cx="9" cy="14" r="1.5" fill="currentColor" />
    <circle cx="15" cy="14" r="1.5" fill="currentColor" />
    <path d="M12 2v4" />
    <circle cx="12" cy="2" r="1" fill="currentColor" />
    <path d="M1 14h2M21 14h2" />
  </svg>
);

const PdfIcon = () => (
  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 3.5L18.5 8H14V3.5zM6 20V4h7v5h5v11H6z" />
    <text x="7" y="17" fontSize="5" fontWeight="bold" fill="currentColor">PDF</text>
  </svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? "text-yellow-500" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const VerifiedBadge = () => (
  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */
export default function MessagesPage() {
  const [activeThread, setActiveThread] = useState<string>("parikshit-mahalle");
  const [chatMessages, setChatMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeThreadData = threads.find((t) => t.id === activeThread)!;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const filteredThreads = threads.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: chatMessages.length + 1,
      sender: "seeker",
      senderName: "You",
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex bg-cream-50">
      {/* ============================================================ */}
      {/* LEFT SIDEBAR                                                  */}
      {/* ============================================================ */}
      <aside className="w-80 border-r border-clay-muted/40 bg-white overflow-y-auto flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-clay-muted/30">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-cream-100 rounded-xl border border-clay-muted/30 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50 placeholder:text-text-muted/60 transition-all"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1">
          {filteredThreads.map((thread) => {
            const isActive = thread.id === activeThread;
            return (
              <button
                key={thread.id}
                onClick={() => setActiveThread(thread.id)}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-l-[3px] ${
                  isActive
                    ? "border-l-warm-brown bg-cream-50"
                    : "border-l-transparent hover:bg-cream-50/60"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={thread.avatar}
                    alt={thread.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {thread.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium truncate ${isActive ? "text-charcoal" : "text-charcoal/80"}`}>
                      {thread.name}
                    </span>
                    <span className="text-[11px] text-text-muted shrink-0">{thread.time}</span>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{thread.lastMessage}</p>
                </div>

                {/* Unread indicator */}
                {thread.unread > 0 && (
                  <span className="shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-warm-brown rounded-full">
                    {thread.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* CENTER PANEL                                                  */}
      {/* ============================================================ */}
      <section className="flex-1 flex flex-col min-w-0 bg-cream-50">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-clay-muted/30 bg-white">
          <div className="flex items-center gap-3">
            <img
              src={activeThreadData.avatar}
              alt={activeThreadData.name}
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-charcoal">{activeThreadData.name}</span>
                {activeThreadData.online && (
                  <span className="flex items-center gap-1 text-[11px] text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Online
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">{activeThreadData.expertise.join(" · ")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal border border-clay-muted/50 rounded-lg hover:bg-cream-100 transition-colors">
              <PhoneIcon />
              Audio
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal border border-clay-muted/50 rounded-lg hover:bg-cream-100 transition-colors">
              <VideoIcon />
              Video
            </button>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg) => {
            /* AI Context card */
            if (msg.type === "ai-context") {
              return (
                <div key={msg.id} className="max-w-xl mx-auto bg-anthropic-tan border border-accent-tan/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RobotIcon />
                    <span className="text-xs font-semibold text-warm-brown uppercase tracking-wider">AI Context Summary</span>
                  </div>
                  <p className="text-sm italic text-charcoal/80 leading-relaxed">{msg.content}</p>
                  {msg.tags && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {msg.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-[11px] font-medium bg-warm-brown/10 text-warm-brown rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-text-muted mt-2">{msg.timestamp}</p>
                </div>
              );
            }

            const isExpert = msg.sender === "expert";
            const isSeeker = msg.sender === "seeker";

            return (
              <div key={msg.id} className={`flex ${isSeeker ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-md ${isSeeker ? "order-1" : ""}`}>
                  {/* Sender label */}
                  <p className={`text-[11px] font-medium mb-1 ${isSeeker ? "text-right text-text-muted" : "text-text-muted"}`}>
                    {msg.senderName}
                  </p>

                  {/* Bubble */}
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      isExpert
                        ? "bg-white border border-clay-muted/40 rounded-2xl rounded-bl-sm text-charcoal"
                        : "bg-charcoal text-white rounded-2xl rounded-br-sm"
                    }`}
                  >
                    {msg.content}

                    {/* Attachment */}
                    {msg.attachment && (
                      <div className="mt-3 flex items-center gap-3 bg-cream-50 border border-clay-muted/30 rounded-lg p-3">
                        <PdfIcon />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-charcoal truncate">{msg.attachment.name}</p>
                          <p className="text-[10px] text-text-muted">{msg.attachment.size}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className={`text-[10px] text-text-muted mt-1 ${isSeeker ? "text-right" : ""}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-clay-muted/30 bg-white p-4">
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-2">
            <button className="p-1.5 rounded hover:bg-cream-100 text-text-muted transition-colors">
              <BoldIcon />
            </button>
            <button className="p-1.5 rounded hover:bg-cream-100 text-text-muted transition-colors">
              <ItalicIcon />
            </button>
            <span className="w-px h-4 bg-clay-muted/50 mx-1" />
            <button className="p-1.5 rounded hover:bg-cream-100 text-text-muted transition-colors">
              <AttachIcon />
            </button>
            <button className="p-1.5 rounded hover:bg-cream-100 text-text-muted transition-colors">
              <MicIcon />
            </button>
          </div>

          {/* Input + Send */}
          <div className="flex items-end gap-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 resize-none py-2.5 px-4 text-sm bg-cream-50 rounded-xl border border-clay-muted/30 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50 placeholder:text-text-muted/50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="shrink-0 w-10 h-10 flex items-center justify-center bg-charcoal text-white rounded-xl hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <SendIcon />
            </button>
          </div>

          <p className="text-[10px] text-text-muted mt-2 text-center">
            Layer 2 &bull; Premium Messaging
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* RIGHT SIDEBAR                                                 */}
      {/* ============================================================ */}
      <aside className="w-80 border-l border-clay-muted/40 bg-white overflow-y-auto p-6">
        {/* Expert profile */}
        <div className="text-center mb-6">
          <img
            src={activeThreadData.avatar}
            alt={activeThreadData.name}
            className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-warm-brown/20"
          />
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <h3 className="font-serif text-lg font-semibold text-charcoal">{activeThreadData.name}</h3>
            <VerifiedBadge />
          </div>
        </div>

        {/* Rating */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <StarIcon key={i} filled={i <= Math.round(activeThreadData.rating)} />
            ))}
          </div>
          <p className="text-sm font-semibold text-charcoal">{activeThreadData.rating}</p>
          <span className="inline-block mt-1 px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-warm-brown/10 text-warm-brown rounded-full">
            {activeThreadData.ratingTier} GR Rated
          </span>
        </div>

        {/* Expertise tags */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Expertise</h4>
          <div className="flex flex-wrap gap-1.5">
            {activeThreadData.expertise.map((tag) => (
              <span key={tag} className="px-2.5 py-1 text-[11px] font-medium bg-cream-100 text-charcoal/80 rounded-full border border-clay-muted/30">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="mb-6 p-4 bg-cream-50 rounded-xl border border-clay-muted/30">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Next Available</h4>
          <p className="text-sm font-medium text-charcoal mb-3">Tomorrow 2:00 PM</p>
          <button className="w-full py-2 text-sm font-semibold text-white bg-warm-brown rounded-lg hover:bg-warm-brown-dark transition-colors">
            Book Session
          </button>
        </div>

        {/* Session balance */}
        <div className="p-4 bg-cream-50 rounded-xl border border-clay-muted/30">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Session Balance</h4>
          <p className="text-sm font-medium text-charcoal mb-2">45 minutes remaining</p>
          <div className="w-full h-2 bg-clay-muted/40 rounded-full overflow-hidden">
            <div className="h-full bg-warm-brown rounded-full" style={{ width: "75%" }} />
          </div>
          <p className="text-[10px] text-text-muted mt-1.5">15 min used of 60 min total</p>
        </div>
      </aside>
    </div>
  );
}
