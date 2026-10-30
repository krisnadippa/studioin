export interface Gallery {
  id: string;
  admin_id?: string | null;
  client_name: string;
  event_name: string;
  event_date: string;
  drive_folder_id: string;
  drive_folder_url: string;
  access_token: string;
  pin_hash: string | null;
  pin_code?: string | null; // Plaintext PIN for admin display
  has_pin: boolean;
  status: "preparing" | "processing" | "ready" | "failed" | "expired";
  total_photos: number;
  processed_photos: number;
  error_message?: string;
  expires_at: string; // ISO String (default 3 days from creation)
  preview_delete_at: string; // ISO String (default 7 days from creation)
  max_selections: number; // 0 means unlimited
  allow_download: boolean;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  gallery_id: string;
  drive_file_id: string;
  filename: string;
  mime_type: string;
  thumbnail_url: string;
  preview_url: string;
  width?: number;
  height?: number;
  sort_order: number;
  folder_name?: string | null;
  media_type?: "image" | "video";
  video_stream_url?: string | null;
  created_at: string;
}

export interface Selection {
  id: string;
  gallery_id: string;
  client_name: string;
  client_email?: string;
  client_notes?: string;
  submitted_at: string;
  status: "submitted" | "reviewed" | "exported";
  selected_photo_ids: string[];
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: "superadmin" | "admin";
  gallery_limit: number | null; // null = unlimited, 0 = blocked
  is_restricted: boolean;
  created_at: string;
}

export interface UserActivityStats {
  user: AdminUser;
  total_galleries: number;
  active_galleries: number;
  expired_galleries: number;
  total_selections: number;
  last_activity: string | null;
}
