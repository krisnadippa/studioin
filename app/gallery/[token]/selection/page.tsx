"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { GalleryImage } from "@/components/gallery/GalleryImage";
import { ArrowLeft, Check, CheckSquare, Send, X, Trash2, Plus, Loader2, Sparkles } from "lucide-react";

interface PublicPhoto {
  id: string;
  filename: string;
  thumbnail_url: string;
  preview_url: string;
}

interface PublicGallery {
  id: string;
  client_name: string;
  event_name: string;
  event_date: string;
  max_selections: number;
}

export default function ClientSelectionReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [allPhotos, setAllPhotos] = useState<PublicPhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Notes & Email
  const [clientNotes, setClientNotes] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const fetchGalleryAndSelections = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/gallery/${token}`);
        const data = await res.json();

        if (res.ok && data.gallery) {
          setGallery(data.gallery);
          setAllPhotos(data.photos || []);

          // Sync from latest DB selection if available
          if (data.latest_selection && Array.isArray(data.latest_selection.selected_photo_ids)) {
            const dbIds = data.latest_selection.selected_photo_ids;
            setSelectedPhotoIds(dbIds);
            if (data.latest_selection.client_notes) setClientNotes(data.latest_selection.client_notes);
            if (data.latest_selection.client_email) setClientEmail(data.latest_selection.client_email);
          } else {
            // Fallback to local storage
            const saved = localStorage.getItem(`studioin_sel_${data.gallery.id}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) setSelectedPhotoIds(parsed);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load review page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryAndSelections();
  }, [token]);

  const selectedPhotos = allPhotos.filter((p) => selectedPhotoIds.includes(p.id));

  const handleRemovePhoto = (photoId: string) => {
    const updated = selectedPhotoIds.filter((id) => id !== photoId);
    setSelectedPhotoIds(updated);
    if (gallery) {
      try {
        localStorage.setItem(`studioin_sel_${gallery.id}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPhotoIds.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/gallery/${token}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: gallery?.client_name,
          client_email: clientEmail,
          client_notes: clientNotes,
          selected_photo_ids: selectedPhotoIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitted(true);
      setShowSubmitModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between p-6 max-w-[1440px] mx-auto space-y-6">
        <div className="h-8 w-48 bg-zinc-200 animate-pulse rounded-lg" />
        <div className="h-32 bg-zinc-100 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] bg-zinc-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#114234] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-lg w-full bg-[#0e382b] border border-emerald-800/60 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center mx-auto shadow-lg">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#bef238] uppercase tracking-wider block mb-1">
              Selection Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Thank you, {gallery?.client_name}!
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-2 leading-relaxed">
              Your updated selection of <strong>{selectedPhotoIds.length} photos</strong> has been sent to your photographer.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="px-5 py-2.5 rounded-xl border border-emerald-700 text-emerald-200 hover:text-white text-xs font-semibold"
            >
              Back to Review
            </button>
            <Link
              href={`/gallery/${token}`}
              className="px-5 py-2.5 rounded-xl bg-[#bef238] text-[#114234] font-bold text-xs"
            >
              Browse Gallery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const maxQuota = gallery?.max_selections || 0;
  const remainingQuota = maxQuota > 0 ? maxQuota - selectedPhotos.length : null;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between selection:bg-[#bef238] selection:text-[#114234]">
      {/* Header */}
      <header className="bg-[#114234] text-white border-b border-emerald-800/40 p-4 sm:p-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <Link
            href={`/gallery/${token}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Photos</span>
          </Link>
          <span className="text-xs font-bold text-[#bef238] uppercase tracking-wider">
            Selection Review
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto p-6 sm:p-8 w-full flex-1 space-y-8">
        
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
          <div>
            <span className="text-xs font-bold text-[#114234] uppercase tracking-wider block mb-1">
              {gallery?.client_name} • {gallery?.event_name}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Review Selected Photos ({selectedPhotos.length})
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              You can remove photos, choose additional photos, or submit your final list to the photographer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/gallery/${token}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#114234]" />
              <span>Add / Change Photos</span>
            </Link>

            {selectedPhotos.length > 0 && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#114234] hover:bg-[#0d3429] text-[#bef238] text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Selection ({selectedPhotos.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quota Status Box */}
        {maxQuota > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs text-[#114234]">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-[#114234]" />
              <span>
                Selection Limit: <strong>{selectedPhotos.length} / {maxQuota} photos</strong> selected.
              </span>
            </div>
            {remainingQuota !== null && remainingQuota > 0 ? (
              <span className="font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full text-[11px]">
                You can select {remainingQuota} more {remainingQuota === 1 ? "photo" : "photos"}
              </span>
            ) : (
              <span className="font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full text-[11px]">
                Target selection quota reached
              </span>
            )}
          </div>
        )}

        {/* Selected Photos Grid */}
        {selectedPhotos.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 bg-zinc-50 rounded-3xl border border-zinc-200/60">
            <CheckSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-800">No photos selected yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-6">
              Return to the photo gallery to pick your favorite photos for print or editing.
            </p>
            <Link
              href={`/gallery/${token}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#114234] text-[#bef238] text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Browse & Pick Photos</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border-2 border-[#114234] shadow-xs"
              >
                <GalleryImage
                  src={photo.thumbnail_url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  index={index}
                />
                
                <div className="absolute top-2.5 left-2.5 bg-[#114234] text-[#bef238] p-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                </div>

                <button
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2.5 text-white text-[11px] font-mono font-bold truncate">
                  {photo.filename}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#114234] block mb-1">
                  Confirmation
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
                  Submit Selected Photos?
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-[#114234]">
              You have selected <strong>{selectedPhotoIds.length} photos</strong>. Clicking submit will send your selection directly to your photographer.
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Your Email (Optional, for confirmation)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g., client@example.com"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-[#114234]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Notes for Photographer (Optional)
                </label>
                <textarea
                  rows={3}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="e.g., Please warm up the tone on photo 12, ready for album printing."
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-[#114234]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#114234] hover:bg-[#0d3429] text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#bef238]" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#bef238]" />
                      <span>Submit Selection ({selectedPhotoIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        Studioin Photo Proofing System
      </footer>
    </div>
  );
}
