import { tripInputSchema, type TripResult } from "@/lib/trip/schema";
import { runTripAgentStream } from "@/lib/trip/agent";
import { generateTripImage } from "@/lib/trip/tools/image-gen";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Auth gate
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Sign in to generate trips" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const input = tripInputSchema.parse(body);

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
          let tripResult: TripResult | null = null;

          for await (const event of runTripAgentStream(input)) {
            send(event as unknown as Record<string, unknown>);

            if (
              event.type === "result" &&
              event.data.success &&
              event.data.result
            ) {
              tripResult = event.data.result as unknown as TripResult;
            }
          }

          if (tripResult && tripResult.destinations.length > 0) {
            for (let i = 0; i < tripResult.destinations.length; i++) {
              send({
                type: "destination_complete",
                data: { index: i, destination: tripResult.destinations[i] },
              });
            }

            send({
              type: "status",
              data: { message: "Generating travel poster images..." },
            });
            await new Promise<void>((resolveAll) => {
              let done = 0;
              const total = tripResult!.destinations.length;

              tripResult!.destinations.forEach((dest, i) => {
                send({
                  type: "image_generating",
                  data: { index: i, name: dest.name },
                });
                generateTripImage(dest.imagePrompt)
                  .then((imageData) => {
                    send({
                      type: "image_complete",
                      data: { index: i, imageUrl: imageData || "" },
                    });
                  })
                  .catch(() => {
                    send({
                      type: "image_complete",
                      data: { index: i, imageUrl: "" },
                    });
                  })
                  .finally(() => {
                    done++;
                    if (done >= total) resolveAll();
                  });
              });

              setTimeout(() => resolveAll(), 60000);
            });
          }

          send({ type: "done", data: {} });
        } catch (error) {
          send({
            type: "error",
            data: {
              message:
                error instanceof Error ? error.message : "Stream error",
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
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
