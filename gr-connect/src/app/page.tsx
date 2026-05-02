"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
import ParticleWeb from "@/components/ParticleWeb";
import ScrollRevealText from "@/components/ScrollRevealText";
import MagneticButton from "@/components/MagneticButton";
import CountUp from "@/components/CountUp";
import { sdgData } from "@/data/mockData";

/* ------------------------------------------------------------------ */
/*  SVG ICONS (replacing all emojis)                                   */
/* ------------------------------------------------------------------ */

const IconAI = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
    <path d="M6 10a2 2 0 0 0-2 2v1a6 6 0 0 0 12 0v-1a2 2 0 0 0-2-2" />
    <circle cx="9" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="15" cy="6.5" r="0.5" fill="currentColor" />
    <path d="M12 17v4m-3-2h6" />
  </svg>
);

const IconMessage = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8M8 13h5" strokeLinecap="round" />
  </svg>
);

const IconVideo = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M16 12l6-4v8l-6-4z" />
  </svg>
);

const IconArrow = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-5 h-5 text-warm-brown flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconStar = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const IconGlobe = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  ANIMATION HELPERS                                                  */
/* ------------------------------------------------------------------ */

const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

/* ------------------------------------------------------------------ */
/*  ROTATING TEXT                                                      */
/* ------------------------------------------------------------------ */

