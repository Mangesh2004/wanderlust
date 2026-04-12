import "server-only";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function refineImagePrompt(rawPrompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert photography prompt engineer. Rewrite the given prompt into a detailed photorealistic image generation prompt.

Rules:
- Output ONLY the rewritten prompt, nothing else
- Describe a real photograph, NOT a poster, illustration, painting, or cartoon
- NO text, titles, borders, frames, or overlays in the image
- Include: specific natural features, lighting conditions, camera specs (lens, angle), atmosphere
- Style: National Geographic, cinematic landscape photography, editorial travel photography
- 40-60 words max
- Make it feel like a real place photographed by a professional`,
        },
        {
          role: "user",
          content: rawPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim() || rawPrompt;
  } catch (error) {
    console.error("Prompt refinement failed, using raw prompt:", error);
    return rawPrompt;
  }
}

export async function generateTripImage(
  prompt: string,
): Promise<string | null> {
  try {
    const refinedPrompt = await refineImagePrompt(prompt);
    console.log("[image-gen] refined prompt:", refinedPrompt);

    const response = await genai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: refinedPrompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
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
