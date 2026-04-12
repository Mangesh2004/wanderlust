"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-provider";
import { createSupabaseClient } from "@/lib/supabase/client";

export function MobileMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  };

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-6 h-5 flex flex-col justify-between"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <span
          className={`block h-[1.5px] w-full bg-white/70 rounded transition-all duration-300 origin-center ${
            open ? "translate-y-[7.5px] rotate-45" : ""
          }`}
        />
        <span
          className={`block h-[1.5px] w-full bg-white/70 rounded transition-all duration-300 ${
            open ? "opacity-0 scale-x-0" : ""
          }`}
        />
        <span
          className={`block h-[1.5px] w-full bg-white/70 rounded transition-all duration-300 origin-center ${
            open ? "-translate-y-[7.5px] -rotate-45" : ""
          }`}
        />
      </button>

      {/* Slide-down panel */}
      <div
        className={`fixed top-16 inset-x-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl transition-all duration-300 z-50 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex flex-col p-4 gap-1">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 font-sans text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Home
          </Link>
          {!loading && user && (
            <Link
              href="/collections"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 font-sans text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Collections
            </Link>
          )}

          <div className="my-2 border-t border-white/10" />

          {!loading && user ? (
            <>
              <div className="px-3 py-2">
                {user.user_metadata?.full_name && (
                  <p className="font-sans text-sm text-white truncate">
                    {user.user_metadata.full_name as string}
                  </p>
                )}
                <p className="font-sans text-xs text-white/40 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-left px-3 py-2.5 font-sans text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 font-sans text-sm font-medium text-[#E07A3A] hover:text-[#E07A3A]/80 hover:bg-white/5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
