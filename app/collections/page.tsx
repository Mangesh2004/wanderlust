import { connection } from "next/server";
import { unauthorized } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getCollections } from "./get-collections";
import { CollectionsList } from "./collections-list";

export default async function CollectionsPage() {
  await connection();
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    unauthorized();
  }

  const collections = await getCollections(user.id);

  return (
    <div className="min-h-screen bg-[#0F0E0D] px-4 py-12 pt-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.3em] text-white/30 mb-2">
              WANDERLUST
            </p>
            <h1 className="font-display text-3xl md:text-4xl text-white">
              My <span className="italic text-[#E07A3A]">Collections</span>
            </h1>
          </div>
          <a
            href="/"
            className="font-sans text-sm text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-lg px-4 py-2 transition-colors"
          >
            ← New Search
          </a>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-sans text-white/40 mb-4">
              No saved collections yet.
            </p>
            <a
              href="/"
              className="inline-block bg-[#E07A3A] hover:bg-[#D4682B] text-white font-sans font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Start exploring
            </a>
          </div>
        ) : (
          <CollectionsList collections={collections} />
        )}
      </div>
    </div>
  );
}
