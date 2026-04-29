"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

type Role = "seeker" | "expert";

function SignupForm() {
  const searchParams = useSearchParams();
  const initialRole: Role = searchParams.get("role") === "expert" ? "expert" : "seeker";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signupWithEmail(email, password, name, role);
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/onboarding");
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
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-warm-brown rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">GR</span>
            </div>
            <span className="font-serif text-2xl font-semibold text-charcoal">Connect</span>
          </Link>
          <p className="mt-3 text-text-muted text-sm">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-clay-muted/30 p-8">
          {/* Google */}
          <button
            onClick={handleGoogleSignup}
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
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-clay-muted/30" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {(["seeker", "expert"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      role === r
                        ? "bg-warm-brown text-white border-warm-brown"
                        : "bg-cream-bg text-charcoal border-clay-muted/50 hover:border-warm-brown"
                    }`}
                  >
                    {r === "seeker" ? "Knowledge Seeker" : "Researcher / Expert"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
              />
            </div>
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
                placeholder="Min. 6 characters"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-warm-brown font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
