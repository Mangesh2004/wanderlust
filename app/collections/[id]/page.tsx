import { CollectionView } from "./collection-view";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CollectionView collectionId={id} />;
}
