import { generateInputSchema } from "@/lib/ai/schema";
import { orchestrate } from "@/lib/ai/agents/orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = generateInputSchema.parse(body);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const event of orchestrate(input)) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          const errorEvent = {
            event: "error",
            data: {
              message:
                error instanceof Error
                  ? error.message
                  : "Stream error occurred",
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
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
      {
        error:
          error instanceof Error ? error.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}
