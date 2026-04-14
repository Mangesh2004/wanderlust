import { tripInputSchema } from "@/lib/trip/schema";
import { runTripAgentStream } from "@/lib/trip/agent";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
          for await (const event of runTripAgentStream(input)) {
            send(event as unknown as Record<string, unknown>);
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
