import "server-only";
import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateTravelPoster(
  prompt: string
): Promise<string | null> {
  try {
    const response = await genai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: `Generate a beautiful vintage-style travel poster: ${prompt}`,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "3:4",
          imageSize: "1K",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}
