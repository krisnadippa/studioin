"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  FileCode,
  Calendar,
  MessageSquare,
  Loader2,
} from "lucide-react";
import JSZip from "jszip";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { Gallery, Photo, Selection } from "@/lib/db/types";

export default function GallerySelectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedFilenames, setCopiedFilenames] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    isActive: boolean;
    total: number;
    current: number;
    percent: number;
    filename: string;
  } | null>(null);

  useEffect(() => {
    const fetchSelections = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/galleries/${id}/selections`);
        if (res.ok) {
          const data = await res.json();
          setGallery(data.gallery);
          setSelections(data.selections || []);
          setSelectedPhotos(data.selected_photos || []);
        }
      } catch (err) {
        console.error("Failed to fetch selections:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSelections();
  }, [id]);

  const handleExport = async (format: "txt" | "csv" | "json") => {
    try {
      const res = await fetch(`/api/admin/galleries/${id}/selections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${gallery?.client_name.replace(/\s+/g, "_") || "gallery"}_selections.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const copyFilenamesToClipboard = () => {
    const text = selectedPhotos.map((p) => p.filename).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedFilenames(true);
    setTimeout(() => setCopiedFilenames(false), 2000);
  };

  const downloadAllSelected = async () => {
    if (selectedPhotos.length === 0) return;
    
    setZipProgress({
      isActive: true,
      total: selectedPhotos.length,
      current: 0,
      percent: 0,
      filename: "Menginisiasi unduhan...",
    });

    try {
      const zip = new JSZip();
      const folderName = `${gallery?.client_name.replace(/\s+/g, "_") || "Gallery"}_${gallery?.event_name.replace(/\s+/g, "_") || "Photos"}`;
      const folder = zip.folder(folderName) || zip;

      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        setZipProgress({
          isActive: true,
          total: selectedPhotos.length,
          current: i + 1,
          percent: Math.round((i / selectedPhotos.length) * 100),
          filename: photo.filename,
        });

        const response = await fetch(`/api/admin/galleries/${id}/download/${photo.id}`);
        if (!response.ok) {
          throw new Error(`Gagal mengunduh ${photo.filename}`);
        }
        const blob = await response.blob();
        folder.file(photo.filename, blob);
      }

      setZipProgress({
        isActive: true,
        total: selectedPhotos.length,
        current: selectedPhotos.length,
        percent: 100,
        filename: "Membuat file ZIP...",
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}_Selections.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Zipping error:", err);
      alert("Gagal membuat ZIP unduhan. Silakan coba lagi.");
    } finally {
      setZipProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col p-8 space-y-6">
        <div className="h-8 w-48 bg-zinc-200 animate-pulse rounded-lg" />
        <div className="h-40 bg-zinc-100 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
        <Link href="/admin/galleries" className="text-xs text-[#114234] underline mt-2 block">
          Return to Galleries
        </Link>
      </div>
    );
  }

  const latestSelection = selections[0];

  return (
    <div className="flex-1 flex flex-col">
      <AdminTopNav
        title={`Selections: ${gallery.client_name}`}
        description={`${selectedPhotos.length} photos selected by client`}
      />

      <main className="p-6 sm:p-8 max-w-[1440px] w-full mx-auto space-y-8">
        
        {/* Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/admin/galleries/${gallery.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Gallery Details</span>
          </Link>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadAllSelected}
              disabled={selectedPhotos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#114234] hover:bg-[#0d3429] text-[#bef238] text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
              title="Download all selected photos in original HD format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All HD</span>
            </button>

            <button
              onClick={copyFilenamesToClipboard}
              disabled={selectedPhotos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {copiedFilenames ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFilenames ? "Copied List" : "Copy Filenames"}</span>
            </button>

            <button
              onClick={() => handleExport("txt")}
              disabled={selectedPhotos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export TXT</span>
            </button>

            <button
              onClick={() => handleExport("csv")}
              disabled={selectedPhotos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport("json")}
              disabled={selectedPhotos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Selection Submission Metadata Card */}
        {latestSelection ? (
          <div className="bg-[#114234] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#185342] text-[#bef238] border border-[#2b6553]">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Submitted Selection</span>
              </span>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {gallery.client_name} selected {selectedPhotos.length} photos
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-200/80 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Submitted: {new Date(latestSelection.submitted_at).toLocaleString()}</span>
                </span>
                {latestSelection.client_email && (
                  <span>Email: {latestSelection.client_email}</span>
                )}
              </div>

              {latestSelection.client_notes && (
                <div className="mt-3 p-3.5 bg-[#09261d] rounded-xl border border-emerald-800/40 text-xs text-emerald-100 flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-[#bef238] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-white">Client Note:</strong> {latestSelection.client_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 bg-[#0e382b] border border-emerald-700/60 p-4 rounded-2xl text-center min-w-[160px]">
              <span className="text-3xl font-extrabold text-[#bef238] block">{selectedPhotos.length}</span>
              <span className="text-xs text-emerald-200 font-medium block mt-0.5">Photos Selected</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 text-center text-zinc-500">
            <CheckSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-800">No selections submitted yet</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              The client has not finalized or submitted their photo choices yet.
            </p>
          </div>
        )}

        {/* Selected Photos Grid */}
        <section className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Selected Photos List ({selectedPhotos.length})</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Copy or export the list of filenames to locate original RAW / JPEG files in your Google Drive.
              </p>
            </div>
          </div>

          {selectedPhotos.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              No photos currently selected.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {selectedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border-2 border-[#114234] shadow-xs"
                >
                  <Image
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  
                  {/* Selected Indicator Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-[#114234] text-[#bef238] p-1 rounded-full shadow-md z-20">
                    <Check className="w-3.5 h-3.5" />
                  </div>

                  {/* Download HD Button */}
                  <a
                    href={`/api/admin/galleries/${id}/download/${photo.id}`}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-[#114234] text-white hover:text-[#bef238] p-1.5 rounded-full shadow-md transition-all z-20"
                    title="Download HD photo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {/* Filename Bar */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 text-white flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold truncate">
                      {photo.filename}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      {zipProgress && zipProgress.isActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-zinc-100/80 flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#114234]" />
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-950">Mendownload & Zipping Foto</h3>
              <p className="text-xs text-zinc-400">
                Memproses {zipProgress.current} dari {zipProgress.total} file
              </p>
            </div>

            <div className="w-full space-y-1">
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#114234] rounded-full transition-all duration-300"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span className="truncate max-w-[200px]">{zipProgress.filename}</span>
                <span>{zipProgress.percent}%</span>
              </div>
            </div>
            
            <p className="text-[10px] text-zinc-400 leading-normal italic">
              Mohon jangan tutup halaman ini sampai proses download selesai.
            </p>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
