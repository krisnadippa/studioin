"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { GalleryImage } from "@/components/gallery/GalleryImage";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckSquare,
  Trash2,
  Lock,
  Link as LinkIcon,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ZoomIn,
  Edit3,
  Loader2,
  Key,
  Folder,
  Film,
  Play,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { GalleryStatusBadge } from "@/components/admin/GalleryStatusBadge";
import { Gallery, Photo, Selection } from "@/lib/db/types";

export default function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [extending, setExtending] = useState(false);
  
  // Edit Gallery & Drive Sync Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editEventName, setEditEventName] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editDriveUrl, setEditDriveUrl] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editRemovePin, setEditRemovePin] = useState(false);
  const [editMaxSelections, setEditMaxSelections] = useState(0);
  const [editAllowDownload, setEditAllowDownload] = useState(false);
  const [editResyncDrive, setEditResyncDrive] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const openEditModal = () => {
    if (!gallery) return;
    setEditClientName(gallery.client_name || "");
    setEditEventName(gallery.event_name || "");
    setEditEventDate(gallery.event_date ? gallery.event_date.split("T")[0] : "");
    setEditDriveUrl(gallery.drive_folder_url || "");
    setEditPin("");
    setEditRemovePin(false);
    setEditMaxSelections(gallery.max_selections || 0);
    setEditAllowDownload(!!gallery.allow_download);
    setEditResyncDrive(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: editClientName,
          event_name: editEventName,
          event_date: editEventDate,
          drive_folder_url: editDriveUrl,
          pin: editPin,
          remove_pin: editRemovePin,
          max_selections: editMaxSelections,
          allow_download: editAllowDownload,
          resync_drive: editResyncDrive,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGallery(data.gallery);
        if (data.photos) {
          setPhotos(data.photos);
        }
        showToast("Gallery updated & synchronized successfully!");
        setIsEditModalOpen(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || "Failed to update gallery.", "error");
      }
    } catch {
      showToast("An error occurred while updating gallery.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Direct Re-sync from Google Drive
  const handleQuickResync = async () => {
    if (!gallery) return;
    setIsSyncingDrive(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resync_drive: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGallery(data.gallery);
        if (data.photos) {
          setPhotos(data.photos);
        }
        showToast(`Google Drive berhasil disinkronkan! (${data.photos?.length || 0} foto)`);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || "Gagal menyinkronkan foto dari Google Drive.", "error");
      }
    } catch {
      showToast("Terjadi kendala koneksi saat menyinkronkan Google Drive. Silakan coba lagi.", "error");
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDanger: boolean;
    onConfirm: () => void;
  } | null>(null);

  const openConfirmModal = (
    title: string,
    description: string,
    actionLabel: string,
    isDanger: boolean,
    onConfirm: () => void
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      description,
      actionLabel,
      isDanger,
      onConfirm,
    });
  };

  const fetchGalleryData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/galleries/${id}`);
      if (res.ok) {
        const data = await res.json();
        setGallery(data.gallery);
        setPhotos(data.photos || []);
        setSelections(data.selections || []);
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lightbox & Subfolder Filtering State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");

  const subfolders = useMemo(() => {
    const folders = new Set<string>();
    photos.forEach((p) => {
      if (p.folder_name && p.folder_name.trim() !== "") {
        folders.add(p.folder_name.trim());
      }
    });
    return Array.from(folders).sort();
  }, [photos]);

  const videoPhotos = useMemo(() => {
    return photos.filter((p) => p.media_type === "video");
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (selectedFolder === "all") return photos;
    if (selectedFolder === "__video__") return videoPhotos;
    return photos.filter((p) => (p.folder_name || "").trim() === selectedFolder);
  }, [photos, selectedFolder, videoPhotos]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, filteredPhotos.length]);

  useEffect(() => {
    fetchGalleryData();
  }, [id]);

  const copyClientUrl = () => {
    if (!gallery) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/gallery/${gallery.access_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExtend = () => {
    if (!gallery) return;
    openConfirmModal(
      "Extend Gallery Expiration",
      "Are you sure you want to extend this gallery's expiration by 3 days?",
      "Extend +3 Days",
      false,
      async () => {
        setExtending(true);
        try {
          const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ additional_days: 3 }),
          });
          if (res.ok) {
            fetchGalleryData();
            showToast("Gallery extended by +3 days successfully!");
          } else {
            showToast("Failed to extend gallery.", "error");
          }
        } catch {
          showToast("An error occurred while extending the gallery.", "error");
        } finally {
          setExtending(false);
          setConfirmModal(null);
        }
      }
    );
  };

  const handleDelete = () => {
    if (!gallery) return;
    openConfirmModal(
      "Delete Gallery",
      "Are you sure you want to delete this gallery? Client selections will be permanently removed. This action cannot be undone.",
      "Delete Gallery",
      true,
      async () => {
        try {
          const res = await fetch(`/api/admin/galleries/${gallery.id}`, { method: "DELETE" });
          if (res.ok) {
            router.push("/admin/galleries?deleted=true");
          } else {
            showToast("Failed to delete gallery.", "error");
          }
        } catch {
          showToast("An error occurred while deleting the gallery.", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col p-8 space-y-6">
        <div className="h-8 w-48 bg-zinc-200 animate-pulse rounded-lg" />
        <div className="h-48 bg-zinc-100 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[4/3] bg-zinc-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="p-16 text-center">
        <h2 className="text-lg font-bold text-zinc-900">Gallery Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">The gallery you requested does not exist or has been removed.</p>
        <Link
          href="/admin/galleries"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#114234] text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Galleries</span>
        </Link>
      </div>
    );
  }

  const clientUrl = typeof window !== "undefined" ? `${window.location.origin}/gallery/${gallery.access_token}` : `/gallery/${gallery.access_token}`;
  const totalSelected = selections.reduce((acc, s) => acc + s.selected_photo_ids.length, 0);

  return (
    <div className="flex-1 flex flex-col">
      <AdminTopNav
        title={gallery.client_name}
        description={`${gallery.event_name} • ${gallery.event_date}`}
      />

      <main className="p-6 sm:p-8 max-w-[1440px] w-full mx-auto space-y-8">
        
        {/* Top Back Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/admin/galleries"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Galleries List</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExtend}
              disabled={extending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{extending ? "Extending..." : "Extend +3 Days"}</span>
            </button>

            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#114234]" />
              <span>Edit Gallery</span>
            </button>

            <Link
              href={`/admin/galleries/${gallery.id}/selections`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] text-xs font-bold transition-all shadow-xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>View Selections ({totalSelected})</span>
            </Link>

            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Gallery Summary & Share Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Gallery Info */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status & Timing</span>
              <GalleryStatusBadge status={gallery.status} />
            </div>

            <div>
              <span className="text-xl font-bold text-zinc-950 block">{gallery.client_name}</span>
              <span className="text-xs text-zinc-500 block mt-0.5">{gallery.event_name}</span>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Photos:</span>
                <span className="font-bold text-zinc-900">{gallery.total_photos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Event Date:</span>
                <span className="font-semibold text-zinc-800">
                  {gallery.event_date ? new Date(gallery.event_date).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Expires At:</span>
                <span className="font-semibold text-zinc-800">
                  {new Date(gallery.expires_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Client PIN:</span>
                <span className="font-semibold text-zinc-800">
                  {gallery.has_pin ? (gallery.pin_code || "Protected") : "Public Link"}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100/50 pt-2 mt-2">
                <span className="text-zinc-400">Selection Limit:</span>
                <span className="font-semibold text-zinc-800">
                  {gallery.max_selections > 0 ? `${gallery.max_selections} Photos` : "Unlimited"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Downloads:</span>
                <span className="font-semibold text-zinc-800">
                  {gallery.allow_download ? "Allowed (HD)" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Client Access Link Share */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Client Proofing Link
            </span>

            <div>
              <p className="text-xs text-zinc-500 mb-2">
                Share this secure link with your client so they can review and submit selections:
              </p>
              <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                <input
                  type="text"
                  readOnly
                  value={clientUrl}
                  className="bg-transparent text-xs font-mono text-zinc-800 flex-1 truncate focus:outline-none"
                />
                <button
                  onClick={copyClientUrl}
                  className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors shrink-0"
                  title="Copy Link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">Token: {gallery.access_token}</span>
              <Link
                href={`/gallery/${gallery.access_token}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#114234] hover:underline"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Google Drive Source Connection */}
          <div className="bg-[#114234] text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#bef238] uppercase tracking-wider block">
                Google Drive Source
              </span>
              <button
                onClick={handleQuickResync}
                disabled={isSyncingDrive}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bef238] bg-[#0c2f25] hover:bg-[#071f18] px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Sync photos from Drive"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingDrive ? "animate-spin" : ""}`} />
                <span>{isSyncingDrive ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-sm font-semibold text-white block truncate">
                Folder ID: {gallery.drive_folder_id}
              </span>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Original full-resolution photos remain safe in your Google Drive storage.
              </p>
            </div>

            <div className="pt-2">
              <a
                href={gallery.drive_folder_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#185342] hover:bg-[#1f6350] text-[#bef238] text-xs font-semibold transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Google Drive Folder</span>
              </a>
            </div>
          </div>

        </div>

        {/* Photo Gallery Grid Preview */}
        <section className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-zinc-950">Photos Preview ({photos.length})</h3>
                {subfolders.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-[#114234]">
                    📁 {subfolders.length} Subfolder
                  </span>
                )}
                {videoPhotos.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
                    🎬 {videoPhotos.length} Video
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Real-time photos synchronized from Google Drive</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickResync}
                disabled={isSyncingDrive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#114234] hover:bg-[#0d3429] text-[#bef238] text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? "animate-spin" : ""}`} />
                <span>{isSyncingDrive ? "Syncing Drive..." : "Re-sync from Drive"}</span>
              </button>

              <button
                onClick={fetchGalleryData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Subfolder & Category Filter Tabs */}
          {(subfolders.length > 0 || videoPhotos.length > 0) && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => { setSelectedFolder("all"); setLightboxIndex(null); }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedFolder === "all"
                    ? "bg-[#114234] text-[#bef238] shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                }`}
              >
                <span>Semua File ({photos.length})</span>
              </button>

              {subfolders.map((folder) => {
                const count = photos.filter((p) => p.folder_name === folder).length;
                const isSelected = selectedFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => { setSelectedFolder(folder); setLightboxIndex(null); }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? "bg-[#114234] text-[#bef238] shadow-xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{folder} ({count})</span>
                  </button>
                );
              })}

              {videoPhotos.length > 0 && (
                <button
                  onClick={() => { setSelectedFolder("__video__"); setLightboxIndex(null); }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedFolder === "__video__"
                      ? "bg-purple-900 text-purple-200 shadow-xs"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video ({videoPhotos.length})</span>
                </button>
              )}
            </div>
          )}

          {filteredPhotos.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              Tidak ada file pada filter ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shadow-xs cursor-pointer hover:border-[#114234] hover:shadow-md transition-all duration-200"
                >
                  <GalleryImage
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    driveFileId={photo.drive_file_id}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    index={index}
                  />

                  {/* Badges: Folder & Video */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                    {photo.folder_name && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-black/60 text-white backdrop-blur-xs shadow-xs">
                        <Folder className="w-2.5 h-2.5 text-[#bef238]" />
                        <span className="truncate max-w-[90px]">{photo.folder_name}</span>
                      </span>
                    )}
                    {photo.media_type === "video" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-600/90 text-white backdrop-blur-xs shadow-xs">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>VIDEO</span>
                      </span>
                    )}
                  </div>

                  {/* Center hover indicator / play icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-2 bg-white/20 backdrop-blur-xs rounded-full text-white">
                      {photo.media_type === "video" ? (
                        <Play className="w-5 h-5 fill-white" />
                      ) : (
                        <ZoomIn className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[10px] font-mono truncate">
                    {photo.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Admin Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-fadeIn">
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs text-zinc-300 min-w-0">
              <span className="truncate max-w-[160px] sm:max-w-[300px] font-bold text-white" title={filteredPhotos[lightboxIndex].filename}>
                {filteredPhotos[lightboxIndex].filename}
              </span>
              {filteredPhotos[lightboxIndex].folder_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-sans font-semibold bg-emerald-500/20 text-[#bef238] border border-emerald-500/30">
                  <Folder className="w-3 h-3" />
                  <span>{filteredPhotos[lightboxIndex].folder_name}</span>
                </span>
              )}
              {filteredPhotos[lightboxIndex].media_type === "video" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-sans font-bold bg-purple-500/30 text-purple-200 border border-purple-500/40">
                  <Film className="w-3 h-3" />
                  <span>VIDEO</span>
                </span>
              )}
              <span className="text-zinc-600 shrink-0">•</span>
              <span className="shrink-0 text-zinc-400">
                {lightboxIndex + 1} of {filteredPhotos.length}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <a
                href={`/api/admin/galleries/${id}/download/${filteredPhotos[lightboxIndex].id}`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                title="Download original file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close lightbox"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Center View */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8">
            {/* Previous Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1))}
              className="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-colors z-20 cursor-pointer"
              aria-label="Previous file"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Preview (Video or Image) */}
            <div className="relative w-full h-full max-h-[82vh] flex items-center justify-center">
              {filteredPhotos[lightboxIndex].media_type === "video" ? (
                <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center">
                  <iframe
                    src={filteredPhotos[lightboxIndex].video_stream_url || `https://drive.google.com/file/d/${filteredPhotos[lightboxIndex].drive_file_id}/preview`}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title={filteredPhotos[lightboxIndex].filename}
                  />
                </div>
              ) : (
                <GalleryImage
                  src={filteredPhotos[lightboxIndex].preview_url}
                  alt={filteredPhotos[lightboxIndex].filename}
                  driveFileId={filteredPhotos[lightboxIndex].drive_file_id}
                  fill
                  priority
                  className="object-contain"
                  index={lightboxIndex}
                />
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-colors z-20 cursor-pointer"
              aria-label="Next file"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Bottom Info Bar */}
          <div className="p-4 text-center text-[11px] text-zinc-500">
            Use Left / Right arrow keys to navigate • Esc to close
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-100/80 flex flex-col space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.isDanger ? "bg-red-50 text-red-600" : "bg-emerald-50 text-[#114234]"
              }`}>
                {confirmModal.isDanger ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-400">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-98 cursor-pointer ${
                  confirmModal.isDanger 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-[#114234] hover:bg-[#0d3429]"
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Edit Gallery & Google Drive Sync Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-zinc-100 flex flex-col space-y-5 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#114234]/10 text-[#114234]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Edit Gallery Details</h3>
                  <p className="text-xs text-zinc-400">Update info & synchronize with Google Drive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-1 text-xs">
              {/* Client Name */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  placeholder="e.g. Andi & Sinta"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                />
              </div>

              {/* Event Name & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Event / Session Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    placeholder="e.g. Prewedding Photoshoot"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                  />
                </div>
              </div>

              {/* Google Drive Link */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1 flex items-center justify-between">
                  <span>Google Drive Folder Link / ID</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Pastikan akses link "Anyone with the link"</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editDriveUrl}
                    onChange={(e) => {
                      setEditDriveUrl(e.target.value);
                      setEditResyncDrive(true);
                    }}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                  />
                  <FolderOpen className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Mengubah link Google Drive akan otomatis memindai dan memperbarui seluruh daftar foto galeri.
                </p>
              </div>

              {/* Re-sync Checkbox */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#114234] block">Re-sync Google Drive Photos</span>
                  <span className="text-[10px] text-emerald-800/80 block">
                    Pindai ulang dan perbarui foto galeri dari Google Drive saat menyimpan.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editResyncDrive}
                  onChange={(e) => setEditResyncDrive(e.target.checked)}
                  className="w-4 h-4 text-[#114234] rounded focus:ring-[#114234] cursor-pointer"
                />
              </div>

              {/* PIN Settings */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1 flex items-center justify-between">
                  <span>Client Access PIN</span>
                  {gallery?.has_pin && (
                    <span className="text-[10px] text-emerald-600 font-semibold">Saat ini memiliki PIN</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={editPin}
                    disabled={editRemovePin}
                    onChange={(e) => setEditPin(e.target.value)}
                    placeholder={gallery?.has_pin ? "Kosongkan jika tidak ingin mengubah PIN" : "Misal: 1234 (Opsional)"}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234] disabled:opacity-50"
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
                {gallery?.has_pin && (
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRemovePin}
                      onChange={(e) => setEditRemovePin(e.target.checked)}
                      className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-[11px] text-red-600 font-medium">Hapus PIN (Jadikan Galeri Publik)</span>
                  </label>
                )}
              </div>

              {/* Selection Limit */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Selection Limit (Max Photos)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editMaxSelections}
                  onChange={(e) => setEditMaxSelections(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="e.g. 10 (0 untuk tanpa batas)"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Isi 0 jika klien bebas memilih foto tanpa batasan kuota.
                </span>
              </div>

              {/* Allow Downloads Checkbox */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-950 block">Allow Original HD Downloads</span>
                  <span className="text-[10px] text-zinc-400 block">
                    Klien dapat langsung mengunduh file foto resolusi penuh.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAllowDownload}
                    onChange={(e) => setEditAllowDownload(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#114234]"></div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#114234] hover:bg-[#0d3429] transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan & Menyinkronkan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-white text-xs sm:text-sm font-medium shadow-2xl animate-slideUp pointer-events-none">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#bef238] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
