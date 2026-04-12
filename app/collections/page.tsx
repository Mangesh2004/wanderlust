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
    <div className="min-h-screen bg-page-bg page-texture px-4 py-12 pt-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.3em] text-text-muted mb-2">
              WANDERLUST
            </p>
            <h1 className="font-display text-3xl md:text-4xl text-text-primary">
              My <span className="italic text-[#E07A3A]">Collections</span>
            </h1>
          </div>
          <a
            href="/"
            className="font-sans text-sm text-text-muted hover:text-text-secondary border border-border-default hover:border-border-hover rounded-lg px-4 py-2 transition-colors"
          >
            &larr; New Search
          </a>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-sans text-text-muted mb-4">
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
