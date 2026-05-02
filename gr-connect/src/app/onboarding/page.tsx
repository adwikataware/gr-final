"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

interface OrcidData {
  name: string;
  affiliation: string;
  topics: string[];
  bio: string;
  works_count: number;
  cited_by_count: number;
  h_index: number;
  claimed_seed?: boolean;
}

export default function OnboardingPage() {
  const { profile, updateUserProfile, user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [affiliation, setAffiliation] = useState("");
  const [bio, setBio] = useState("");
  const [orcid, setOrcid] = useState("");
  const [orcidStatus, setOrcidStatus] = useState<"idle" | "fetching" | "found" | "notfound" | "taken">("idle");
  const [orcidData, setOrcidData] = useState<OrcidData | null>(null);
  const [claimedProfile, setClaimedProfile] = useState<OrcidData | null>(null); // seed profile found
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [sdgs, setSdgs] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isExpert = profile?.role === "expert";
  const totalSteps = isExpert ? 3 : 2;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-bg">
        <div className="w-8 h-8 border-2 border-warm-brown border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function toggleExpertise(tag: string) {
    setExpertise((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 6 ? [...prev, tag] : prev
    );
  }

  function toggleSdg(idx: number) {
    setSdgs((prev) =>
      prev.includes(idx) ? prev.filter((s) => s !== idx) : prev.length < 5 ? [...prev, idx] : prev
    );
  }

  async function handleOrcidFetch() {
    if (!orcid.trim() || !user) return;
    setOrcidStatus("fetching");
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/researchers/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcid: orcid.trim(), firebase_uid: user.uid }),
      });

      if (res.status === 409) {
        setOrcidStatus("taken");
        return;
      }

      if (!res.ok) {
        setOrcidStatus("notfound");
        return;
      }

      const data = await res.json();
      const od: OrcidData = {
        name: data.name,
        affiliation: data.affiliation,
        topics: data.topics,
        bio: data.bio || `Researcher with ${data.works_count} publications and ${data.cited_by_count} citations.`,
        works_count: data.works_count,
        cited_by_count: data.cited_by_count,
        h_index: data.h_index,
        claimed_seed: data.claimed_seed,
      };
      setOrcidData(od);
      if (data.affiliation) setAffiliation(data.affiliation);
      if (data.bio) setBio(data.bio);
      if (data.topics?.length) setExpertise(data.topics.slice(0, 6));

      if (data.claimed_seed) {
        // Found a matching seed profile — show confirmation
        setClaimedProfile(od);
        setShowClaimConfirm(true);
      }

      setOrcidStatus("found");
    } catch {
      setOrcidStatus("notfound");
    }
  }

  function handleConfirmClaim() {
    setShowClaimConfirm(false);
    // Data already applied, just continue
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      // Sync to backend for experts who skipped ORCID (manual path)
      if (isExpert && !orcidData) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await fetch(`${apiUrl}/api/v1/researchers/sync-google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebase_uid: user.uid,
            name: profile?.displayName || user.displayName || "Researcher",
            email: profile?.email || user.email || "",
            affiliation,
            bio,
            topics: expertise,
            sdg_ids: sdgs,
            photo_url: profile?.photoURL || "",
          }),
        });
      }

      await updateUserProfile({
        affiliation,
        bio,
        expertise,
        onboardingComplete: true,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canProceedStep1 = true; // ORCID is optional — experts can skip and fill manually

  return (
    <div className="min-h-screen bg-cream-bg flex items-center justify-center px-4 py-12">
      {/* Claim confirmation modal */}
      <AnimatePresence>
        {showClaimConfirm && claimedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-semibold text-charcoal text-center mb-1">
                We found your profile!
              </h2>
              <p className="text-text-muted text-sm text-center mb-6">
                This ORCID matches an existing researcher profile. Confirm it's you to take ownership.
              </p>
              <div className="bg-cream-bg rounded-xl p-4 mb-6 space-y-2">
                <p className="font-semibold text-charcoal">{claimedProfile.name}</p>
                <p className="text-sm text-text-muted">{claimedProfile.affiliation}</p>
                <div className="flex gap-4 text-xs text-warm-brown font-medium pt-1">
                  <span>{claimedProfile.works_count} publications</span>
                  <span>{claimedProfile.cited_by_count.toLocaleString()} citations</span>
                  <span>h-index {claimedProfile.h_index}</span>
                </div>
              </div>
              <button
                onClick={handleConfirmClaim}
                className="w-full py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors"
              >
                Yes, this is my profile
              </button>
              <button
                onClick={() => { setShowClaimConfirm(false); setOrcidStatus("idle"); setOrcid(""); setOrcidData(null); setClaimedProfile(null); }}
                className="w-full py-2 mt-2 text-sm text-text-muted hover:text-charcoal transition-colors"
              >
                This is not me
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-warm-brown rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">GR</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-charcoal">
            Complete your profile
          </h1>
          <p className="text-text-muted text-sm mt-2">Step {step} of {totalSteps}</p>
          <div className="mt-4 h-1 bg-clay-muted/30 rounded-full max-w-xs mx-auto">
            <div
              className="h-1 bg-warm-brown rounded-full transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-clay-muted/30 p-8">

          {/* Step 1 — Basic info */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h2 className="font-semibold text-charcoal text-lg">Basic Information</h2>

              {/* ORCID field — expert only, now mandatory */}
              {isExpert && (
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">
                    ORCID ID
                    <span className="text-text-muted font-normal ml-1">(optional — skip to fill manually)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={orcid}
                      onChange={(e) => { setOrcid(e.target.value); setOrcidStatus("idle"); setOrcidData(null); }}
                      placeholder="e.g. 0000-0002-1825-0097"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleOrcidFetch}
                      disabled={!orcid.trim() || orcidStatus === "fetching"}
                      className="px-4 py-2.5 bg-warm-brown text-white text-sm font-medium rounded-xl hover:bg-warm-brown-dark transition-colors disabled:opacity-50 shrink-0"
                    >
                      {orcidStatus === "fetching" ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying
                        </span>
                      ) : "Verify"}
                    </button>
                  </div>

                  {orcidStatus === "found" && orcidData && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                      <p className="font-medium text-green-800">✓ Verified: {orcidData.name}</p>
                      <p className="text-green-700 text-xs mt-0.5">{orcidData.affiliation}</p>
                      <div className="flex gap-3 text-xs text-green-600 mt-1">
                        <span>{orcidData.works_count} publications</span>
                        <span>{orcidData.cited_by_count.toLocaleString()} citations</span>
                        <span>h-index {orcidData.h_index}</span>
                      </div>
                      {orcidData.claimed_seed && (
                        <p className="text-xs text-green-700 mt-1 font-medium">
                          ✓ Your existing researcher profile has been linked to your account.
                        </p>
                      )}
                    </div>
                  )}
                  {orcidStatus === "notfound" && (
                    <p className="mt-2 text-xs text-red-600">
                      ORCID not found on OpenAlex. Make sure your ORCID is linked to your publications at{" "}
                      <a href="https://orcid.org" target="_blank" rel="noopener noreferrer" className="underline">orcid.org</a>.
                    </p>
                  )}
                  {orcidStatus === "taken" && (
                    <p className="mt-2 text-xs text-red-600">
                      This ORCID is already linked to another account. If this is your profile, contact support.
                    </p>
                  )}

                  <p className="text-xs text-text-muted mt-1.5">
                    Entering your ORCID auto-fills your profile and adds a <span className="text-warm-brown font-medium">Verified</span> badge.
                    Don&apos;t have one?{" "}
                    <a href="https://orcid.org/register" target="_blank" rel="noopener noreferrer" className="text-warm-brown underline">
                      Register free
                    </a>{" "}or just skip and fill manually below.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Institution / Affiliation <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="e.g. MIT, VIT Pune, Independent Researcher"
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                />
                {orcidStatus === "found" && (
                  <p className="text-xs text-text-muted mt-1">Auto-filled from your ORCID — you can edit if needed.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Short Bio <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your research focus and interests..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors resize-none"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step 2 — Expertise */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <h2 className="font-semibold text-charcoal text-lg">Areas of Interest</h2>
                <p className="text-text-muted text-sm mt-1">Select up to 6 that apply to you</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map((tag) => (
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
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-clay-muted/50 text-charcoal rounded-xl text-sm font-medium hover:bg-cream-bg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => isExpert ? setStep(3) : handleFinish()}
                  disabled={saving}
                  className="flex-1 py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
                >
                  {isExpert ? "Continue" : saving ? "Saving..." : "Finish"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — SDGs (Expert only) */}
          {step === 3 && isExpert && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <h2 className="font-semibold text-charcoal text-lg">SDG Alignment</h2>
                <p className="text-text-muted text-sm mt-1">Which UN SDGs does your research address? (up to 5)</p>
              </div>
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
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-clay-muted/50 text-charcoal rounded-xl text-sm font-medium hover:bg-cream-bg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Finish"}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          You can update your profile anytime from your dashboard
        </p>
      </motion.div>
    </div>
  );
}
