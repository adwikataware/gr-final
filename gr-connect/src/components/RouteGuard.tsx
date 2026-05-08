"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    }
  }, [isLoggedIn, loading, pathname, router]);

  if (loading) return null;
  if (!isLoggedIn && !PUBLIC_PATHS.includes(pathname)) return null;

  return <>{children}</>;
}
