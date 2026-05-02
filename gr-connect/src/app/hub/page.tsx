"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { collaborationPosts, experts, currentUser } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Post {
  id: number;
  author: string;
  avatar: string;
  institution: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  time: string;
}

/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* ------------------------------------------------------------------ */
const navItems = [
  { label: "Scrolls Feed", icon: "feed", active: true },
  { label: "Projects", icon: "projects", active: false },
  { label: "My Network", icon: "network", active: false },
  { label: "Saved", icon: "saved", active: false },
];

const groups = [
  { name: "Computational Bio", members: 1240 },
  { name: "Climate Tech", members: 892 },
  { name: "Ethics in AI", members: 2105 },
];

const trendingTopics = [
  { tag: "#FederatedLearning", posts: 342 },
  { tag: "#CRISPRTherapeutics", posts: 218 },
  { tag: "#ClimateModeling", posts: 187 },
  { tag: "#QuantumComputing", posts: 156 },
  { tag: "#ResponsibleAI", posts: 134 },
];

const suggestedScholars = [
  { name: "Dr. Aiko Tanaka", institution: "University of Tokyo", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop&crop=face" },
  { name: "Dr. Marcus Webb", institution: "ETH Zurich", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=48&h=48&fit=crop&crop=face" },
  { name: "Dr. Priya Nair", institution: "IISc Bangalore", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=48&h=48&fit=crop&crop=face" },
];

/* ------------------------------------------------------------------ */
/* SVG icon helpers                                                    */
/* ------------------------------------------------------------------ */
const FeedIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
  </svg>
);

const ProjectsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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

const BookmarkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

const AttachIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="w-4 h-4 text-warm-brown" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const navIcons: Record<string, React.ReactNode> = {
  feed: <FeedIcon />,
  projects: <ProjectsIcon />,
  network: <NetworkIcon />,
  saved: <SavedIcon />,
};

/* ------------------------------------------------------------------ */
/* Post type badge colors                                              */
/* ------------------------------------------------------------------ */
function typeBadge(type: string) {
  switch (type) {
    case "Collab Call":
      return "bg-warm-brown/10 text-warm-brown";
    case "Snippet":
      return "bg-blue-50 text-blue-700";
    case "Review Request":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-cream-100 text-charcoal";
  }
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */
export default function HubPage() {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [composerText, setComposerText] = useState("");

  const toggleLike = (id: number) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-cream-50 overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT SIDEBAR                                                  */}
      {/* ============================================================ */}
      <aside className="w-64 shrink-0 border-r border-clay-muted/30 bg-white p-4 flex flex-col gap-6 overflow-y-auto">
        {/* Branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-warm-brown flex items-center justify-center">
            <span className="text-white font-bold text-sm">GR</span>
          </div>
          <span className="font-serif text-lg font-semibold text-charcoal tracking-tight">GR Connect</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
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
        <button className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white bg-warm-brown rounded-lg hover:bg-warm-brown-dark transition-colors">
          <PlusIcon />
          New Scroll
        </button>

        {/* Groups */}
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">Groups</h4>
          <div className="flex flex-col gap-1">
            {groups.map((g) => (
              <button
                key={g.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-charcoal/80 hover:bg-cream-100 transition-colors"
              >
                <span className="truncate">{g.name}</span>
                <span className="text-[10px] text-text-muted">{g.members}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* CENTER FEED                                                   */}
      {/* ============================================================ */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4">
          {/* Composer */}
          <div className="bg-white border border-clay-muted/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder="Share a research insight..."
                rows={2}
                className="flex-1 resize-none text-sm bg-cream-50 rounded-xl border border-clay-muted/30 p-3 focus:outline-none focus:ring-2 focus:ring-warm-brown/30 focus:border-warm-brown/50 placeholder:text-text-muted/60 transition-all"
              />
            </div>
            <div className="flex items-center justify-between mt-3 pl-13">
              <div className="flex items-center gap-2 ml-13">
                <button className="p-1.5 rounded hover:bg-cream-100 text-text-muted transition-colors">
                  <ImageIcon />
                </button>
                <button className="p-1.5 rounded hover:bg-cream-100 text-text-muted transition-colors">
                  <AttachIcon />
                </button>
              </div>
              <button
                disabled={!composerText.trim()}
                className="px-5 py-1.5 text-sm font-semibold text-white bg-charcoal rounded-lg hover:bg-charcoal-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="flex flex-col gap-4">
            {collaborationPosts.map((post: Post, index: number) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="bg-white border border-clay-muted/30 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  {/* Author row */}
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={post.avatar}
                      alt={post.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-charcoal truncate">{post.author}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold italic font-serif rounded-full ${typeBadge(post.type)}`}>
                          {post.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">{post.institution} &middot; {post.time}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-base font-bold text-charcoal mb-1.5">{post.title}</h3>
                  <p className="text-sm text-charcoal/80 leading-relaxed mb-3">{post.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.map((tag: string) => (
                      <span key={tag} className="px-2.5 py-0.5 text-[11px] font-medium bg-cream-100 text-warm-brown rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-6 pt-3 border-t border-clay-muted/20">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red-500 transition-colors"
                    >
                      <HeartIcon filled={likedPosts.has(post.id)} />
                      <span>{likedPosts.has(post.id) ? post.likes + 1 : post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-charcoal transition-colors">
                      <CommentIcon />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-text-muted hover:text-charcoal transition-colors">
                      <ShareIcon />
                      <span>Share</span>
                    </button>
                    <button className="ml-auto text-text-muted hover:text-charcoal transition-colors">
                      <BookmarkIcon />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
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
          <div className="flex flex-col gap-2">
            {trendingTopics.map((t) => (
              <button
                key={t.tag}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors"
              >
                <span className="text-sm font-medium text-warm-brown">{t.tag}</span>
                <span className="text-[10px] text-text-muted">{t.posts} posts</span>
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Scholars */}
        <div>
          <h4 className="text-sm font-semibold text-charcoal mb-3">Suggested Scholars</h4>
          <div className="flex flex-col gap-3">
            {suggestedScholars.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-clay-muted/20">
                <img
                  src={s.avatar}
                  alt={s.name}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-charcoal truncate">{s.name}</p>
                  <p className="text-[10px] text-text-muted truncate">{s.institution}</p>
                </div>
                <button className="shrink-0 text-[11px] font-semibold text-warm-brown px-3 py-1 border border-warm-brown/40 rounded-full hover:bg-warm-brown/10 transition-colors">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming conference */}
        <div className="rounded-xl bg-charcoal text-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warm-brown-light mb-2">Upcoming Event</p>
          <h4 className="text-sm font-semibold leading-snug mb-1">Global Research Summit 2026</h4>
          <p className="text-[11px] text-white/60 mb-3">June 12-14 &middot; Geneva, Switzerland</p>
          <p className="text-[11px] text-white/70 leading-relaxed mb-4">
            Join 5,000+ researchers for three days of keynotes, workshops, and networking at the premier cross-disciplinary conference.
          </p>
          <Link
            href="#"
            className="inline-block text-[11px] font-semibold px-4 py-2 bg-warm-brown text-white rounded-lg hover:bg-warm-brown-dark transition-colors"
          >
            Learn More
          </Link>
        </div>
      </aside>
    </div>
  );
}
