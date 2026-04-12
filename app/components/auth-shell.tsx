import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AuthProvider } from "./auth-provider";

async function AuthShellInner({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthShellInner>{children}</AuthShellInner>
    </Suspense>
  );
}
