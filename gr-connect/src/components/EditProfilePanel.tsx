"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const EXPERTISE_OPTIONS = [
  "Machine Learning", "Artificial Intelligence", "IoT", "Cybersecurity",
  "Biotechnology", "Climate Science", "Computational Biology", "Data Science",
  "Robotics", "NLP", "Computer Vision", "Quantum Computing",
  "Renewable Energy", "Public Health", "Economics", "Materials Science",
];

const SDG_LIST = [
  "No Poverty", "Zero Hunger", "Good Health", "Quality Education",
  "Gender Equality", "Clean Water", "Clean Energy", "Decent Work",
  "Industry & Innovation", "Reduced Inequalities", "Sustainable Cities",
  "Responsible Consumption", "Climate Action", "Life Below Water",
  "Life on Land", "Peace & Justice", "Partnerships",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EditProfilePanel({ open, onClose }: Props) {
  const { user, profile, updateUserProfile } = useAuth();

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [bio, setBio] = useState("");
  const [orcid, setOrcid] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [sdgs, setSdgs] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [orcidFetching, setOrcidFetching] = useState(false);
  const [orcidMsg, setOrcidMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const isExpert = profile?.role === "expert";

  // Pre-fill from current profile when panel opens
  useEffect(() => {
    if (!open || !user) return;
    setName(profile?.displayName || user.displayName || "");
    setAffiliation(profile?.affiliation || "");
    setBio(profile?.bio || "");
    setExpertise(profile?.expertise || []);
    setSaved(false);
    setError("");
    setOrcidMsg(null);

    // Load SDGs and ORCID from Firestore
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.sdg_ids) setSdgs(data.sdg_ids);
        if (data.orcid) setOrcid(data.orcid);
      }
    }).catch(() => {});
  }, [open, user, profile]);

  function toggleExpertise(tag: string) {
    setExpertise(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 6 ? [...prev, tag] : prev
    );
  }

  function toggleSdg(idx: number) {
    setSdgs(prev =>
      prev.includes(idx) ? prev.filter(s => s !== idx) : prev.length < 5 ? [...prev, idx] : prev
    );
  }

  async function fetchOrcidDetails() {
    const clean = orcid.trim().replace("https://orcid.org/", "").replace(/\/$/, "");
    if (!clean) { setOrcidMsg({ text: "Enter an ORCID ID first.", ok: false }); return; }
    setOrcidFetching(true);
    setOrcidMsg(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/orcid-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcid: clean }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setOrcidMsg({ text: err.detail || "No researcher found with this ORCID.", ok: false });
        return;
      }
      const data = await res.json();
      if (data.name) setName(data.name);
      if (data.affiliation) setAffiliation(data.affiliation);
      if (data.bio) setBio(data.bio);
      if (data.topics?.length) setExpertise(data.topics.slice(0, 6));
      setOrcidMsg({ text: `Found: ${data.name} — ${data.works_count ?? "?"} publications, h-index ${data.h_index ?? "?"}`, ok: true });
    } catch {
      setOrcidMsg({ text: "Failed to fetch ORCID details. Try again.", ok: false });
    } finally {
      setOrcidFetching(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const orcidClean = orcid.trim().replace("https://orcid.org/", "").replace(/\/$/, "");
      await updateUserProfile({ displayName: name, affiliation, bio, expertise });
      await setDoc(doc(db, "users", user.uid), { sdg_ids: sdgs, orcid: orcidClean }, { merge: true });

      // Sync to backend if expert
      if (isExpert) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await fetch(`${apiUrl}/api/v1/researchers/sync-google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebase_uid: user.uid,
            name,
            email: profile?.email || user.email || "",
            affiliation,
            bio,
            topics: expertise,
            sdg_ids: sdgs,
            photo_url: profile?.photoURL || "",
            orcid: orcid.trim().replace("https://orcid.org/", "").replace(/\/$/, ""),
          }),
        }).catch(() => {});
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 900);
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-clay-muted/30 shrink-0">
              <h2 className="font-serif text-lg font-semibold text-charcoal">Edit Profile</h2>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-bg transition-colors text-charcoal/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                  placeholder="Your full name"
                />
              </div>

              {/* Affiliation */}
              <div>
                <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">Institution / Affiliation</label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={e => setAffiliation(e.target.value)}
                  placeholder="e.g. MIT, VIT Pune, Independent Researcher"
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                />
              </div>

              {/* ORCID */}
              <div>
                <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">
                  ORCID iD
                  <span className="normal-case font-normal text-text-muted ml-1">— fetches your publication details</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orcid}
                    onChange={e => { setOrcid(e.target.value); setOrcidMsg(null); }}
                    placeholder="0000-0000-0000-0000"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={fetchOrcidDetails}
                    disabled={orcidFetching}
                    className="px-4 py-2.5 rounded-xl bg-warm-brown text-white text-xs font-semibold shrink-0 hover:bg-warm-brown-dark disabled:opacity-50 transition-colors"
                  >
                    {orcidFetching ? "..." : "Fetch"}
                  </button>
                </div>
                {orcidMsg && (
                  <p className={`mt-1.5 text-xs px-3 py-1.5 rounded-lg ${orcidMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {orcidMsg.text}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">Short Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about your research focus and interests..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors resize-none"
                />
              </div>

              {/* Expertise */}
              <div>
                <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">
                  Areas of Expertise <span className="normal-case font-normal text-text-muted">({expertise.length}/6)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPERTISE_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleExpertise(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        expertise.includes(tag)
                          ? "bg-warm-brown text-white border-warm-brown"
                          : "bg-cream-bg text-charcoal border-clay-muted/50 hover:border-warm-brown"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* SDGs — expert only */}
              {isExpert && (
                <div>
                  <label className="block text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1.5">
                    SDG Alignment <span className="normal-case font-normal text-text-muted">({sdgs.length}/5)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SDG_LIST.map((sdg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleSdg(idx + 1)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          sdgs.includes(idx + 1)
                            ? "bg-warm-brown text-white border-warm-brown"
                            : "bg-cream-bg text-charcoal border-clay-muted/50 hover:border-warm-brown"
                        }`}
                      >
                        SDG {idx + 1}: {sdg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-clay-muted/30 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                  saved
                    ? "bg-green-600 text-white"
                    : "bg-warm-brown text-white hover:bg-warm-brown-dark disabled:opacity-50"
                }`}
              >
                {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
