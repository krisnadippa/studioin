export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  thumbnailLink?: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  totalFiles: number;
}

export interface IGoogleDriveService {
  parseFolderId(urlOrId: string): string | null;
  getFolderInfo(folderId: string): Promise<DriveFolderInfo>;
  listFiles(folderId: string, limit?: number): Promise<DriveFileMetadata[]>;
}

export class HybridGoogleDriveService implements IGoogleDriveService {
  private getApiKey(): string | undefined {
    const key = process.env.GOOGLE_DRIVE_API_KEY;
    if (!key || key.includes("PASTE_API_KEY_ANDA_DI_SINI") || key.trim() === "") {
      return undefined;
    }
    return key.trim();
  }

  parseFolderId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== "string") return null;
    const trimmed = urlOrId.trim();

    // Match full drive URL: https://drive.google.com/drive/folders/xxxxx or https://drive.google.com/drive/u/0/folders/xxxxx
    const folderMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
      return folderMatch[1];
    }

    // Match query param id: https://drive.google.com/open?id=xxxxx or file/d/xxxxx
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }

    // If string is already an alphanumeric ID (at least 8 chars)
    if (/^[a-zA-Z0-9_-]{8,128}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  async getFolderInfo(folderId: string): Promise<DriveFolderInfo> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType&key=${apiKey}`
        );
        if (res.ok) {
          const data = await res.json();
          return {
            id: data.id || folderId,
            name: data.name || `Drive Folder (${folderId.slice(0, 8)})`,
            totalFiles: 0,
          };
        }
      } catch (err) {
        console.warn("[GoogleDrive] API info fetch failed:", err);
      }
    }

    return {
      id: folderId,
      name: `Drive Photoshoot (${folderId.slice(0, 8)})`,
      totalFiles: 0,
    };
  }

  async listFiles(folderId: string, limit: number = 1000): Promise<DriveFileMetadata[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("GOOGLE_DRIVE_API_KEY belum dikonfigurasi di environment server (.env.local / Vercel).");
    }

    let allFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      // Query image files in folder, ordered by name ascending
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType contains 'image/'`);
      const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,thumbnailLink,imageMediaMetadata,size)");
      let url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=name&fields=${fields}&pageSize=100&key=${apiKey}`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error(`[GoogleDrive API listFiles Error] Status: ${res.status}`, errData);
        if (res.status === 404 || res.status === 403) {
          throw new Error(
            "Folder Google Drive tidak ditemukan atau belum diset ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with the link can view). Silakan periksa izin sharing folder di Google Drive."
          );
        }
        throw new Error(
          `Google Drive API Error: ${errData?.error?.message || `HTTP ${res.status} ${res.statusText}`}`
        );
      }

      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        allFiles = [...allFiles, ...data.files];
      }
      pageToken = data.nextPageToken;

      if (allFiles.length >= limit) {
        allFiles = allFiles.slice(0, limit);
        break;
      }
    } while (pageToken);

    return allFiles.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType || "image/jpeg",
      sizeBytes: Number(file.size) || 12000000,
      width: file.imageMediaMetadata?.width || 6000,
      height: file.imageMediaMetadata?.height || 4000,
      thumbnailLink: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
    }));
  }
}

export const googleDriveService: IGoogleDriveService = new HybridGoogleDriveService();
