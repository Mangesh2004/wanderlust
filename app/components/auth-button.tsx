"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { AuthModal } from "./auth-modal";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="font-sans text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-4 py-2 transition-colors"
        >
          Sign In
        </button>
        <AuthModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <span className="font-sans text-sm text-white/50 truncate max-w-[180px]">
        {user.email}
      </span>
      <button
        onClick={handleSignOut}
        className="font-sans text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
