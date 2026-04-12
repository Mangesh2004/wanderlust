import type { User } from "@supabase/supabase-js";
import prisma from "@/lib/db";

export async function ensureProfile(user: User) {
  await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      displayName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    },
    update: {
      email: user.email!,
    },
  });
}
