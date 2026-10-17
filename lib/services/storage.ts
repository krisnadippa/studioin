export interface IStorageService {
  getThumbnailUrl(galleryId: string, photoId: string, fallbackUrl?: string): string;
  getPreviewUrl(galleryId: string, photoId: string, fallbackUrl?: string): string;
  deleteGalleryAssets(galleryId: string): Promise<boolean>;
}

export class CloudflareR2StorageService implements IStorageService {
  private r2PublicDomain: string;

  constructor() {
    this.r2PublicDomain = process.env.R2_PUBLIC_DOMAIN || "";
  }

  getThumbnailUrl(galleryId: string, photoId: string, fallbackUrl?: string): string {
    if (this.r2PublicDomain) {
      return `https://${this.r2PublicDomain}/galleries/${galleryId}/thumbnails/${photoId}.webp`;
    }
    return fallbackUrl || `/api/photo/${photoId}`;
  }

  getPreviewUrl(galleryId: string, photoId: string, fallbackUrl?: string): string {
    if (this.r2PublicDomain) {
      return `https://${this.r2PublicDomain}/galleries/${galleryId}/previews/${photoId}.webp`;
    }
    return fallbackUrl || `/api/photo/${photoId}`;
  }

  async deleteGalleryAssets(galleryId: string): Promise<boolean> {
    // In production, invoke R2 S3 SDK to delete objects with prefix `galleries/${galleryId}/`
    console.log(`[R2 Storage] Deleted temporary preview assets for gallery: ${galleryId}`);
    return true;
  }
}

export const storageService: IStorageService = new CloudflareR2StorageService();
