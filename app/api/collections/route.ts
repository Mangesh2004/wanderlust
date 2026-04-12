import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/ensure-profile";
import { uploadBase64Image } from "@/lib/supabase/upload-image";
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

    // Upload base64 images to Supabase Storage in parallel
    const timestamp = Date.now();
    const uploadedUrls: Record<number, string | null> = {};
    if (imageUrls) {
      await Promise.all(
        Object.entries(imageUrls).map(async ([idx, base64Url]) => {
          const i = Number(idx);
          if (typeof base64Url === "string" && base64Url) {
            const path = `${user.id}/${timestamp}_${i}.png`;
            uploadedUrls[i] = await uploadBase64Image(supabase, base64Url, path);
          }
        }),
      );
    }

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
              imageUrl: uploadedUrls[i] ?? imageUrls?.[i] ?? null,
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
      const collections = await prisma.collection.findMany({
        where: { profileId: user.id },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true, title: true, vibe: true, departureCity: true, travelDates: true,
          days: true, budget: true, travelWith: true, interests: true, createdAt: true,
          destinations: { orderBy: { index: "asc" }, select: { id: true, index: true, imageUrl: true } },
        },
      });
      return Response.json(collections);
    }

    const collections = await prisma.collection.findMany({
      where: { profileId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      include: { destinations: { orderBy: { index: "asc" } } },
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
