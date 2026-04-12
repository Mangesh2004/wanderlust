"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth-provider";

export function NavLinks() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  return (
    <div className="hidden md:flex items-center gap-5">
      <NavLink href="/" active={pathname === "/"}>
        Home
      </NavLink>
      {!loading && user && (
        <NavLink href="/collections" active={pathname.startsWith("/collections")}>
          Collections
        </NavLink>
      )}
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative font-sans text-[12px] font-medium tracking-wide transition-all duration-200 hover:scale-105 hover:text-white hover:drop-shadow-[0_0_8px_rgba(224,122,58,0.3)] after:absolute after:bottom-[-4px] after:left-0 after:h-[1.5px] after:bg-[#E07A3A] after:transition-all after:duration-300 ${
        active
          ? "text-white after:w-full"
          : "text-white/50 after:w-0 hover:after:w-full"
      }`}
    >
      {children}
    </Link>
  );
}
