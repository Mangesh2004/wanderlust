import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/ensure-profile";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  try {
    const body = await request.json();
    const {
      vibe,
      departureCity,
      travelDates,
      days,
      budget,
      travelWith,
      interests,
      destinations,
      imageUrls,
      title,
    } = body;

    const collection = await prisma.collection.create({
      data: {
        title: title ?? null,
        vibe,
        departureCity,
        travelDates,
        days,
        budget,
        travelWith,
        interests,
        profileId: user.id,
        destinations: {
          create: destinations.map(
            (dest: Record<string, unknown>, i: number) => ({
              index: i,
              data: dest,
              imageUrl: imageUrls?.[i] ?? null,
            }),
          ),
        },
      },
      include: { destinations: true },
    });

    return Response.json(collection, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save collection",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const take = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 50;
  const fields = url.searchParams.get("fields");

  try {
    if (fields === "summary") {
      // Lightweight: skip the heavy destination `data` JSON column
      const { data: collections, error } = await supabase
        .from("Collection")
        .select(`
          id, title, vibe, departureCity, travelDates, days, budget, travelWith, interests, createdAt,
          destinations:CollectionDestination(id, index, imageUrl)
        `)
        .eq("profileId", user.id)
        .order("createdAt", { ascending: false })
        .limit(take);

      if (error) throw error;
      return Response.json(collections ?? []);
    }

    // Full query — uses Supabase PostgREST (HTTP, no TCP pool)
    const { data: collections, error } = await supabase
      .from("Collection")
      .select(`
        id, title, vibe, departureCity, travelDates, days, budget, travelWith, interests, createdAt, updatedAt, profileId,
        destinations:CollectionDestination(id, collectionId, index, data, imageUrl, createdAt)
      `)
      .eq("profileId", user.id)
      .order("createdAt", { ascending: false })
      .limit(take);

    if (error) throw error;
    return Response.json(collections ?? []);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch collections",
      },
      { status: 500 },
    );
  }
}
