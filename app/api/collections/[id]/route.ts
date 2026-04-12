import { createSupabaseServer } from "@/lib/supabase/server";
import prisma from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // Use Supabase PostgREST — HTTP-based, no TCP connection pool needed
    const supabase = await createSupabaseServer();

    const { data: collection, error } = await supabase
      .from("Collection")
      .select(`
        id, title, vibe, departureCity, travelDates, days, budget, travelWith, interests, createdAt, updatedAt, profileId,
        destinations:CollectionDestination(id, collectionId, index, data, imageUrl, createdAt)
      `)
      .eq("id", id)
      .single();

    if (error || !collection) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Sort destinations by index
    collection.destinations?.sort(
      (a: { index: number }, b: { index: number }) => a.index - b.index,
    );

    return Response.json(collection);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch collection",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { profileId: true },
    });

    if (!collection) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (collection.profileId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.collection.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete collection",
      },
      { status: 500 },
    );
  }
}
