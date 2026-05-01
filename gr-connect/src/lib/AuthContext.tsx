"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { getOrCreateKeyPair } from "./crypto";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "seeker" | "expert" | null;
  onboardingComplete: boolean;
  affiliation?: string;
  expertise?: string[];
  bio?: string;
  availability?: boolean;
  hourlyRate?: number;
  publicKey?: string;
  createdAt?: unknown;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoggedIn: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string, role: "seeker" | "expert") => Promise<void>;
  signupWithOrcid: (orcid: string, role?: "seeker" | "expert") => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: null,
            onboardingComplete: false,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), { ...newProfile, createdAt: serverTimestamp() });
          setProfile(newProfile);
        }
        // Generate keypair if not already stored, publish public key to Firestore
        try {
          const { publicKey } = getOrCreateKeyPair(firebaseUser.uid);
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (!userDoc.data()?.publicKey) {
            await updateDoc(doc(db, "users", firebaseUser.uid), { publicKey });
          }
        } catch {
          // localStorage unavailable (SSR) — skip silently
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function loginWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signupWithEmail(email: string, password: string, name: string, role: "seeker" | "expert") {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name,
      photoURL: null,
      role,
      onboardingComplete: false,
    };
    await setDoc(doc(db, "users", cred.user.uid), { ...newProfile, createdAt: serverTimestamp() });
    setProfile(newProfile);
  }

  async function logout() {
    await signOut(auth);
    setProfile(null);
  }

  async function signupWithOrcid(orcid: string, role: "seeker" | "expert" = "expert"): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // First fetch researcher data from OpenAlex via our backend
      const res = await fetch(`${apiUrl}/api/v1/researchers/orcid-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcid: orcid.trim() }),
      });
      if (!res.ok) return { success: false, error: "ORCID not found on OpenAlex. Please check your ORCID ID." };
      const data = await res.json();

      // Create Firebase account with a derived email and deterministic password
      const email = `orcid.${orcid.replace(/-/g, "")}@grconnect.app`;
      // Password is deterministic so returning users can sign in without storing it
      const password = `orcid_${orcid.replace(/-/g, "")}_grconnect`;

      let firebaseUser;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = cred.user;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("email-already-in-use")) {
          // Already registered — sign them in with same deterministic password
          const cred2 = await signInWithEmailAndPassword(auth, email, password);
          firebaseUser = cred2.user;
        } else {
          throw err;
        }
      }

      await updateProfile(firebaseUser, {
        displayName: data.name,
        photoURL: data.photo_url || null,
      });

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: data.name,
        photoURL: data.photo_url || null,
        role,
        onboardingComplete: true,
        affiliation: data.affiliation || "",
        bio: data.bio || "",
        expertise: data.topics || [],
      };
      await setDoc(doc(db, "users", firebaseUser.uid), { ...newProfile, createdAt: serverTimestamp() });
      setProfile(newProfile);

      // Link Firebase UID to researcher record
      await fetch(`${apiUrl}/api/v1/researchers/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcid: orcid.trim(), firebase_uid: firebaseUser.uid }),
      });

      return { success: true };
    } catch {
      return { success: false, error: "Something went wrong. Please try again." };
    }
  }

  async function updateUserProfile(data: Partial<UserProfile>) {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    setProfile((prev) => prev ? { ...prev, ...data } : null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoggedIn: !!user,
      loading,
      loginWithGoogle,
      loginWithEmail,
      signupWithEmail,
      signupWithOrcid,
      logout,
      updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
