import { generateTravelPoster } from "@/lib/gemini/image-generator";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const imageData = await generateTravelPoster(prompt);

    if (!imageData) {
      return Response.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }

    return Response.json({ imageData });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      },
      { status: 500 }
    );
  }
}
