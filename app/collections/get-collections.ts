import { cacheTag, cacheLife } from "next/cache";
import prisma from "@/lib/db";

export async function getCollections(userId: string) {
  "use cache";
  cacheTag("collections", `collections-${userId}`);
  cacheLife("minutes");

  return prisma.collection.findMany({
    where: { profileId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      vibe: true,
      departureCity: true,
      travelDates: true,
      days: true,
      budget: true,
      travelWith: true,
      interests: true,
      createdAt: true,
      destinations: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          imageUrl: true,
        },
      },
    },
  });
}
