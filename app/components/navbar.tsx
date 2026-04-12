"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 transition-all duration-300 ${
        scrolled
          ? "h-11 bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/10"
          : "h-11 bg-transparent"
      }`}
    >
      <Link
        href="/"
        className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50 hover:text-white transition-colors duration-200"
      >
        Wanderlust
      </Link>

      <div className="flex items-center gap-4">
        {!loading && user && (
          <Link
            href="/collections"
            className="font-sans text-[11px] text-white/40 hover:text-white/80 transition-colors duration-200"
          >
            Collections
          </Link>
        )}

        {loading ? null : user ? (
          <button
            onClick={handleSignOut}
            className="font-sans text-[11px] text-white/30 hover:text-white/60 transition-colors duration-200"
          >
            Sign Out
          </button>
        ) : (
          <Link
            href="/login"
            className="font-sans text-[11px] font-medium text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-full px-3.5 py-1 transition-all duration-200"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
