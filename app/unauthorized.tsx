"use client";

import { useState } from "react";
import { AuthModal } from "./components/auth-modal";

export default function Unauthorized() {
  const [showModal, setShowModal] = useState(true);

  return (
    <div className="min-h-screen bg-[#0F0E0D] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl text-white mb-3">
          Sign in required
        </h1>
        <p className="font-sans text-white/50 mb-6">
          You need to be signed in to access this page.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#E07A3A] hover:bg-[#D4682B] text-white font-sans font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Sign In
        </button>
      </div>
      <AuthModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
