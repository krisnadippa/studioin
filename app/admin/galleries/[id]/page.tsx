"use client";

import { useEffect, useState, use } from "react";
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
  
  // Edit Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [maxSelections, setMaxSelections] = useState(0);
  const [allowDownload, setAllowDownload] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const openSettings = () => {
    if (!gallery) return;
    setMaxSelections(gallery.max_selections || 0);
    setAllowDownload(!!gallery.allow_download);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gallery) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_selections: maxSelections,
          allow_download: allowDownload,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGallery(data.gallery);
        showToast("Settings updated successfully!");
        setIsSettingsOpen(false);
      } else {
        showToast("Failed to update settings.", "error");
      }
    } catch {
      showToast("An error occurred while updating settings.", "error");
    } finally {
      setSavingSettings(false);
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

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, photos.length]);

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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{extending ? "Extending..." : "Extend +3 Days"}</span>
            </button>

            <button
              onClick={openSettings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              <span>Settings</span>
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
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
            <span className="text-xs font-bold text-[#bef238] uppercase tracking-wider block">
              Google Drive Source
            </span>

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
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Photos Preview ({photos.length})</h3>
              <p className="text-xs text-zinc-500 font-medium">Optimized WebP thumbnails generated from Google Drive</p>
            </div>
            <button
              onClick={fetchGalleryData}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {photos.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              No photos available in this gallery yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shadow-xs cursor-pointer hover:border-[#114234] hover:shadow-md transition-all duration-200"
                >
                  <GalleryImage
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    index={index}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-2 bg-white/20 backdrop-blur-xs rounded-full text-white">
                      <ZoomIn className="w-5 h-5" />
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
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-fadeIn">
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs text-zinc-300 min-w-0">
              <span className="truncate max-w-[160px] sm:max-w-[300px] font-bold text-white" title={photos[lightboxIndex].filename}>
                {photos[lightboxIndex].filename}
              </span>
              <span className="text-zinc-600 shrink-0">•</span>
              <span className="shrink-0 text-zinc-400">
                {lightboxIndex + 1} of {photos.length}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <a
                href={`/api/admin/galleries/${id}/download/${photos[lightboxIndex].id}`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                title="Download HD photo"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download HD</span>
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

          {/* Lightbox Center Image View */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8">
            {/* Previous Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1))}
              className="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-colors z-20 cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Preview Image */}
            <div className="relative w-full h-full max-h-[82vh] flex items-center justify-center">
              <GalleryImage
                src={photos[lightboxIndex].preview_url}
                alt={photos[lightboxIndex].filename}
                fill
                priority
                className="object-contain"
                index={lightboxIndex}
              />
            </div>

            {/* Next Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-colors z-20 cursor-pointer"
              aria-label="Next photo"
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

      {/* Settings Edit Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-100/80 flex flex-col space-y-4 animate-scaleUp"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-50 text-zinc-700">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Gallery Settings</h3>
                <p className="text-xs text-zinc-400">Modify client preferences</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {/* Max Selections */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Selection Limit (Max Photos)
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="e.g. 10 (0 for unlimited)"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Set to 0 if the client has no limit on selections.
                </span>
              </div>

              {/* Allow Downloads Checkbox */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-950 block">Allow Downloads</span>
                  <span className="text-[10px] text-zinc-400 block">
                    Clients can download original HD photos.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#114234]"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#114234] hover:bg-[#0d3429] transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? "Saving..." : "Save Settings"}
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
