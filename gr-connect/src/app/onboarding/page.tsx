"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function OnboardingPage() {
  const { profile, updateUserProfile, user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [affiliation, setAffiliation] = useState("");
  const [bio, setBio] = useState("");
  const [orcid, setOrcid] = useState("");
  const [orcidStatus, setOrcidStatus] = useState<"idle" | "fetching" | "found" | "notfound">("idle");
  const [orcidData, setOrcidData] = useState<{ name: string; affiliation: string; topics: string[] } | null>(null);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [sdgs, setSdgs] = useState<number[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isExpert = profile?.role === "expert";

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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleOrcidFetch() {
    if (!orcid.trim() || !user) return;
    setOrcidStatus("fetching");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/researchers/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcid: orcid.trim(), firebase_uid: user.uid }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrcidData({ name: data.name, affiliation: data.affiliation, topics: data.topics });
        if (data.affiliation) setAffiliation(data.affiliation);
        setOrcidStatus("found");
      } else {
        setOrcidStatus("notfound");
      }
    } catch {
      setOrcidStatus("notfound");
    }
  }

  async function handleFinish() {
    setUploading(true);
    try {
      let photoURL = profile?.photoURL || null;
      if (photoFile && user) {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("uid", user.uid);
        const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          photoURL = data.url;
        }
      }
      await updateUserProfile({
        affiliation,
        bio,
        expertise,
        photoURL,
        onboardingComplete: true,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-bg flex items-center justify-center px-4 py-12">
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
          <p className="text-text-muted text-sm mt-2">
            Step {step} of {isExpert ? 3 : 2}
          </p>
          {/* Progress bar */}
          <div className="mt-4 h-1 bg-clay-muted/30 rounded-full max-w-xs mx-auto">
            <div
              className="h-1 bg-warm-brown rounded-full transition-all duration-500"
              style={{ width: `${(step / (isExpert ? 3 : 2)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-clay-muted/30 p-8">
          {/* Step 1 — Basic info */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h2 className="font-semibold text-charcoal text-lg">Basic Information</h2>

              {/* Photo upload */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-clay-muted/30 overflow-hidden flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-warm-brown">
                      {profile?.displayName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer text-sm font-medium text-warm-brown hover:underline">
                    Upload photo
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <p className="text-xs text-text-muted mt-0.5">JPG or PNG, max 5MB</p>
                </div>
              </div>

              {/* ORCID field — expert only */}
              {isExpert && (
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">
                    ORCID ID <span className="text-text-muted font-normal">(recommended)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={orcid}
                      onChange={(e) => { setOrcid(e.target.value); setOrcidStatus("idle"); }}
                      placeholder="e.g. 0000-0002-1825-0097"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleOrcidFetch}
                      disabled={!orcid.trim() || orcidStatus === "fetching"}
                      className="px-4 py-2.5 bg-warm-brown text-white text-sm font-medium rounded-xl hover:bg-warm-brown-dark transition-colors disabled:opacity-50 shrink-0"
                    >
                      {orcidStatus === "fetching" ? "..." : "Fetch"}
                    </button>
                  </div>
                  {orcidStatus === "found" && orcidData && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                      <p className="font-medium text-green-800">✓ Found: {orcidData.name}</p>
                      <p className="text-green-700 text-xs mt-0.5">{orcidData.affiliation}</p>
                      {orcidData.topics.length > 0 && (
                        <p className="text-green-600 text-xs mt-0.5">Topics: {orcidData.topics.slice(0, 3).join(", ")}</p>
                      )}
                    </div>
                  )}
                  {orcidStatus === "notfound" && (
                    <p className="mt-2 text-xs text-red-600">ORCID not found on OpenAlex. You can still continue manually.</p>
                  )}
                  <p className="text-xs text-text-muted mt-1.5">Your ORCID lets us fetch your real research data from OpenAlex automatically.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Institution / Affiliation
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="e.g. MIT, VIT Pune, Independent Researcher"
                  className="w-full px-4 py-2.5 rounded-xl border border-clay-muted/50 bg-cream-bg text-sm text-charcoal placeholder:text-text-muted/50 focus:outline-none focus:border-warm-brown transition-colors"
                />
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
                className="w-full py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors"
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
                  disabled={uploading}
                  className="flex-1 py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
                >
                  {isExpert ? "Continue" : uploading ? "Saving..." : "Finish"}
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-clay-muted/50 text-charcoal rounded-xl text-sm font-medium hover:bg-cream-bg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={uploading}
                  className="flex-1 py-3 bg-warm-brown text-white rounded-xl text-sm font-medium hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
                >
                  {uploading ? "Saving..." : "Finish"}
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
