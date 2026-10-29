"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Lock,
  Clock,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

export default function NewGalleryPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [driveUrl, setDriveUrl] = useState("");
  const [expirationDays, setExpirationDays] = useState(3);
  const [pin, setPin] = useState("");
  const [maxSelections, setMaxSelections] = useState(0);
  const [allowDownload, setAllowDownload] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountRestricted, setAccountRestricted] = useState(false);
  const [processingState, setProcessingState] = useState<{
    inProgress: boolean;
    galleryId?: string;
    progressText: string;
    percent: number;
  }>({
    inProgress: false,
    progressText: "",
    percent: 0,
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.is_restricted) {
          setAccountRestricted(true);
          setError(
            "__RESTRICTION__Akun Anda telah dikunci oleh Super Admin untuk pembuatan galeri baru. Silakan hubungi Super Admin jika ini keliru."
          );
        }
      })
      .catch(() => {});
  }, []);

  const validateDriveUrl = (url: string) => {
    if (!url.trim()) return false;
    return (
      url.includes("drive.google.com") ||
      /^[a-zA-Z0-9_-]{8,64}$/.test(url.trim())
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim() || !eventName.trim() || !driveUrl.trim()) {
      setError("Nama Klien, Nama Acara, dan Link Folder Google Drive wajib diisi.");
      return;
    }

    if (!validateDriveUrl(driveUrl)) {
      setError("Link Google Drive tidak valid. Masukkan URL folder Google Drive yang benar (contoh: https://drive.google.com/drive/folders/xxxxx)");
      return;
    }

    setSubmitting(true);
    setProcessingState({
      inProgress: true,
      progressText: "Memindai foto langsung dari Google Drive...",
      percent: 45,
    });

    try {
      const res = await fetch("/api/admin/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          event_name: eventName,
          event_date: eventDate,
          drive_folder_url: driveUrl,
          expiration_days: expirationDays,
          pin: pin ? pin.trim() : undefined,
          max_selections: maxSelections,
          allow_download: allowDownload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          throw new Error("UNAUTHORIZED_SESSION");
        }
        if (data.error === "ACCOUNT_RESTRICTED" || data.error === "GALLERY_LIMIT_REACHED") {
          throw new Error(`RESTRICTION:${data.message}`);
        }
        throw new Error(data.error || "Gagal membuat galeri.");
      }

      const count = data.gallery?.total_photos || 0;
      setProcessingState({
        inProgress: true,
        galleryId: data.gallery.id,
        progressText: count > 0 
          ? `Berhasil sinkronisasi ${count} foto dari Google Drive! Mengalihkan...` 
          : "Galeri siap! Mengalihkan...",
        percent: 100,
      });

      setTimeout(() => {
        router.push(`/admin/galleries/${data.gallery.id}`);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kendala saat membuat galeri.";
      if (msg.startsWith("RESTRICTION:")) {
        setError(`__RESTRICTION__${msg.slice(12)}`);
      } else {
        setError(msg);
      }
      setSubmitting(false);
      setProcessingState({ inProgress: false, progressText: "", percent: 0 });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminTopNav
        title="Create New Gallery"
        description="Connect a Google Drive photoshoot folder and generate a client proofing link."
      />

      <main className="p-6 sm:p-8 max-w-3xl w-full mx-auto space-y-6">
        
        <div className="flex items-center gap-2">
          <Link
            href="/admin/galleries"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Galleries</span>
          </Link>
        </div>

        {error && (
          error.startsWith("__RESTRICTION__") ? (
            <div className="p-5 rounded-2xl bg-orange-50 border-2 border-orange-300 text-orange-900 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 border border-orange-300 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-orange-800">Account Restricted</span>
                  <span className="text-xs text-orange-700 block mt-0.5">Your gallery creation has been restricted by the administrator</span>
                </div>
              </div>
              <p className="text-xs text-orange-700 bg-orange-100 rounded-xl px-4 py-3 border border-orange-200 leading-relaxed">
                {error.slice(15)}
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">
                    {error === "UNAUTHORIZED_SESSION" || error === "Unauthorized"
                      ? "Sesi Admin Berakhir (Unauthorized)"
                      : "Unable to process this gallery:"}
                  </span>
                  <span className="text-red-700 block">
                    {error === "UNAUTHORIZED_SESSION" || error === "Unauthorized"
                      ? "Sesi login admin Anda telah berakhir atau tidak terdeteksi. Silakan login kembali ke akun admin."
                      : error}
                  </span>
                </div>
              </div>
              {(error === "UNAUTHORIZED_SESSION" || error === "Unauthorized") && (
                <Link
                  href="/admin/login"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 text-center"
                >
                  Login Admin Kembali
                </Link>
              )}
            </div>
          )
        )}


        {/* Processing Progress Modal / Banner */}
        {processingState.inProgress && (
          <div className="bg-[#114234] text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#bef238]" />
                <h3 className="text-base font-bold tracking-tight">
                  {processingState.progressText}
                </h3>
              </div>
              <span className="text-xs font-bold text-[#bef238]">{processingState.percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-[#09261d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#bef238] transition-all duration-500 rounded-full"
                style={{ width: `${processingState.percent}%` }}
              />
            </div>

            <p className="text-xs text-emerald-200/80">
              Photos are scanned directly from Google Drive metadata without downloading original raw files to the server.
            </p>
          </div>
        )}

        {/* Create Gallery Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-9 shadow-xs space-y-6"
        >
          {/* Section: Client & Event Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-100 pb-2">
              1. Client & Event Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Andi & Sinta"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234] transition-colors"
                />
              </div>

              {/* Event Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Wedding Celebration"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234] transition-colors"
                />
              </div>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Event Date
              </label>
              <div className="relative max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                />
              </div>
            </div>
          </div>

          {/* Section: Google Drive Integration */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-100 pb-2">
              2. Google Drive Source
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Google Drive Folder URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  required
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234] transition-colors"
                />
              </div>
              <div className="mt-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-[11px] text-[#114234]">
                <ShieldCheck className="w-4 h-4 text-[#114234] shrink-0 mt-0.5" />
                <p>
                  <strong>Original storage safety:</strong> Studioin reads metadata and creates temporary WebP previews without downloading 20 GB of original files to the server.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Expiration & Security */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-100 pb-2">
              3. Expiration & Client Access
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Expiration Duration */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Gallery Expiration
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <select
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                  >
                    <option value={3}>3 Days (Default)</option>
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                  </select>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  You can extend this duration anytime from the dashboard.
                </span>
              </div>

              {/* Optional Client PIN */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Client PIN Code (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g., 8291"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                  />
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Leave blank for public direct token access.
                </span>
              </div>

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
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Set to 0 if the client has no limit on selections.
                </span>
              </div>

              {/* Allow Downloads Toggle */}
              <div className="flex items-center justify-between sm:col-span-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-200/60 mt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-950 block">Allow Photo Downloads</span>
                  <span className="text-[11px] text-zinc-400 block">
                    Enable to allow client to download full resolution photos directly from the gallery page.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#114234]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <Link
              href="/admin/galleries"
              className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || accountRestricted}
              className={`inline-flex items-center gap-2 px-6 py-2.5 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98 ${
                accountRestricted
                  ? "bg-zinc-200 text-zinc-500 cursor-not-allowed border border-zinc-300"
                  : "bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] disabled:opacity-60 disabled:pointer-events-none"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Gallery...</span>
                </>
              ) : accountRestricted ? (
                <>
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <span>Gallery Creation Locked</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Create Gallery</span>
                </>
              )}
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}
