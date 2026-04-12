import { cacheTag, cacheLife } from "next/cache";
import prisma from "@/lib/db";

export async function getCollections(userId: string) {
  "use cache";
  cacheTag("collections", `collections-${userId}`);
  cacheLife("minutes");

  return prisma.collection.findMany({
    where: { profileId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      destinations: {
        orderBy: { index: "asc" },
      },
    },
  });
}
