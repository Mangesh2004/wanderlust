"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-provider";
import { createSupabaseClient } from "@/lib/supabase/client";

export function AvatarDropdown() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown on route change (important with Activity preservation)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="hidden md:inline-block font-sans text-[11px] font-medium text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-full px-3.5 py-1 transition-all duration-200"
      >
        Sign In
      </Link>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const fullName = (user.user_metadata?.full_name as string) || "";
  const email = user.email || "";
  const initials =
    fullName
      ? fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : (email[0] || "?").toUpperCase();

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  };

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full transition-all duration-200 hover:ring-2 hover:ring-[#E07A3A]/40"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName || "Avatar"}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white/70">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-black/70 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl animate-fade-in origin-top-right">
          <div className="px-4 py-3 border-b border-white/10">
            {fullName && (
              <p className="font-sans text-sm text-white truncate">{fullName}</p>
            )}
            <p className="font-sans text-xs text-white/40 truncate">{email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/collections"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 font-sans text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              My Collections
            </Link>
          </div>
          <div className="border-t border-white/10 py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 font-sans text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
