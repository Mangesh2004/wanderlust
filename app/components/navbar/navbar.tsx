"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavLinks } from "./nav-links";
import { AvatarDropdown } from "./avatar-dropdown";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "../theme-toggle";

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
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border border-[var(--glass-border)] shadow-lg shadow-[var(--glass-shadow)] transition-all duration-300 ${
        scrolled
          ? "bg-[var(--glass-bg-scrolled)] backdrop-blur-xl shadow-xl"
          : "bg-[var(--glass-bg)] backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center gap-6 px-5 py-2">
        {/* Left: Logo */}
        <Link
          href="/"
          className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-text-tertiary hover:text-text-primary transition-colors duration-200 whitespace-nowrap"
        >
          Wanderlust
        </Link>

        {/* Center: Nav links (desktop) */}
        <NavLinks />

        {/* Right: Theme toggle + Avatar or Sign In (desktop) + Mobile hamburger */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AvatarDropdown />
          <MobileMenu />
        </div>
      </div>
    </nav>
  );
}
