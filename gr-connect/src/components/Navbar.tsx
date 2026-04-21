"use client";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-cream-bg/80 backdrop-blur-md border-b border-clay-muted/40"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-charcoal rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-sm">GR</span>
          </div>
          <span className="font-serif text-xl font-semibold text-charcoal tracking-tight">
            Connect
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            Vision
          </Link>
          <Link
            href="/discover"
            className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            Find Experts
          </Link>
          <Link
            href="/hub"
            className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
          >
            Research Hub
          </Link>
          {isLoggedIn && (
            <Link
              href="/messages"
              className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
            >
              Messages
            </Link>
          )}
          {isLoggedIn && (
            <Link
              href="/dashboard"
              className="text-sm text-charcoal/70 hover:text-charcoal transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 group"
              >
                <div className="w-9 h-9 rounded-full bg-warm-brown/20 border-2 border-warm-brown/40 overflow-hidden group-hover:border-warm-brown transition-colors">
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="hidden md:block text-sm font-medium text-charcoal">
                  {user?.name?.split(" ")[0]}
                </span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-clay-muted/40 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-clay-muted/30">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-text-muted">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2.5 text-sm hover:bg-cream-100 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/messages"
                      className="block px-4 py-2.5 text-sm hover:bg-cream-100 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Messages
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-charcoal hover:text-warm-brown transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium px-5 py-2 bg-charcoal text-white rounded-full hover:bg-charcoal-light transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
