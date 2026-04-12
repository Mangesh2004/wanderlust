import { revalidateTag } from "next/cache";
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

    revalidateTag("collections");

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
  const take = limitParam ? Math.min(parseInt(limitParam, 10), 50) : undefined;

  try {
    const collections = await prisma.collection.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),
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