function RotatingText() {
  const words = ["Global Impact", "Discovery", "Innovation", "Excellence"];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % words.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="inline-block relative h-[1.1em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[idx]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="inline-block text-warm-brown italic"
        >
          {words[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="overflow-hidden">
      <HeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <MarqueeStrip />
      <HowItWorksSection />
      <ExpandingShowcaseSection />
      <GRRatingSection />
      <SDGSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}

/* ================================================================== */
/*  HERO                                                               */
/* ================================================================== */

function HeroSection({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 0.06]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);

  return (
    <motion.section
      ref={containerRef}
      style={{ scale }}
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden"
    >
      <ParticleWeb
        particleCount={60}
        mouseRadius={160}
        mouseForce={0.02}
        lineMaxDist={120}
        speed={0.25}
      />

      {/* Floating orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[12%] left-[8%] w-80 h-80 rounded-full bg-warm-brown/10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0], x: [0, -12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[15%] right-[8%] w-96 h-96 rounded-full bg-accent-tan/15 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[50%] left-[55%] w-56 h-56 rounded-full bg-warm-brown/8 blur-2xl"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-clay-muted/50 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm font-medium text-charcoal/80">
                Now connecting 10,000+ researchers globally
              </span>
            </div>
          </motion.div>

          {/* Heading with rotating text */}
          <motion.h1
            variants={fadeUp}
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-medium leading-[1.06] tracking-[-0.02em] text-charcoal"
          >
            Connecting Intelligence
            <br />
            for <RotatingText />
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="max-w-xl mx-auto text-[17px] md:text-lg font-serif text-text-muted/80 leading-[1.8] tracking-normal"
          >
            Where leading researchers, domain experts, and innovators
            converge — bridging knowledge gaps through AI-powered
            consultations and meaningful collaboration.
          </motion.p>

          {/* Search bar */}
          <motion.div variants={fadeUp} className="max-w-xl mx-auto">
            <div className="flex items-center bg-white rounded-full shadow-lg shadow-charcoal/[0.04] border border-clay-muted/50 overflow-hidden pl-5 pr-1.5 py-1.5">
              <IconSearch />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, expertise, or researcher..."
                className="flex-1 ml-3 bg-transparent text-sm text-charcoal placeholder:text-text-muted/60 outline-none"
              />
              <MagneticButton strength={0.15}>
                <Link
                  href={`/discover${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
                  className="px-5 py-2.5 bg-charcoal text-white text-sm font-medium rounded-full hover:bg-charcoal-light transition-colors"
                >
                  Explore
                </Link>
              </MagneticButton>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <MagneticButton>
              <Link
                href="/discover"
                className="group inline-flex items-center gap-2 px-8 py-3.5 bg-charcoal text-white font-medium rounded-full hover:bg-charcoal-light transition-colors text-sm"
              >
                Find an Expert
                <IconArrow className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link
                href="/signup"
                className="px-8 py-3.5 border-2 border-charcoal/80 text-charcoal font-medium rounded-full hover:bg-charcoal hover:text-white transition-all text-sm"
              >
                Join as Expert
              </Link>
            </MagneticButton>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            variants={fadeUp}
            className="pt-8"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-text-muted/40"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Scroll to explore</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14m-7-7l7 7 7-7" />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ================================================================== */
/*  MARQUEE STRIP — infinite scroll of trust signals                  */
/* ================================================================== */

function MarqueeStrip() {
  const institutions = [
    "Massachusetts Institute of Technology",
    "Stanford University",
    "University of Oxford",
    "Harvard University",
    "University of Cambridge",
    "ETH Zurich",
    "IIT Bombay",
    "California Institute of Technology",
    "Imperial College London",
    "National University of Singapore",
    "University of Tokyo",
    "Tsinghua University",
  ];

  const items = [...institutions, ...institutions];

  return (
    <div className="py-6 border-y border-clay-muted/30 overflow-hidden">
      <div className="marquee-track">
        {items.map((name, i) => (
          <span
            key={i}
            className="mx-8 text-[15px] font-medium text-charcoal/20 whitespace-nowrap select-none"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  HOW IT WORKS (no emojis — SVG icons + step numbers)               */
/* ================================================================== */

function HowItWorksCard({
  step,
  index,
  scrollYProgress,
}: {
  step: { icon: React.ReactNode; number: string; title: string; subtitle: string; description: string };
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  // Final spread: left card goes left, right card goes right, center stays
  const xFinal = index === 0 ? -370 : index === 2 ? 370 : 0;

  // Stacked: cards sit on top of each other with slight vertical offset for depth
  const yStacked = index * 10;
  const rotStacked = index === 0 ? -3 : index === 2 ? 3 : 0;
  const scaleStacked = 1 - index * 0.03;

  // One-way animation: stacked at 0 → fully spread by 1
  // The entire 0→1 range maps to the scroll from section entering bottom
  // of viewport to section center reaching viewport center
  const x = useTransform(scrollYProgress, [0, 1], [0, xFinal]);
  const y = useTransform(scrollYProgress, [0, 1], [yStacked, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [rotStacked, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [scaleStacked, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);

  return (
    <motion.div
      style={{ x, y, rotate, scale, opacity, zIndex: 3 - index }}
      className="absolute group bg-white rounded-2xl p-8 border border-clay-muted/40 hover:border-warm-brown/30 hover:shadow-xl hover:shadow-warm-brown/[0.04] transition-colors duration-500 w-[340px] h-[330px]"
    >
      <div className="w-14 h-14 rounded-xl bg-cream-100 border border-clay-muted/30 flex items-center justify-center text-charcoal mb-6 group-hover:bg-warm-brown/10 group-hover:border-warm-brown/20 group-hover:text-warm-brown transition-all duration-300">
        {step.icon}
      </div>
      <h3 className="text-xl font-semibold text-charcoal mb-1">{step.title}</h3>
      <p className="text-sm font-medium text-warm-brown mb-3">{step.subtitle}</p>
      <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
    </motion.div>
  );
}

function HowItWorksSection() {
  const containerRef = useRef(null);
  const cardsRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: cardsRef,
    // 0 = cards top hits bottom of viewport (cards just peeking in)
    // 1 = cards top reaches 30% from top of viewport (cards comfortably centered)
    offset: ["start end", "start 30%"],
  });

  const steps = [
    {
      icon: <IconAI />,
      number: "01",
      title: "AI Research Chat",
      subtitle: "Free & Instant",
      description:
        "Start with an AI trained on the expert's published research, papers, and domain knowledge. Get instant answers, paper recommendations, and research direction.",
    },
    {
      icon: <IconMessage />,
      number: "02",
      title: "Premium Messaging",
      subtitle: "From $50/session",
      description:
        "Upgrade to direct text-based consultation. Share documents, get personalized feedback, and receive detailed written guidance from the expert.",
    },
    {
      icon: <IconVideo />,
      number: "03",
      title: "Video Session",
      subtitle: "From $100/session",
      description:
        "Book a face-to-face video session for deep-dive discussions, live problem-solving, methodology review, or collaboration planning.",
    },
  ];

  return (
    <section ref={containerRef} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-20"
        >
          <span className="label-xs text-warm-brown mb-3 block">
            How It Works
          </span>
          <ScrollRevealText
            as="h2"
            className="font-heading text-4xl md:text-5xl font-medium text-charcoal mb-4"
          >
            Three Layers of Access
          </ScrollRevealText>
          <p className="font-serif text-text-muted/80 max-w-xl mx-auto mt-4 text-[17px] leading-[1.7]">
            A progressive engagement funnel designed to match you with the right
            level of expert interaction for your needs.
          </p>
        </motion.div>

        {/* Cards container */}
        <div ref={cardsRef} className="hidden md:flex justify-center items-center relative h-[340px]">
          {steps.map((step, i) => (
            <HowItWorksCard
              key={step.title}
              step={step}
              index={i}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>

        {/* Mobile fallback: simple stack */}
        <div className="md:hidden flex flex-col gap-6">
          {steps.map((step) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              className="group relative bg-white rounded-2xl p-8 border border-clay-muted/40"
            >
              <div className="absolute top-4 right-6 text-[80px] font-serif font-bold text-charcoal/[0.03] leading-none select-none">
                {step.number}
              </div>
              <div className="w-14 h-14 rounded-xl bg-cream-100 border border-clay-muted/30 flex items-center justify-center text-charcoal mb-6">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-charcoal mb-1">{step.title}</h3>
              <p className="text-sm font-medium text-warm-brown mb-3">{step.subtitle}</p>
              <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  EXPANDING SHOWCASE — dark section with 3D layer scroller           */
/*  Researchers stacked in perspective, cycling on scroll               */
/* ================================================================== */

interface CarouselExpert {
  id: string;
  name: string;
  title: string;
  avatar: string;
  grRating: number;
}

function getDesignationShort(name: string, tierLabel: string, affiliation: string): string {
  if (/^Prof\.?/i.test(name)) return `Professor${affiliation ? ` at ${affiliation}` : ""}`;
  if (/^Dr\.?/i.test(name)) return `Researcher${affiliation ? ` at ${affiliation}` : ""}`;
  if (tierLabel === "Elite") return "Distinguished Researcher";
  if (tierLabel === "Premier") return "Senior Researcher";
  return "Researcher";
}

function LayerScroller() {
  const [experts, setExperts] = useState<CarouselExpert[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/discover?limit=10`)
      .then((r) => r.json())
      .then((data) => {
        const mapped: CarouselExpert[] = (data.researchers || []).map((r: {
          id: string; name: string; photo_url: string; gr_rating: number;
          tier_label: string; affiliation: string;
        }) => ({
          id: r.id,
          name: r.name,
          title: getDesignationShort(r.name, r.tier_label, r.affiliation),
          avatar: r.photo_url,
          grRating: Math.round(r.gr_rating * 10) / 10,
        }));
        setExperts(mapped);
        setActive(Math.floor(mapped.length / 2));
      })
      .catch(() => {});
  }, []);

  const count = experts.length;

  useEffect(() => {
    if (count === 0) return;
    const t = setInterval(() => setActive((p) => (p + 1) % count), 4000);
    return () => clearInterval(t);
  }, [count]);

  if (experts.length === 0) {
    return <div className="relative w-full h-[440px] flex items-center justify-center"><span className="text-white/30 text-sm">Loading researchers...</span></div>;
  }

  return (
    <div
      className="relative w-full h-[440px] flex items-center justify-center overflow-visible"
      style={{ perspective: "1200px" }}
    >
      {experts.map((expert, i) => {
        const diff = i - active;
        const absDiff = Math.abs(diff);
        const xOffset = diff * 220;
        const rotY = diff * -35;
        const sc = absDiff === 0 ? 1 : Math.max(0.7, 1 - absDiff * 0.08);
        const zOff = -absDiff * 80;
        const op = Math.max(0.3, 1 - absDiff * 0.2);
        const zi = 100 - absDiff;

        return (
          <motion.div
            key={expert.id}
            className="absolute cursor-pointer"
            animate={{ x: xOffset, rotateY: rotY, scale: sc, z: zOff, opacity: op }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
            style={{ zIndex: zi, transformStyle: "preserve-3d" }}
            onClick={() => setActive(i)}
          >
            <Link
              href={`/expert/${expert.id}`}
              className="group block w-[280px] rounded-2xl overflow-hidden border border-white/10 bg-[#111] shadow-2xl shadow-black/60 hover:border-warm-brown/30 transition-colors"
            >
              <div className="relative h-[340px] overflow-hidden">
                <img
                  src={expert.avatar}
                  alt={expert.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/15 mb-2">
                    <span className="text-[10px] font-bold text-warm-brown">GR</span>
                    <span className="text-sm font-bold text-white">{expert.grRating}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white leading-tight">{expert.name}</h3>
                  <p className="text-[11px] text-white/50 mt-0.5">{expert.title}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}

      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-[200]">
        {experts.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "bg-warm-brown w-8" : "bg-white/20 hover:bg-white/40 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ExpandingShowcaseSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "start 0.15"],
  });

  // Use only GPU-friendly transforms — no margin/layout changes
  const scaleX = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const scaleY = useTransform(scrollYProgress, [0, 1], [0.97, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const innerScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);

  return (
    <div ref={containerRef} className="relative">
      <motion.section
        style={{
          scaleX,
          scaleY,
          borderRadius,
          willChange: "transform, border-radius",
        }}
        className="relative bg-black overflow-hidden origin-center"
      >
        <motion.div style={{ scale: innerScale }}>
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
            <motion.div style={{ opacity: contentOpacity }}>
              {/* Top section: text + stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
                <div>
                  <span className="label-xs text-warm-brown mb-5 block">
                    Featured Experts
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-cream-bg leading-[1.12] mb-6">
                    Meet the minds shaping the future of research
                  </h2>
                  <p className="text-cream-bg/45 leading-relaxed max-w-lg mb-8">
                    Our curated network of world-class researchers spans 156
                    countries and every major discipline — each verified through
                    our rigorous GR Rating system.
                  </p>
                  <Link
                    href="/discover"
                    className="group inline-flex items-center gap-2 text-sm font-medium text-warm-brown hover:text-warm-brown-light transition-colors"
                  >
                    View all experts
                    <IconArrow className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-6 lg:pt-12">
                  {[
                    { value: 10000, suffix: "+", label: "Researchers Connected" },
                    { value: 156, suffix: "+", label: "Countries Represented" },
                    { value: 4200, suffix: "+", label: "Sessions Completed" },
                    { value: 98, suffix: "%", label: "Satisfaction Rate" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <CountUp
                        target={stat.value}
                        suffix={stat.suffix}
                        className="text-3xl md:text-4xl font-serif font-bold text-cream-bg"
                      />
                      <p className="text-sm text-cream-bg/35 mt-2">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D Layer Scroller */}
              <LayerScroller />
            </motion.div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}

/* ================================================================== */
/*  GR RATING SPOTLIGHT                                                */
/* ================================================================== */

function GRRatingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const circumference = 2 * Math.PI * 88;
  const score = 96;
  const progress = (score / 100) * circumference;

  return (
    <section ref={ref} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* SVG circle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease }}
            className="flex justify-center"
          >
            <div className="relative w-72 h-72">
              {/* Decorative rings */}
              <motion.div
                animate={isInView ? { scale: [0.8, 1.05, 1], opacity: [0, 0.3, 0.1] } : {}}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="absolute inset-[-20px] rounded-full border border-warm-brown/20"
              />
              <motion.div
                animate={isInView ? { scale: [0.8, 1.08, 1], opacity: [0, 0.2, 0.05] } : {}}
                transition={{ duration: 1.8, delay: 0.7 }}
                className="absolute inset-[-40px] rounded-full border border-warm-brown/10"
              />

              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="88" fill="none" stroke="#e2e2d5" strokeWidth="6" />
                <motion.circle
                  cx="100" cy="100" r="88"
                  fill="none" stroke="#9D8461" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={isInView ? { strokeDashoffset: circumference - progress } : {}}
                  transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 1, duration: 0.5, ease }}
                >
                  <span className="text-6xl font-serif font-bold text-charcoal">{score}</span>
                  <p className="text-sm font-semibold text-warm-brown text-center mt-1">GR Rating</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted text-center mt-1">Top 1% Global</p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="space-y-6"
          >
            <motion.div variants={fadeUp}>
              <span className="label-xs text-warm-brown mb-3 block">Proprietary Metric</span>
              <ScrollRevealText as="h2" className="font-serif text-4xl md:text-5xl font-semibold text-charcoal mb-4">
                The GR Rating
              </ScrollRevealText>
            </motion.div>

            <motion.p variants={fadeUp} className="text-text-muted leading-relaxed">
              Our proprietary GR Rating is a comprehensive measure of a researcher&apos;s
              impact, combining citation metrics, h-index, publication quality, peer
              reviews, collaboration breadth, and real-world influence into a single,
              transparent score from 0 to 100.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              {["Publication Impact", "Citation Velocity", "Peer Reviews", "SDG Alignment"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-100 border border-clay-muted/40 text-sm text-charcoal"
                >
                  <IconCheck />
                  {item}
                </span>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-3 gap-6 pt-6 border-t border-clay-muted/50"
            >
              {[
                { value: 4250, suffix: "+", label: "Citations" },
                { value: 38, suffix: "", label: "H-Index" },
                { value: 156, suffix: "", label: "Publications" },
              ].map((stat) => (
                <div key={stat.label}>
                  <CountUp
                    target={stat.value}
                    suffix={stat.suffix}
                    className="text-2xl md:text-3xl font-serif font-bold text-charcoal"
                  />
                  <p className="text-sm text-text-muted mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="pt-4">
              <Link
                href="/gr-rating"
                className="inline-flex items-center gap-2 text-sm font-medium text-warm-brown hover:text-warm-brown-dark transition-colors"
              >
                See how it&apos;s calculated
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  SDG ALIGNMENT                                                      */
/* ================================================================== */

function SDGSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const sdgLogos = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    src: `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${String(i + 1).padStart(2, "0")}.jpg`,
  }));

  return (
    <section ref={ref} className="py-32 bg-cream-50 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-14"
        >
          <span className="label-xs text-warm-brown mb-3 block">UN SDGs</span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-heading text-4xl md:text-5xl font-medium text-charcoal mb-4"
          >
            Research Aligned with{" "}
            <span className="italic text-warm-brown">UN SDGs</span>
          </motion.h2>
          <p className="font-serif text-text-muted/80 max-w-lg mx-auto mt-4 text-[17px] leading-[1.7]">
            Discover experts whose work directly contributes to the
            United Nations Sustainable Development Goals.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"
        >
          {sdgLogos.map((sdg) => (
            <motion.button
              key={sdg.id}
              variants={fadeUp}
              whileHover={{ scale: 1.05, y: -4, transition: { duration: 0.25 } }}
              whileTap={{ scale: 0.97 }}
              className="group relative rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            >
              <img
                src={sdg.src}
                alt={`SDG ${sdg.id}`}
                className="w-full h-auto block"
                loading="lazy"
              />
            </motion.button>
          ))}

        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FAQ                                                                */
/* ================================================================== */

function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "What is GR Connect and how does it work?",
      a: "GR Connect is a platform that connects knowledge seekers with verified academic researchers and domain experts worldwide. You can start with a free AI-powered chat trained on the expert's research, then upgrade to premium text messaging or live video consultations for deeper engagement.",
    },
    {
      q: "How are experts verified on the platform?",
      a: "Every expert on GR Connect undergoes a rigorous verification process that includes institutional affiliation checks, publication record validation through ORCID and Google Scholar, peer endorsements, and ongoing quality monitoring through session feedback.",
    },
    {
      q: "What is the GR Rating and how is it calculated?",
      a: "The GR Rating is our proprietary metric (0-100) that holistically evaluates a researcher's impact. It combines traditional bibliometrics (citations, h-index) with modern indicators like interdisciplinary collaboration, mentorship quality, open-source contributions, and SDG alignment.",
    },
    {
      q: "Is the AI Research Chat really free?",
      a: "Yes, the AI Chat layer is completely free. It is an AI model fine-tuned on the expert's published work, allowing you to explore their research, get paper recommendations, and assess fit before committing to a paid consultation.",
    },
    {
      q: "How do SDG alignments benefit my research?",
      a: "SDG alignments help you discover experts whose work contributes to specific UN Sustainable Development Goals. This is especially valuable for grant applications, interdisciplinary projects, and research that aims to create measurable social impact.",
    },
  ];

  return (
    <section ref={ref} className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-14"
        >
          <span className="label-xs text-warm-brown mb-3 block">FAQ</span>
          <ScrollRevealText as="h2" className="font-serif text-4xl md:text-5xl font-semibold text-charcoal">
            Common Questions
          </ScrollRevealText>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="border border-clay-muted/40 rounded-xl overflow-hidden bg-white hover:border-clay-muted/60 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
              >
                <span className="text-sm font-medium text-charcoal pr-4 group-hover:text-warm-brown-dark transition-colors">
                  {faq.q}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <IconPlus />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-sm text-text-muted leading-relaxed border-t border-clay-muted/30 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  CTA                                                                */
/* ================================================================== */

function CTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.9", "start 0.3"],
  });
  const borderRadius = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const scaleX = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  return (
    <div ref={containerRef}>
      <motion.section
        style={{
          borderRadius,
          scaleX,
          willChange: "transform, border-radius",
        }}
        className="relative bg-black py-28 px-6 overflow-hidden origin-center"
      >
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="max-w-3xl mx-auto text-center"
          >
            <ScrollRevealText
              as="h2"
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-cream-bg mb-6"
            >
              Ready to Connect with the Brightest Minds?
            </ScrollRevealText>
            <p className="text-cream-bg/50 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of researchers, academics, and innovators already
              collaborating on GR Connect.
            </p>
            <MagneticButton>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 px-10 py-4 bg-warm-brown text-white font-semibold rounded-full hover:bg-warm-brown-dark transition-colors text-base shadow-lg shadow-warm-brown/20"
              >
                Join GR Connect
                <IconArrow className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </MagneticButton>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
