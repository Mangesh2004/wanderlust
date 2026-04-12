import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upload a base64 data URL to Supabase Storage and return the public URL.
 * Returns null if the input is not a base64 data URL or upload fails.
 */
export async function uploadBase64Image(
  supabase: SupabaseClient,
  base64DataUrl: string,
  path: string,
): Promise<string | null> {
  // Skip if already a URL (not base64)
  if (!base64DataUrl.startsWith("data:")) {
    return base64DataUrl;
  }

  try {
    // Parse data URL: data:image/png;base64,iVBOR...
    const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    const { error } = await supabase.storage
      .from("trip-images")
      .upload(path, buffer, {
        contentType: mimeType,
      });

    if (error) {
      console.error("Image upload failed:", JSON.stringify(error));
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("trip-images")
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Image upload error:", err);
    return null;
  }
}
