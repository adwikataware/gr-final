"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { currentUser } from "@/data/mockData";

type User = typeof currentUser | null;

const AuthContext = createContext<{
  user: User;
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string, password: string, role: string) => boolean;
  logout: () => void;
  isLoggedIn: boolean;
}>({
  user: null,
  login: () => false,
  signup: () => false,
  logout: () => {},
  isLoggedIn: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("gr-user");
    if (stored) {
      setUser(JSON.parse(stored));
      setIsLoggedIn(true);
    }
  }, []);

  const login = (email: string, password: string) => {
    // Hardcoded login - accept any credentials
    const u = { ...currentUser, email };
    setUser(u);
    setIsLoggedIn(true);
    localStorage.setItem("gr-user", JSON.stringify(u));
    return true;
  };

  const signup = (name: string, email: string, password: string, role: string) => {
    const u = { ...currentUser, name, email, role };
    setUser(u);
    setIsLoggedIn(true);
    localStorage.setItem("gr-user", JSON.stringify(u));
    return true;
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("gr-user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
