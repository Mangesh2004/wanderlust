"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

/**
 * OAuth must complete in the browser: PKCE stores the code verifier in client
 * storage. A Route Handler calling exchangeCodeForSession cannot see it →
 * bad_code_verifier. This page runs exchange on the same client that started signInWithOAuth.
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      const err = searchParams.get("error");
      const errDesc = searchParams.get("error_description");
      if (err) {
        const msg = errDesc?.replace(/\+/g, " ") ?? err;
        router.replace(`/login?error=${encodeURIComponent(msg)}`);
        return;
      }

      const code = searchParams.get("code");
      const next = searchParams.get("next") ?? "/";

      if (!code) {
        router.replace(
          `/login?error=${encodeURIComponent("Missing OAuth code")}`,
        );
        return;
      }

      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        return;
      }

      setMessage("Success — redirecting…");
      router.refresh();
      router.replace(next.startsWith("/") ? next : "/");
    };

    void run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-page-bg page-texture flex items-center justify-center px-4">
      <p className="font-sans text-sm text-text-muted">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page-bg page-texture flex items-center justify-center">
          <p className="font-sans text-sm text-text-muted">Loading…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
