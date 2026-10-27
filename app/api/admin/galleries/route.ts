import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";
import { GalleryService } from "@/lib/services/gallery-service";
import { db } from "@/lib/db/store";

export async function GET() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const galleries = await db.listGalleries(user.userId);
  const now = new Date().getTime();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

  // Calculate dashboard statistics
  let activeCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let pendingSelectionsCount = 0;

  for (const g of galleries) {
    const expTime = new Date(g.expires_at).getTime();
    if (g.status === "ready" || g.status === "processing" || g.status === "preparing") {
      activeCount++;
      if (expTime > now && expTime - now <= twoDaysMs) {
        expiringSoonCount++;
      }
    } else if (g.status === "expired") {
      expiredCount++;
    }

    const selections = await db.getSelectionsByGalleryId(g.id);
    if (selections.some((s) => s.status === "submitted")) {
      pendingSelectionsCount++;
    }
  }

  return NextResponse.json({
    galleries,
    stats: {
      total: galleries.length,
      active: activeCount,
      expiring_soon: expiringSoonCount,
      expired: expiredCount,
      pending_selections: pendingSelectionsCount,
    },
  });
}

export async function POST(request: Request) {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Check if user is restricted by super admin ──────────────────────────
  const adminUser = await db.getAdminById(user.userId);
  if (adminUser) {
    if (adminUser.is_restricted) {
      return NextResponse.json(
        {
          error: "ACCOUNT_RESTRICTED",
          message: "Your account has been restricted by the administrator. You cannot create new galleries at this time. Please contact the administrator for more information.",
        },
        { status: 403 }
      );
    }
    if (adminUser.gallery_limit !== null) {
      const existingGalleries = await db.listGalleries(user.userId);
      if (existingGalleries.length >= adminUser.gallery_limit) {
        return NextResponse.json(
          {
            error: "GALLERY_LIMIT_REACHED",
            message: `You have reached your gallery creation limit of ${adminUser.gallery_limit} galleries. Please contact the administrator to increase your limit.`,
          },
          { status: 403 }
        );
      }
    }
  }

  try {
    const body = await request.json();
    const { client_name, event_name, event_date, drive_folder_url, expiration_days, pin, max_selections, allow_download } = body;

    if (!client_name || !event_name || !drive_folder_url) {
      return NextResponse.json(
        { error: "Client Name, Event Name, and Google Drive Folder URL are required." },
        { status: 400 }
      );
    }

    const gallery = await GalleryService.createGallery({
      admin_id: user.userId,
      client_name,
      event_name,
      event_date,
      drive_folder_url,
      expiration_days: Number(expiration_days) || 3,
      pin,
      max_selections: Number(max_selections) || 0,
      allow_download: !!allow_download,
    });

    return NextResponse.json({ success: true, gallery });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create gallery";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
