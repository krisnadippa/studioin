"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, CheckSquare, Send, X } from "lucide-react";

interface PublicPhoto {
  id: string;
  filename: string;
  thumbnail_url: string;
  preview_url: string;
}

export default function ClientSelectionReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [selectedPhotos, setSelectedPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGalleryAndSelections = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/gallery/${token}`);
        const data = await res.json();

        if (res.ok && data.photos) {
          const saved = localStorage.getItem(`studioin_sel_${data.gallery.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            const selectedSet = new Set(parsed);
            setSelectedPhotos(data.photos.filter((p: PublicPhoto) => selectedSet.has(p.id)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryAndSelections();
  }, [token]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between">
      <header className="bg-[#114234] text-white border-b border-emerald-800/40 p-4 sm:p-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <Link
            href={`/gallery/${token}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Photos</span>
          </Link>
          <span className="text-xs font-bold text-[#bef238] uppercase tracking-wider">
            Selection Review
          </span>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-6 sm:p-8 w-full flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
            Your Selected Photos ({selectedPhotos.length})
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Review your shortlisted photos before final submission.
          </p>
        </div>

        {selectedPhotos.length === 0 ? (
          <div className="p-16 text-center text-zinc-400">
            <CheckSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-800">No photos selected yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
              Return to the gallery to pick your favorite photos.
            </p>
            <Link
              href={`/gallery/${token}`}
              className="px-4 py-2 bg-[#114234] text-white text-xs font-bold rounded-xl"
            >
              Back to Gallery
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {selectedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 border-2 border-[#114234] shadow-xs"
              >
                <Image
                  src={photo.thumbnail_url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-2.5 left-2.5 bg-[#114234] text-[#bef238] p-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-white text-[10px] font-mono truncate">
                  {photo.filename}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        Studioin Photo Proofing System
      </footer>
    </div>
  );
}
