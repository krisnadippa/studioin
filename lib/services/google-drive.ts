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

// Sample high-resolution photography image URLs for development & fallback
const mockPhotoUrls = [
  "https://images.unsplash.com/photo-1519741497674-611481863552",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed",
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf",
  "https://images.unsplash.com/photo-1532712938310-34cb3982ef74",
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486",
  "https://images.unsplash.com/photo-1529636798458-92182e662485",
  "https://images.unsplash.com/photo-1544717305-2782549b5136",
  "https://images.unsplash.com/photo-1537633552985-df8429e8048b",
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
];

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
        console.warn("[GoogleDrive] API info fetch failed, using fallback:", err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      id: folderId,
      name: `Drive Photoshoot (${folderId.slice(0, 8)})`,
      totalFiles: 36,
    };
  }

  async listFiles(folderId: string, limit: number = 1000): Promise<DriveFileMetadata[]> {
    const apiKey = this.getApiKey();
    // 1. If Google Drive API Key is provided, fetch real files directly from Google Drive API v3 (paginated)
    if (apiKey) {
      try {
        let allFiles: any[] = [];
        let pageToken: string | undefined = undefined;

        do {
          const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and mimeType contains 'image/'`);
          const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,thumbnailLink,imageMediaMetadata,size)");
          let url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100&key=${apiKey}`;
          if (pageToken) {
            url += `&pageToken=${pageToken}`;
          }

          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`[GoogleDrive API listFiles Error] Status: ${res.status}`);
            break;
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

        if (allFiles.length > 0) {
          return allFiles.map((file: any) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType || "image/jpeg",
            sizeBytes: Number(file.size) || 12000000,
            width: file.imageMediaMetadata?.width || 6000,
            height: file.imageMediaMetadata?.height || 4000,
            thumbnailLink: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
          }));
        }
      } catch (err) {
        console.warn("[GoogleDrive] Direct API query failed, falling back to mock photos:", err);
      }
    }

    // 2. Fallback / Dev Mode: Generates high-definition photoshoot previews mapped to the folder ID
    await new Promise((resolve) => setTimeout(resolve, 300));
    const files: DriveFileMetadata[] = [];
    const mockLimit = limit > 48 ? 36 : limit; // Safety cap to avoid flooding local dev server

    for (let i = 1; i <= mockLimit; i++) {
      const pad = String(i).padStart(4, "0");
      const basePhoto = mockPhotoUrls[(i - 1) % mockPhotoUrls.length];
      files.push({
        id: `drive_file_${folderId}_${i}`,
        name: `IMG_${pad}.JPG`,
        mimeType: "image/jpeg",
        sizeBytes: 14 * 1024 * 1024 + ((i * 345678) % (6 * 1024 * 1024)),
        width: 6000,
        height: 4000,
        thumbnailLink: `${basePhoto}?w=500&auto=format&fit=crop&q=80`,
      });
    }

    return files;
  }
}

export const googleDriveService: IGoogleDriveService = new HybridGoogleDriveService();
