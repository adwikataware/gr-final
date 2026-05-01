"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

type Role = "seeker" | "expert";

export default function LoginPage() {
  const [orcid, setOrcid] = useState("");
  const [orcidStatus, setOrcidStatus] = useState<"idle" | "loading" | "error">("idle");
  const [orcidError, setOrcidError] = useState("");
  const [googleLoading, setGoogleLoading] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const { loginWithGoogle, signupWithOrcid } = useAuth();
  const router = useRouter();

  async function handleGoogleLogin(role: Role) {
    setError("");
    setGoogleLoading(role);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(null);
    }
  }

  async function handleOrcidLogin(role: Role) {
    if (!orcid.trim()) return;
    setOrcidStatus("loading");
    setOrcidError("");
    const result = await signupWithOrcid(orcid.trim(), role);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setOrcidStatus("error");
      setOrcidError(result.error || "ORCID not found. Please check your ID.");
    }
  }

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );

  const OrcidIcon = () => (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm-1.368 17.678H8.476V8.978h2.156v8.7zm-1.078-9.9a1.248 1.248 0 1 1 0-2.496 1.248 1.248 0 0 1 0 2.496zm9.122 9.9h-2.154v-4.227c0-.804-.014-1.838-1.12-1.838-1.12 0-1.292.875-1.292 1.779v4.286h-2.154V8.978h2.067v.944h.029c.287-.545.989-1.12 2.035-1.12 2.178 0 2.58 1.433 2.58 3.298v5.578z"/>
    </svg>
  );

  const sections: { role: Role; label: string; desc: string }[] = [
    { role: "seeker", label: "Knowledge Seeker", desc: "Discover experts and book research consultations" },
    { role: "expert", label: "Researcher / Expert", desc: "Manage your profile, sessions and consultations" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-bg px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-warm-brown rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">GR</span>
            </div>
            <span className="font-serif text-2xl font-semibold text-charcoal">Connect</span>
          </Link>
          <p className="mt-3 text-text-muted text-sm">Welcome back — sign in to continue</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-center">
            {error}
          </div>
        )}

        {/* Two sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map(({ role, label, desc }) => (
            <div key={role} className="bg-white rounded-2xl shadow-sm border border-clay-muted/30 p-6 space-y-4">
              <div className="pb-3 border-b border-clay-muted/20">
                <h2 className="font-serif text-lg font-semibold text-charcoal">{label}</h2>
                <p className="text-xs text-text-muted mt-1">{desc}</p>
              </div>

              {/* Google */}
              <button
                onClick={() => handleGoogleLogin(role)}
                disabled={googleLoading !== null || orcidStatus === "loading"}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-clay-muted/50 rounded-xl text-sm font-medium text-charcoal hover:bg-cream-bg transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                {googleLoading === role ? "Signing in..." : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-clay-muted/30" />
                <span className="text-xs text-text-muted">or</span>
                <div className="flex-1 h-px bg-clay-muted/30" />
              </div>

              {/* ORCID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-700"><OrcidIcon /></span>
                  <span className="text-sm font-medium text-charcoal">Continue with ORCID</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orcid}
                    onChange={(e) => { setOrcid(e.target.value); setOrcidStatus("idle"); setOrcidError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleOrcidLogin(role)}
                    placeholder="0000-0002-1825-0097"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-green-700 transition-colors"
                  />
                  <button
                    onClick={() => handleOrcidLogin(role)}
                    disabled={!orcid.trim() || orcidStatus === "loading" || googleLoading !== null}
                    className="px-4 py-2.5 bg-green-700 text-white text-sm font-medium rounded-xl hover:bg-green-800 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {orcidStatus === "loading" ? "..." : "Go"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {orcidError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-red-600 text-center mt-3">{orcidError}</motion.p>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-text-muted mt-4">
          Don't have an ORCID?{" "}
          <a href="https://orcid.org/register" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">Get one free →</a>
        </p>

        <p className="text-center text-sm text-text-muted mt-3">
          New here?{" "}
          <Link href="/signup" className="text-warm-brown font-medium hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}
