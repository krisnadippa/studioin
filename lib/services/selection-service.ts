import { db } from "../db/store";
import { Selection, Photo } from "../db/types";

export interface SubmitSelectionInput {
  gallery_id: string;
  client_name: string;
  client_email?: string;
  client_notes?: string;
  selected_photo_ids: string[];
}

export class SelectionService {
  static async submitSelection(input: SubmitSelectionInput): Promise<Selection> {
    if (!input.selected_photo_ids || input.selected_photo_ids.length === 0) {
      throw new Error("Please select at least one photo before submitting.");
    }

    return db.updateSelectionsByGalleryId(input.gallery_id, input.selected_photo_ids, {
      client_name: input.client_name,
      client_email: input.client_email,
      client_notes: input.client_notes,
    });
  }

  static async getSelectionsForGallery(galleryId: string): Promise<Selection[]> {
    return db.getSelectionsByGalleryId(galleryId);
  }

  static async exportSelectionsAsText(photos: Photo[]): Promise<string> {
    return photos.map((p) => p.filename).join("\n");
  }

  static async exportSelectionsAsCSV(photos: Photo[]): Promise<string> {
    const headers = "Filename,Google_Drive_File_ID,Sort_Order\n";
    const rows = photos
      .map((p) => `"${p.filename}","${p.drive_file_id}",${p.sort_order}`)
      .join("\n");
    return headers + rows;
  }

  static async exportSelectionsAsJSON(photos: Photo[], selection?: Selection): Promise<string> {
    return JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        selection_id: selection?.id,
        client_name: selection?.client_name,
        client_notes: selection?.client_notes,
        total_selected: photos.length,
        photos: photos.map((p) => ({
          filename: p.filename,
          drive_file_id: p.drive_file_id,
          sort_order: p.sort_order,
        })),
      },
      null,
      2
    );
  }
}
