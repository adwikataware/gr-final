"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

type Role = "seeker" | "expert";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !institution) {
      setError("Please fill in all fields.");
      return;
    }

    if (!role) {
      setError("Please select a role to continue.");
      return;
    }

    const success = signup(name, email, password, role);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-bg overflow-y-auto">
      <div className="w-full min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.06)] border border-cream-200 p-8 sm:p-10">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2.5 mb-8">
              <div className="w-10 h-10 bg-charcoal rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm tracking-tight">
                  GR
                </span>
              </div>
              <span className="font-serif text-2xl font-semibold text-charcoal tracking-tight">
                Connect
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-serif text-2xl font-semibold text-charcoal text-center mb-1">
              Create your account
            </h1>
            <p className="text-sm text-text-muted text-center mb-8">
              Join the global research community
            </p>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Role selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-charcoal mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Seeker card */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole("seeker")}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                    role === "seeker"
                      ? "border-charcoal bg-warm-brown-light/30"
                      : "border-cream-200 bg-white hover:border-clay-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${
                        role === "seeker"
                          ? "bg-charcoal text-white"
                          : "bg-cream-100 text-text-muted"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-charcoal">
                      Seeker
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Student or early-career researcher looking for guidance
                  </p>
                  {role === "seeker" && (
                    <motion.div
                      layoutId="role-check"
                      className="absolute top-3 right-3 w-5 h-5 bg-charcoal rounded-full flex items-center justify-center"
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>

                {/* Expert card */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole("expert")}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                    role === "expert"
                      ? "border-charcoal bg-warm-brown-light/30"
                      : "border-cream-200 bg-white hover:border-clay-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${
                        role === "expert"
                          ? "bg-charcoal text-white"
                          : "bg-cream-100 text-text-muted"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-charcoal">
                      Expert
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Professor or researcher ready to mentor
                  </p>
                  {role === "expert" && (
                    <motion.div
                      layoutId="role-check"
                      className="absolute top-3 right-3 w-5 h-5 bg-charcoal rounded-full flex items-center justify-center"
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-charcoal mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className="w-full px-4 py-3 rounded-lg bg-cream-100 border border-cream-200 text-charcoal placeholder:text-text-muted/50 text-sm transition-colors duration-200 focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal/10"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-charcoal mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="w-full px-4 py-3 rounded-lg bg-cream-100 border border-cream-200 text-charcoal placeholder:text-text-muted/50 text-sm transition-colors duration-200 focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal/10"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-charcoal mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-4 py-3 rounded-lg bg-cream-100 border border-cream-200 text-charcoal placeholder:text-text-muted/50 text-sm transition-colors duration-200 focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal/10"
                />
              </div>

              {/* Institution */}
              <div>
                <label
                  htmlFor="institution"
                  className="block text-sm font-medium text-charcoal mb-1.5"
                >
                  Institution
                </label>
                <input
                  id="institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="University or organization"
                  className="w-full px-4 py-3 rounded-lg bg-cream-100 border border-cream-200 text-charcoal placeholder:text-text-muted/50 text-sm transition-colors duration-200 focus:outline-none focus:border-charcoal focus:ring-1 focus:ring-charcoal/10"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 rounded-full bg-charcoal text-white text-sm font-semibold hover:bg-charcoal-light transition-colors duration-200 cursor-pointer mt-2"
              >
                Create Account
              </button>
            </form>

            {/* Terms notice */}
            <p className="text-xs text-text-muted text-center mt-5 leading-relaxed">
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="text-warm-brown hover:text-warm-brown-dark transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-warm-brown hover:text-warm-brown-dark transition-colors"
              >
                Privacy Policy
              </Link>
            </p>

            {/* Login link */}
            <p className="text-center text-sm text-text-muted mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-warm-brown font-medium hover:text-warm-brown-dark transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
