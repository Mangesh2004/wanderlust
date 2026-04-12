import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { CollectionView } from "./collection-view";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      destinations: {
        orderBy: { index: "asc" },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  return <CollectionView collection={collection} />;
}
