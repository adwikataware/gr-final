"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

type Role = "seeker" | "expert";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle, loginWithEmail, profile } = useAuth();
  const router = useRouter();

  function redirectAfterLogin(firestoreRole?: string | null) {
    const resolvedRole = firestoreRole ?? role;
    if (resolvedRole === "expert") {
      router.push("/dashboard");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      redirectAfterLogin(profile?.role);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      redirectAfterLogin(profile?.role);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-bg px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
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

        {/* Role toggle */}
        <div className="flex rounded-xl bg-white border border-clay-muted/30 p-1 mb-6 shadow-sm">
          {(["seeker", "expert"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                role === r
                  ? "bg-warm-brown text-white shadow-sm"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {r === "seeker" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m1.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              {r === "seeker" ? "Knowledge Seeker" : "Researcher / Expert"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-clay-muted/30 p-8"
          >
            {/* Role label */}
            <div className={`mb-6 px-4 py-3 rounded-xl text-sm ${
              role === "expert"
                ? "bg-warm-brown/8 border border-warm-brown/20 text-warm-brown"
                : "bg-blue-50 border border-blue-100 text-blue-700"
            }`}>
              {role === "expert"
                ? "Signing in as a Researcher / Expert — manage your availability, sessions, and consultations."
                : "Signing in as a Knowledge Seeker — discover experts and book research consultations."}
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-clay-muted/50 rounded-xl text-sm font-medium text-charcoal hover:bg-cream-bg transition-colors disabled:opacity-50 mb-6"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-clay-muted/30" />
              <span className="text-xs text-text-muted">or sign in with email</span>
              <div className="flex-1 h-px bg-clay-muted/30" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : `Sign In as ${role === "expert" ? "Expert" : "Seeker"}`}
              </button>
            </form>

            <p className="text-center text-sm text-text-muted mt-6">
              Don&apos;t have an account?{" "}
              <Link href={`/signup?role=${role}`} className="text-warm-brown font-medium hover:underline">
                Sign up as {role === "expert" ? "Expert" : "Seeker"}
              </Link>
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
