"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const ease = [0.22, 1, 0.36, 1] as const;

const SDG_LIST = [
  { id: 1, label: "No Poverty" }, { id: 2, label: "Zero Hunger" },
  { id: 3, label: "Good Health" }, { id: 4, label: "Quality Education" },
  { id: 5, label: "Gender Equality" }, { id: 6, label: "Clean Water" },
  { id: 7, label: "Clean Energy" }, { id: 8, label: "Decent Work" },
  { id: 9, label: "Industry & Innovation" }, { id: 10, label: "Reduced Inequalities" },
  { id: 11, label: "Sustainable Cities" }, { id: 12, label: "Responsible Consumption" },
  { id: 13, label: "Climate Action" }, { id: 14, label: "Life Below Water" },
  { id: 15, label: "Life On Land" }, { id: 16, label: "Peace & Justice" },
  { id: 17, label: "Partnerships" },
];

interface ProfileForm {
  name: string;
  affiliation: string;
  bio: string;
  orcid: string;
  topics: string[];
  sdg_ids: number[];
}

interface OrcidPreview {
  name: string;
  affiliation: string;
  bio: string;
  photo_url: string;
  topics: string[];
  works_count: number;
  cited_by_count: number;
  h_index: number;
}

export default function ProfileEditPage() {
  const { user, profile, isLoggedIn, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>({
    name: "", affiliation: "", bio: "", orcid: "", topics: [], sdg_ids: [],
  });
  const [newTopic, setNewTopic] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [researcherId, setResearcherId] = useState<string | null>(null);

  // ORCID lookup
  const [orcidStatus, setOrcidStatus] = useState<"idle" | "fetching" | "found" | "notfound">("idle");
  const [orcidPreview, setOrcidPreview] = useState<OrcidPreview | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn || !user) { router.push("/login"); return; }

    // Load current profile from backend
    fetch(`${apiUrl}/api/v1/discover?limit=100`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const me = data?.researchers?.find((r: { firebase_uid: string }) => r.firebase_uid === user.uid);
        if (me) {
          setResearcherId(me.id);
          setForm({
            name: me.name || "",
            affiliation: me.affiliation || "",
            bio: me.bio || "",
            orcid: me.orcid || "",
            topics: me.topics || [],
            sdg_ids: me.sdg_ids || [],
          });
        } else {
          // Pre-fill from Firebase profile
          setForm((f) => ({ ...f, name: profile?.displayName || user.displayName || "" }));
        }
      })
      .catch(() => {});
  }, [loading, isLoggedIn, user, profile, apiUrl, router]);

  async function handleOrcidLookup() {
    const orcid = form.orcid.trim().replace("https://orcid.org/", "").trim();
    if (!orcid) return;
    setOrcidStatus("fetching");
    setOrcidPreview(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/researchers/orcid-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcid }),
      });
      if (!res.ok) { setOrcidStatus("notfound"); return; }
      const data: OrcidPreview = await res.json();
      setOrcidPreview(data);
      setOrcidStatus("found");
    } catch {
      setOrcidStatus("notfound");
    }
  }

  function applyOrcidData() {
    if (!orcidPreview) return;
    setForm((f) => ({
      ...f,
      name: orcidPreview.name || f.name,
      affiliation: orcidPreview.affiliation || f.affiliation,
      bio: orcidPreview.bio || f.bio,
      topics: orcidPreview.topics.length > 0 ? orcidPreview.topics : f.topics,
    }));
    setOrcidStatus("idle");
    setOrcidPreview(null);
  }

  function toggleSdg(id: number) {
    setForm((f) => ({
      ...f,
      sdg_ids: f.sdg_ids.includes(id)
        ? f.sdg_ids.filter((s) => s !== id)
        : f.sdg_ids.length < 5 ? [...f.sdg_ids, id] : f.sdg_ids,
    }));
  }

  function addTopic() {
    const t = newTopic.trim();
    if (!t || form.topics.includes(t) || form.topics.length >= 8) return;
    setForm((f) => ({ ...f, topics: [...f.topics, t] }));
    setNewTopic("");
  }

  function removeTopic(t: string) {
    setForm((f) => ({ ...f, topics: f.topics.filter((x) => x !== t) }));
  }

  async function handleSave() {
    if (!user || saving) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`${apiUrl}/api/v1/researchers/sync-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          name: form.name,
          affiliation: form.affiliation,
          bio: form.bio,
          topics: form.topics,
          sdg_ids: form.sdg_ids,
          photo_url: "",
        }),
      });
      if (!res.ok) throw new Error("Save failed");

      // If ORCID provided, claim it too for full metrics
      if (form.orcid && user) {
        await fetch(`${apiUrl}/api/v1/researchers/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orcid: form.orcid, firebase_uid: user.uid }),
        }).catch(() => {});
      }

      setSaved(true);
      setTimeout(() => {
        if (researcherId) router.push(`/expert/${researcherId}`);
        else router.push("/discover");
      }, 1200);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-warm-brown border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-bg py-12">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>

          {/* Header */}
          <div className="mb-8">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-text-muted hover:text-charcoal transition-colors mb-6">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
              Back to profile
            </button>
            <h1 className="text-3xl font-serif font-semibold text-charcoal">Edit Your Profile</h1>
            <p className="text-text-muted mt-1.5 text-sm">Keep your profile accurate so seekers can find and connect with you.</p>
          </div>

          {/* ORCID Lookup Banner */}
          <div className="bg-warm-brown/8 border border-warm-brown/20 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-charcoal mb-1">Have an ORCID?</p>
            <p className="text-xs text-text-muted mb-3">Enter your ORCID to auto-fill your profile with verified data from OpenAlex — name, affiliation, topics, h-index, and citations.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.orcid}
                onChange={(e) => setForm((f) => ({ ...f, orcid: e.target.value }))}
                placeholder="e.g. 0000-0002-1825-0097"
                className="flex-1 px-3 py-2 text-sm border border-warm-brown/20 rounded-lg bg-white focus:outline-none focus:border-warm-brown"
              />
              <button onClick={handleOrcidLookup} disabled={orcidStatus === "fetching" || !form.orcid.trim()}
                className="px-4 py-2 bg-warm-brown text-white text-sm font-medium rounded-lg hover:bg-warm-brown-dark transition-colors disabled:opacity-50">
                {orcidStatus === "fetching" ? "Looking up..." : "Look Up"}
              </button>
            </div>
            {orcidStatus === "notfound" && (
              <p className="text-xs text-red-500 mt-2">No researcher found with this ORCID on OpenAlex.</p>
            )}
            {orcidStatus === "found" && orcidPreview && (
              <div className="mt-3 bg-white border border-green-200 rounded-lg p-4">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Found on OpenAlex</p>
                <div className="text-sm space-y-1">
                  <p><span className="text-text-muted">Name:</span> <span className="font-medium text-charcoal">{orcidPreview.name}</span></p>
                  <p><span className="text-text-muted">Affiliation:</span> <span className="font-medium text-charcoal">{orcidPreview.affiliation || "—"}</span></p>
                  <p><span className="text-text-muted">H-Index:</span> <span className="font-medium text-warm-brown">{orcidPreview.h_index}</span>
                    <span className="text-text-muted ml-4">Citations:</span> <span className="font-medium text-warm-brown">{orcidPreview.cited_by_count.toLocaleString()}</span>
                    <span className="text-text-muted ml-4">Papers:</span> <span className="font-medium text-warm-brown">{orcidPreview.works_count}</span>
                  </p>
                  {orcidPreview.topics.length > 0 && (
                    <p><span className="text-text-muted">Topics:</span> <span className="text-charcoal">{orcidPreview.topics.slice(0, 4).join(", ")}</span></p>
                  )}
                </div>
                <button onClick={applyOrcidData}
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                  Apply This Data to My Profile
                </button>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white border border-warm-brown/15 rounded-xl shadow-sm divide-y divide-warm-brown/10">

            {/* Basic Info */}
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">Basic Information</h2>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-warm-brown/20 rounded-lg focus:outline-none focus:border-warm-brown bg-cream-bg/50" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Institution / Affiliation</label>
                <input type="text" value={form.affiliation} onChange={(e) => setForm((f) => ({ ...f, affiliation: e.target.value }))}
                  placeholder="e.g. MIT, Harvard University"
                  className="w-full px-3 py-2.5 text-sm border border-warm-brown/20 rounded-lg focus:outline-none focus:border-warm-brown bg-cream-bg/50" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={4} placeholder="Describe your research background, expertise, and key contributions..."
                  className="w-full px-3 py-2.5 text-sm border border-warm-brown/20 rounded-lg focus:outline-none focus:border-warm-brown bg-cream-bg/50 resize-none" />
                <p className="text-[10px] text-text-muted mt-1">{form.bio.length}/500 characters</p>
              </div>
            </div>

            {/* Research Topics */}
            <div className="p-6 space-y-4">
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">Research Topics</h2>
              <p className="text-xs text-text-muted">Add up to 8 topics that best describe your research areas.</p>

              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {form.topics.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-brown/10 text-charcoal text-xs font-medium rounded-full border border-warm-brown/20">
                    {t}
                    <button onClick={() => removeTopic(t)} className="text-warm-brown/60 hover:text-warm-brown transition-colors">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                {form.topics.length === 0 && <span className="text-xs text-text-muted/50 italic">No topics added yet</span>}
              </div>

              {form.topics.length < 8 && (
                <div className="flex gap-2">
                  <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTopic()}
                    placeholder="Type a topic and press Enter"
                    className="flex-1 px-3 py-2 text-sm border border-warm-brown/20 rounded-lg focus:outline-none focus:border-warm-brown bg-cream-bg/50" />
                  <button onClick={addTopic}
                    className="px-4 py-2 bg-warm-brown/10 text-warm-brown text-sm font-medium rounded-lg hover:bg-warm-brown/20 transition-colors border border-warm-brown/20">
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* SDG Selection */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-charcoal uppercase tracking-wider">SDG Focus Areas</h2>
                <p className="text-xs text-text-muted mt-1">Select up to 5 UN Sustainable Development Goals your research contributes to.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SDG_LIST.map((sdg) => {
                  const active = form.sdg_ids.includes(sdg.id);
                  return (
                    <button key={sdg.id} onClick={() => toggleSdg(sdg.id)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${active ? "bg-warm-brown text-white border-warm-brown" : "bg-white text-charcoal border-warm-brown/15 hover:border-warm-brown/40"}`}>
                      <span className="text-[10px] opacity-60 block">{String(sdg.id).padStart(2, "0")}</span>
                      {sdg.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Save */}
          <div className="mt-6 flex items-center gap-4">
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="flex-1 bg-warm-brown hover:bg-warm-brown-dark text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm">
              {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}
            </button>
            <button onClick={() => router.back()}
              className="px-6 py-3 border border-warm-brown/20 text-charcoal text-sm font-medium rounded-xl hover:bg-warm-brown/5 transition-colors">
              Cancel
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
          {saved && <p className="mt-3 text-sm text-green-600 text-center font-medium">Profile saved! Redirecting...</p>}

        </motion.div>
      </div>
    </div>
  );
}
