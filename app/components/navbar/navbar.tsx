"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import { AvatarDropdown } from "./avatar-dropdown";
import { MobileMenu } from "./mobile-menu";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{ viewTransitionName: "site-header" }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border border-white/10 shadow-lg shadow-black/20 transition-all duration-300 ${
        scrolled
          ? "bg-black/60 backdrop-blur-xl shadow-xl"
          : "bg-white/[0.06] backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center gap-6 px-5 py-2">
        {/* Left: Logo */}
        <Link
          href="/"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50 hover:text-white transition-colors duration-200 whitespace-nowrap"
        >
          Wanderlust
        </Link>

        {/* Center: Nav links (desktop) */}
        <NavLinks />

        {/* Right: Avatar or Sign In (desktop) + Mobile hamburger */}
        <div className="flex items-center gap-3">
          <AvatarDropdown />
          <MobileMenu />
        </div>
      </div>
    </nav>
  );
}
