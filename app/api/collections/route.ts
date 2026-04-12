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

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collections = await prisma.collection.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        destinations: {
          orderBy: { index: "asc" },
        },
      },
    });

    return Response.json(collections);
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
