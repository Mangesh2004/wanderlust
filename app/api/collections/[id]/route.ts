import { createSupabaseServer } from "@/lib/supabase/server";
import prisma from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        destinations: {
          orderBy: { index: "asc" },
        },
      },
    });

    if (!collection) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json(collection);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch collection",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { profileId: true },
    });

    if (!collection) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (collection.profileId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.collection.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete collection",
      },
      { status: 500 },
    );
  }
}
