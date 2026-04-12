/**
 * One-time migration: move base64 images from DB to Supabase Storage.
 * Run with: npx tsx scripts/migrate-images.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function migrate() {
  const destinations = await prisma.collectionDestination.findMany({
    where: {
      imageUrl: { startsWith: "data:" },
    },
    select: { id: true, collectionId: true, index: true, imageUrl: true },
  });

  console.log(`Found ${destinations.length} base64 images to migrate`);

  for (const dest of destinations) {
    if (!dest.imageUrl) continue;

    const match = dest.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.log(`  Skipping ${dest.id} — not a valid data URL`);
      continue;
    }

    const mimeType = match[1];
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const buffer = Buffer.from(match[2], "base64");
    const path = `migrated/${dest.collectionId}/${dest.index}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("trip-images")
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      console.error(`  FAIL ${dest.id}:`, uploadErr.message);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from("trip-images")
      .getPublicUrl(path);

    await prisma.collectionDestination.update({
      where: { id: dest.id },
      data: { imageUrl: urlData.publicUrl },
    });

    console.log(`  Migrated ${dest.id} → ${urlData.publicUrl}`);
  }

  console.log("Done!");
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
