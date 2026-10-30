export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  thumbnailLink?: string;
  folderName?: string | null;
  mediaType?: "image" | "video";
  videoStreamUrl?: string | null;
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
      throw new Error("Layanan Google Drive belum dikonfigurasi di server (GOOGLE_DRIVE_API_KEY). Silakan hubungi admin sistem.");
    }

    const PHOTO_AND_RAW_EXTENSIONS = new Set([
      // Standard raster & web images
      "jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif", "heic", "heif", "avif",
      // Camera RAW formats
      "cr2", "cr3", "crw",       // Canon
      "arw", "srf", "sr2",       // Sony
      "nef", "nrw",             // Nikon
      "dng",                    // Adobe / Leica / DJI / Pentax
      "raf",                    // Fujifilm
      "rw2", "raw",             // Panasonic Lumix
      "orf",                    // Olympus / OM System
      "pef", "ptx",             // Pentax
      "srw",                    // Samsung
      "3fr",                    // Hasselblad
      "iiq",                    // Phase One
      "gpr",                    // GoPro
      "rwl",                    // Leica
      "kdc", "dcr",             // Kodak
      "mef", "mos",             // Mamiya / Leaf
    ]);

    const VIDEO_EXTENSIONS = new Set([
      "mp4", "mov", "m4v", "avi", "mkv", "webm", "wmv", "3gp", "flv", "mts", "m2ts"
    ]);

    const isVideoFile = (file: { name?: string; mimeType?: string }): boolean => {
      if (file.mimeType && file.mimeType.startsWith("video/")) return true;
      if (file.name) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext && VIDEO_EXTENSIONS.has(ext)) return true;
      }
      return false;
    };

    const isPhotoOrRawFile = (file: { name?: string; mimeType?: string; imageMediaMetadata?: unknown }): boolean => {
      if (file.mimeType === "application/vnd.google-apps.folder") return false;
      if (file.mimeType && file.mimeType.startsWith("image/")) return true;
      if (file.imageMediaMetadata && typeof file.imageMediaMetadata === "object") return true;

      if (file.name) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext && PHOTO_AND_RAW_EXTENSIONS.has(ext)) {
          return true;
        }
      }
      return false;
    };

    const getPhotoMimeType = (fileName: string, originalMime?: string): string => {
      if (originalMime && originalMime !== "application/octet-stream" && originalMime.startsWith("image/")) {
        return originalMime;
      }
      const ext = fileName.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "png":
          return "image/png";
        case "webp":
          return "image/webp";
        case "cr2":
          return "image/x-canon-cr2";
        case "cr3":
          return "image/x-canon-cr3";
        case "arw":
          return "image/x-sony-arw";
        case "nef":
          return "image/x-nikon-nef";
        case "dng":
          return "image/x-adobe-dng";
        case "raf":
          return "image/x-fuji-raf";
        case "rw2":
          return "image/x-panasonic-rw2";
        case "orf":
          return "image/x-olympus-orf";
        default:
          return originalMime || "image/jpeg";
      }
    };

    interface FolderQueueItem {
      id: string;
      name?: string;
    }

    const foldersToScan: FolderQueueItem[] = [{ id: folderId, name: undefined }];
    const scannedFolders = new Set<string>();
    const allFiles: any[] = [];

    while (foldersToScan.length > 0 && allFiles.length < limit) {
      const currentFolder = foldersToScan.shift()!;
      if (scannedFolders.has(currentFolder.id)) continue;
      scannedFolders.add(currentFolder.id);

      let pageToken: string | undefined = undefined;

      do {
        // Query items inside current folder (excluding trashed)
        const query = encodeURIComponent(`'${currentFolder.id}' in parents and trashed = false`);
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
            // Only throw error if the root shared folder itself is inaccessible
            if (currentFolder.id === folderId) {
              throw new Error(
                "Folder Google Drive tidak dapat diakses atau masih berstatus Privat. Mohon buka Google Drive, klik Bagikan (Share), lalu ubah akses menjadi 'Siapa saja yang memiliki link' (Anyone with the link can view)."
              );
            }
            // Subfolder inaccessible, continue scanning others
            break;
          }
          throw new Error(
            `Gagal mengakses Google Drive (${errData?.error?.message || `HTTP ${res.status} ${res.statusText}`}). Pastikan link folder Google Drive benar dan dapat diakses publik.`
          );
        }

        const data = await res.json();
        if (data.files && Array.isArray(data.files)) {
          for (const item of data.files) {
            if (item.mimeType === "application/vnd.google-apps.folder") {
              // Queue subfolder to scan (cap at 25 folders to avoid infinite loops)
              if (scannedFolders.size + foldersToScan.length < 25) {
                const subfolderDisplayName = currentFolder.name ? `${currentFolder.name} / ${item.name}` : item.name;
                foldersToScan.push({ id: item.id, name: subfolderDisplayName });
              }
            } else if (isVideoFile(item)) {
              allFiles.push({
                ...item,
                folderName: currentFolder.name || null,
                mediaType: "video",
              });
              if (allFiles.length >= limit) {
                break;
              }
            } else if (isPhotoOrRawFile(item)) {
              allFiles.push({
                ...item,
                folderName: currentFolder.name || null,
                mediaType: "image",
              });
              if (allFiles.length >= limit) {
                break;
              }
            }
          }
        }

        pageToken = data.nextPageToken;
        if (allFiles.length >= limit) break;
      } while (pageToken);
    }

    return allFiles.map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mediaType === "video" 
        ? (file.mimeType || "video/mp4") 
        : getPhotoMimeType(file.name, file.mimeType),
      sizeBytes: Number(file.size) || (file.mediaType === "video" ? 50000000 : 25000000),
      width: file.imageMediaMetadata?.width || (file.mediaType === "video" ? 1920 : 6000),
      height: file.imageMediaMetadata?.height || (file.mediaType === "video" ? 1080 : 4000),
      thumbnailLink: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
      folderName: file.folderName || null,
      mediaType: (file.mediaType as "image" | "video") || "image",
      videoStreamUrl: file.mediaType === "video" ? `https://drive.google.com/file/d/${file.id}/preview` : null,
    }));
  }
}

export const googleDriveService: IGoogleDriveService = new HybridGoogleDriveService();

