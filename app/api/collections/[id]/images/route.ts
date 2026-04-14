import { revalidateTag } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import prisma from "@/lib/db";
import {
  generateCollectionImagesStream,
  type StoredDestination,
} from "@/lib/trip/agent";

export async function POST(
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

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      destinations: {
        orderBy: { index: "asc" },
      },
    },
  });

  if (!collection) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (collection.profileId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          /* stream may be closed */
        }
      };

      try {
        const storedDestinations = collection.destinations.map((dest) => ({
          id: dest.id,
          index: dest.index,
          imageUrl: dest.imageUrl,
          data: dest.data,
        })) as StoredDestination[];

        for await (const event of generateCollectionImagesStream(
          storedDestinations,
          user.id,
        )) {
          if (
            event.type === "image_complete" &&
            typeof event.data.index === "number"
          ) {
            const imageUrl =
              typeof event.data.imageUrl === "string" && event.data.imageUrl
                ? event.data.imageUrl
                : null;

            await prisma.collectionDestination.update({
              where: {
                collectionId_index: {
                  collectionId: id,
                  index: event.data.index,
                },
              },
              data: { imageUrl },
            });

            revalidateTag("collections", "max");
            revalidateTag(`collections-${user.id}`, "max");
          }

          send(event as unknown as Record<string, unknown>);
        }
      } catch (error) {
        send({
          type: "error",
          data: {
            message:
              error instanceof Error ? error.message : "Image stream error",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

