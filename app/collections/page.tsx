"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../components/auth-provider";
import { CollectionsList } from "./collections-list";
import { useRouter } from "next/navigation";

interface CollectionSummary {
  id: string;
  title: string | null;
  vibe: string;
  departureCity: string;
  travelDates: string;
  days: number;
  budget: string;
  travelWith: string;
  interests: string[];
  destinations: { id: string; index: number; imageUrl: string | null }[];
  createdAt: string;
}

export default function CollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    fetch("/api/collections?fields=summary")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCollections(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border-default border-t-[#E07A3A] rounded-full animate-spin" />
          <p className="font-sans text-sm text-text-muted">Loading collections...</p>
        </div>
      </div>
    );
  }

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
