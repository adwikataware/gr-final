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
