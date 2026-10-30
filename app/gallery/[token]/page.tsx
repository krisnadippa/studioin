"use client";

import { useEffect, useState, use, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { GalleryImage } from "@/components/gallery/GalleryImage";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  Clock,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  AlertCircle,
  Eye,
  Send,
  Camera,
  Search,
  Download,
  Folder,
  FolderOpen,
  Play,
  Video,
  Film,
  Layers,
} from "lucide-react";

interface PublicGallery {
  id: string;
  client_name: string;
  event_name: string;
  event_date: string;
  status: string;
  error_message?: string;
  total_photos: number;
  expires_at: string;
  has_pin: boolean;
  max_selections: number;
  allow_download: boolean;
}

interface PublicPhoto {
  id: string;
  drive_file_id?: string;
  filename: string;
  thumbnail_url: string;
  preview_url: string;
  width?: number;
  height?: number;
  sort_order: number;
  folder_name?: string | null;
  media_type?: "image" | "video";
  video_stream_url?: string | null;
}

// Helper to convert size parameter to a high-definition 2048px (2K) format
const getHDPreviewUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("/api/photo/")) {
    return url;
  }
  if (url.includes("lh3.googleusercontent.com/d/")) {
    const match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2048`;
    }
  }
  if (url.includes("drive.google.com/thumbnail")) {
    return url.replace(/sz=w\d+/, "sz=w2048");
  }
  if (url.includes("images.unsplash.com")) {
    return url.replace("w=500", "w=2048").replace("w=1600", "w=2048");
  }
  if (url.includes("googleusercontent.com")) {
    if (url.match(/=([ws])?\d+/)) {
      return url.replace(/=([ws])?\d+/, "=w2048");
    }
    return `${url}=w2048`;
  }
  return url.replace("=500", "=2048").replace("=1600", "=2048");
};

export default function ClientGalleryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [gallery, setGallery] = useState<PublicGallery | null>(null);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN Protection State
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinLength, setPinLength] = useState(4);
  const [otp, setOtp] = useState<string[]>(Array(4).fill(""));
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);

  // Reset OTP array when pinLength changes
  useEffect(() => {
    setOtp(Array(pinLength).fill(""));
  }, [pinLength]);

  // Selection & Filter State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "selected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all"); // "all" | "__videos__" | "folder:XYZ"
  const [activeVideo, setActiveVideo] = useState<PublicPhoto | null>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Isolated Photo Zoom & Pan State (web page does NOT zoom)
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Submit Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [clientNotes, setClientNotes] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Expiration countdown
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Limit toast state
  const [limitToast, setLimitToast] = useState<string | null>(null);
  const showLimitToast = (message: string) => {
    setLimitToast(message);
    setTimeout(() => setLimitToast(null), 3500);
  };

  const fetchGallery = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/gallery/${token}`);
      const data = await res.json();

      if (data.expired) {
        setError("Masa aktif galeri foto ini telah berakhir. Silakan hubungi fotografer Anda jika Anda masih membutuhkan akses.");
        setLoading(false);
        return;
      }

      if (data.requires_pin) {
        setRequiresPin(true);
        setGallery(data.gallery);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Galeri foto tidak ditemukan atau tautan sudah tidak aktif.");
      }

      setGallery(data.gallery);
      setPhotos(data.photos || []);
      setRequiresPin(false);

      // Restore selections: sync from database selection if available
      if (data.latest_selection && Array.isArray(data.latest_selection.selected_photo_ids)) {
        const dbSelected = data.latest_selection.selected_photo_ids;
        setSelectedIds(new Set(dbSelected));
        if (data.latest_selection.client_notes) {
          setClientNotes(data.latest_selection.client_notes);
        }
        if (data.latest_selection.client_email) {
          setClientEmail(data.latest_selection.client_email);
        }
        try {
          localStorage.setItem(`studioin_sel_${data.gallery.id}`, JSON.stringify(dbSelected));
        } catch {}
      } else {
        // Fallback to local storage if no DB selection exists yet
        try {
          const saved = localStorage.getItem(`studioin_sel_${data.gallery.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setSelectedIds(new Set(parsed));
            }
          }
        } catch {}
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat galeri foto.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [token]);

  // Update expiration countdown
  useEffect(() => {
    if (!gallery?.expires_at) return;

    const calculateTime = () => {
      const now = Date.now();
      const exp = new Date(gallery.expires_at).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeRemaining(`${days} days ${hours} hours`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hours ${minutes} mins`);
      } else {
        setTimeRemaining(`${minutes} minutes`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [gallery?.expires_at]);

  // Persist selections to localStorage
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let limitExceeded = false;
    
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (gallery?.max_selections && gallery.max_selections > 0 && next.size >= gallery.max_selections) {
          limitExceeded = true;
          return prev;
        }
        next.add(id);
      }
      if (gallery) {
        try {
          localStorage.setItem(`studioin_sel_${gallery.id}`, JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });

    if (limitExceeded && gallery) {
      showLimitToast(`Batas maksimal pilihan foto telah tercapai (${gallery.max_selections} foto). Silakan batalkan centang salah satu foto jika ingin memilih foto lain.`);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;

      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0));
      } else if (e.key === " ") {
        e.preventDefault();
        const currentPhoto = filteredPhotos[lightboxIndex];
        if (currentPhoto) {
          toggleSelect(currentPhoto.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const verifyPinCode = async (pinValue: string) => {
    if (pinSubmitting) return;
    setPinError(null);
    setPinSubmitting(true);

    try {
      const res = await fetch(`/api/gallery/${token}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kode PIN yang Anda masukkan salah. Silakan coba lagi.");
      }

      fetchGallery();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kode PIN salah";
      setPinError(msg);
      setPinSubmitting(false);
      // Clear OTP on error and auto-focus first box
      setOtp(Array(pinLength).fill(""));
      const firstInput = document.getElementById("otp-0") as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    verifyPinCode(otp.join(""));
  };

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    const val = element.value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = val ? val.substring(val.length - 1) : "";
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < pinLength - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      if (otp[index]) {
        newOtp[index] = "";
      } else if (index > 0) {
        newOtp[index - 1] = "";
        const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
        if (prevInput) prevInput.focus();
      }
      setOtp(newOtp);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").substring(0, pinLength);
    if (!pasteData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);

    // Focus last filled input
    const focusIndex = Math.min(pasteData.length, pinLength - 1);
    const targetInput = document.getElementById(`otp-${focusIndex}`) as HTMLInputElement;
    if (targetInput) targetInput.focus();
  };

  // Auto-verify when OTP is fully filled
  useEffect(() => {
    const isComplete = otp.every((digit) => digit !== "");
    if (isComplete && otp.length > 0 && !pinSubmitting) {
      verifyPinCode(otp.join(""));
    }
  }, [otp]);

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/gallery/${token}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: gallery?.client_name,
          client_email: clientEmail,
          client_notes: clientNotes,
          selected_photo_ids: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirimkan pilihan foto.");
      }

      setSubmitted(true);
      setShowSubmitModal(false);
      fetchGallery();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kendala saat mengirim pilihan foto.");
    } finally {
      setSubmitting(false);
    }
  };

  // Group photos and videos
  const allPhotoItems = useMemo(() => photos.filter((p) => p.media_type !== "video"), [photos]);
  const allVideoItems = useMemo(() => photos.filter((p) => p.media_type === "video"), [photos]);

  const subfolderMap = useMemo(() => {
    const map = new Map<string, number>();
    allPhotoItems.forEach((p) => {
      if (p.folder_name && p.folder_name.trim()) {
        const name = p.folder_name.trim();
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return map;
  }, [allPhotoItems]);

  const subfolders = useMemo(() => Array.from(subfolderMap.keys()).sort(), [subfolderMap]);
  const hasSubfolders = subfolders.length > 0;
  const hasVideos = allVideoItems.length > 0;

  const filteredPhotos = useMemo(() => {
    let list = activeCategory === "__videos__" ? allVideoItems : allPhotoItems;

    // Filter by specific subfolder
    if (activeCategory.startsWith("folder:")) {
      const folderName = activeCategory.slice(7);
      list = list.filter((p) => (p.folder_name || "").trim() === folderName);
    }

    if (activeFilter === "selected") {
      list = list.filter((p) => selectedIds.has(p.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.filename.toLowerCase().includes(q));
    }
    return list;
  }, [allPhotoItems, allVideoItems, activeCategory, activeFilter, selectedIds, searchQuery]);

  // Preload adjacent photos to eliminate lag when swiping/clicking next & previous
  useEffect(() => {
    if (lightboxIndex === null) return;
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });

    const preload = (url?: string) => {
      if (!url) return;
      const img = new window.Image();
      img.src = getHDPreviewUrl(url);
    };

    const next1 = filteredPhotos[lightboxIndex + 1];
    const next2 = filteredPhotos[lightboxIndex + 2];
    const prev1 = filteredPhotos[lightboxIndex - 1];
    const prev2 = filteredPhotos[lightboxIndex - 2];

    if (next1?.preview_url) preload(next1.preview_url);
    if (next2?.preview_url) preload(next2.preview_url);
    if (prev1?.preview_url) preload(prev1.preview_url);
    if (prev2?.preview_url) preload(prev2.preview_url);
  }, [lightboxIndex, filteredPhotos]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3.5, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomReset = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handlePhotoTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      if (zoomScale > 1) {
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      } else {
        setZoomScale(2.2);
      }
    }
    lastTapTimeRef.current = now;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...panPosition };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      setPanPosition({
        x: panStartRef.current.x + deltaX,
        y: panStartRef.current.y + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
      return;
    }
    if (e.touches.length === 1) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (zoomScale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStartRef.current = { ...panPosition };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - touchDistanceRef.current;
      setZoomScale((prev) => {
        const next = Math.min(3.5, Math.max(1, prev + delta * 0.008));
        if (next === 1) setPanPosition({ x: 0, y: 0 });
        return next;
      });
      touchDistanceRef.current = dist;
      return;
    }
    if (e.touches.length === 1 && zoomScale > 1 && isDragging) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      setPanPosition({
        x: panStartRef.current.x + deltaX,
        y: panStartRef.current.y + deltaY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchDistanceRef.current = null;
    setIsDragging(false);

    if (zoomScale === 1 && touchStartPosRef.current && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartPosRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartPosRef.current.y;
      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          setLightboxIndex((prev) => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0));
        } else {
          setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1));
        }
      }
    }
    touchStartPosRef.current = null;
  };

  // Loading skeleton screen
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 p-6 sm:p-10 max-w-[1560px] mx-auto space-y-8">
        <div className="h-12 w-64 bg-zinc-200 animate-pulse rounded-2xl" />
        <div className="h-32 bg-zinc-100 animate-pulse rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-[4/3] bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Expired / Error Screen
  if (error) {
    return (
      <div className="min-h-screen bg-[#114234] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#0e382b] border border-emerald-800/60 p-8 rounded-3xl shadow-2xl space-y-4">
          <Clock className="w-12 h-12 text-[#bef238] mx-auto" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Galeri Tidak Tersedia</h1>
          <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#bef238] text-[#114234] font-bold text-xs shadow-md"
            >
              <span>Kembali ke Beranda Studioin</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // PIN Protected Gate Screen
  if (requiresPin) {
    return (
      <div className="min-h-screen bg-[#114234] text-white flex flex-col justify-between p-6">
        <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logosiputih.png" alt="Studioin" width={32} height={32} className="w-7 h-7 object-contain" />
            <span className="text-white text-xl font-bold tracking-tight">Studioin</span>
          </Link>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-[#0e382b] border border-emerald-800/60 rounded-3xl p-7 sm:p-9 shadow-2xl text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[#185342] text-[#bef238] border border-[#2b6553] flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-semibold text-[#bef238] uppercase tracking-wider block mb-1">
                Galeri Foto Terproteksi
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {gallery?.client_name || "Galeri Klien"}
              </h1>
              <p className="text-xs text-emerald-200/80 mt-1.5 leading-relaxed">
                Silakan masukkan {pinLength} digit kode PIN yang diberikan oleh fotografer Anda untuk melihat foto-foto ini.
              </p>
            </div>

            {pinError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl flex items-center justify-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="flex justify-center gap-3.5" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono text-2xl font-bold bg-[#09261d] border border-emerald-800/60 focus:border-[#bef238] focus:ring-4 focus:ring-[#bef238]/10 rounded-2xl text-[#bef238] placeholder-emerald-800/40 focus:outline-none transition-all shadow-inner"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => setPinLength(pinLength === 4 ? 6 : 4)}
                  className="text-xs text-emerald-400 hover:text-[#bef238] underline transition-colors cursor-pointer"
                >
                  {pinLength === 4 ? "PIN 6 digit?" : "PIN 4 digit?"}
                </button>
                
                {otp.some(d => d !== "") && (
                  <button
                    type="button"
                    onClick={() => setOtp(Array(pinLength).fill(""))}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={pinSubmitting || otp.some(digit => digit === "")}
                className="w-full py-3.5 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-sm rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {pinSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memverifikasi PIN...
                  </span>
                ) : (
                  "Buka Galeri"
                )}
              </button>
            </form>
          </div>
        </main>

        <footer className="text-center text-xs text-emerald-300/50 py-2">
          Protected with Studioin Secure Proofing
        </footer>
      </div>
    );
  }

  // Submitted Success Banner State
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#114234] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-lg w-full bg-[#0e382b] border border-emerald-800/60 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center mx-auto shadow-lg">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#bef238] uppercase tracking-wider block mb-1">
              Selection Submitted
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Thank you, {gallery?.client_name}!
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-2 leading-relaxed">
              Your selection of <strong>{selectedIds.size} photos</strong> has been successfully received by the photographer.
            </p>
          </div>

          <div className="p-4 bg-[#09261d] rounded-2xl border border-emerald-800/40 text-xs text-emerald-200 text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-emerald-400">Total Selected:</span>
              <span className="font-bold text-white">{selectedIds.size} Photos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Event:</span>
              <span className="text-white">{gallery?.event_name}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="px-5 py-2.5 rounded-xl border border-emerald-700 text-emerald-200 hover:text-white text-xs font-semibold transition-colors"
            >
              Review Gallery
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#bef238] text-[#114234] font-bold text-xs transition-colors"
            >
              Studioin Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-between selection:bg-[#bef238] selection:text-[#0e3b2e]">
      
      {/* ------------------------------------------------------------- */}
      {/* Client Header Section                                        */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-[#114234] text-white border-b border-emerald-800/40 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1560px] mx-auto px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Logo & Client Title */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image
                src="/images/logosiputih.png"
                alt="Studioin"
                width={32}
                height={32}
                className="w-7 h-7 object-contain"
                priority
              />
            </Link>

            <div className="border-l border-emerald-700/60 pl-4">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight uppercase">
                {gallery?.client_name}
              </h1>
              <p className="text-[11px] text-emerald-200 font-medium">
                {gallery?.event_name} • {gallery?.event_date}
              </p>
            </div>
          </div>

          {/* Expiration Timer Badge */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {timeRemaining && timeRemaining !== "Expired" && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0e382b] border border-emerald-700/60 text-xs font-semibold text-emerald-100">
                <Clock className="w-3.5 h-3.5 text-[#bef238]" />
                <span>Gallery expires in: <strong className="text-white">{timeRemaining}</strong></span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Category / Subfolder & Filter Bar                             */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-zinc-200/80 bg-white/95 sticky top-[73px] sm:top-[65px] z-30 backdrop-blur-md shadow-xs">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 py-3 space-y-3">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Category Navigation (Subfolders & Media Types) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => { setActiveCategory("all"); setActiveFilter("all"); }}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeCategory === "all" && activeFilter !== "selected"
                    ? "bg-[#114234] text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Semua Foto ({allPhotoItems.length})</span>
              </button>

              {/* Subfolder Pills */}
              {subfolders.map((folder) => {
                const count = subfolderMap.get(folder) || 0;
                const isActive = activeCategory === `folder:${folder}` && activeFilter !== "selected";
                return (
                  <button
                    key={folder}
                    onClick={() => { setActiveCategory(`folder:${folder}`); setActiveFilter("all"); }}
                    className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#114234] text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-[#bef238]" />
                    <span>{folder} ({count})</span>
                  </button>
                );
              })}

              {/* Video Section Tab (if videos exist) */}
              {hasVideos && (
                <button
                  onClick={() => { setActiveCategory("__videos__"); setActiveFilter("all"); }}
                  className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeCategory === "__videos__"
                      ? "bg-[#114234] text-white shadow-xs"
                      : "bg-emerald-50 text-[#114234] border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-[#bef238]" />
                  <span>🎬 Video ({allVideoItems.length})</span>
                </button>
              )}

              {/* Selected Filter Tab */}
              <button
                onClick={() => setActiveFilter(activeFilter === "selected" ? "all" : "selected")}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeFilter === "selected"
                    ? "bg-[#114234] text-white shadow-xs ring-2 ring-[#bef238]"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#bef238]" />
                <span>Terpilih ({selectedIds.size}{gallery?.max_selections ? ` / ${gallery.max_selections}` : ""})</span>
              </button>
            </div>

            {/* Right: Search Box */}
            <div className="relative flex-1 md:w-64 md:flex-initial">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama file..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Responsive Media Grid / Folder Section                   */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-[1560px] mx-auto px-4 sm:px-8 py-6 sm:py-8 w-full flex-1 space-y-6">

        {/* 1. Subfolder Overview Cards Deck (Shown when viewing All Photos & folders exist) */}
        {hasSubfolders && activeCategory === "all" && activeFilter === "all" && !searchQuery && (
          <div className="p-4 sm:p-5 bg-zinc-50 rounded-3xl border border-zinc-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#114234]" />
                <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 uppercase tracking-wider">
                  Kategori Folder Acara ({subfolders.length} Folder)
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium hidden sm:inline">
                Klik folder untuk melihat foto per kategori
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {subfolders.map((folder) => {
                const count = subfolderMap.get(folder) || 0;
                const folderPhotos = allPhotoItems.filter((p) => (p.folder_name || "").trim() === folder);
                const sampleThumb = folderPhotos[0]?.thumbnail_url;

                return (
                  <button
                    key={folder}
                    onClick={() => setActiveCategory(`folder:${folder}`)}
                    className="group text-left p-3 rounded-2xl bg-white border border-zinc-200 hover:border-[#114234] hover:shadow-md transition-all flex flex-col justify-between gap-2.5 active:scale-98"
                  >
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100">
                      {sampleThumb ? (
                        <GalleryImage
                          src={sampleThumb}
                          alt={folder}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                          <Folder className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                        <Folder className="w-3 h-3 text-[#bef238]" />
                        <span>{count} Foto</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 group-hover:text-[#114234] truncate" title={folder}>
                        {folder}
                      </h4>
                      <span className="text-[11px] text-emerald-800 font-semibold group-hover:underline flex items-center gap-1 mt-0.5">
                        Buka Folder <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Video Shortcut Card in Folder Deck */}
              {hasVideos && (
                <button
                  onClick={() => setActiveCategory("__videos__")}
                  className="group text-left p-3 rounded-2xl bg-gradient-to-br from-[#114234] to-[#0a2920] text-white border border-emerald-700/60 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 active:scale-98"
                >
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-black/30 border border-emerald-600/30 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                      <Video className="w-3 h-3 text-[#bef238]" />
                      <span>{allVideoItems.length} Video</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white truncate">
                      Video Dokumentasi
                    </h4>
                    <span className="text-[11px] text-[#bef238] font-semibold flex items-center gap-1 mt-0.5">
                      Tonton Video <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. Active Subfolder Banner (When browsing inside a specific subfolder) */}
        {activeCategory.startsWith("folder:") && (
          <div className="p-4 rounded-2xl bg-[#114234] text-white flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#09261d] text-[#bef238] flex items-center justify-center border border-emerald-700">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Kategori Folder</span>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>{activeCategory.slice(7)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#bef238] text-[#114234] font-bold">
                    {filteredPhotos.length} Foto
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => setActiveCategory("all")}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors shrink-0"
            >
              ✕ Tampilkan Semua
            </button>
          </div>
        )}

        {/* 3. Dedicated Video Section (When activeCategory === '__videos__') */}
        {activeCategory === "__videos__" ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-[#114234]" />
                <h2 className="text-base sm:text-lg font-extrabold text-zinc-950">
                  Video Dokumentasi Acara ({allVideoItems.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveCategory("all")}
                className="text-xs font-bold text-[#114234] hover:underline"
              >
                ← Kembali ke Galeri Foto
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allVideoItems.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className="group relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border-2 border-transparent hover:border-[#114234] cursor-pointer shadow-md transition-all"
                >
                  {/* Thumbnail / Poster */}
                  <img
                    src={video.thumbnail_url || `https://drive.google.com/thumbnail?id=${video.drive_file_id}&sz=w800`}
                    alt={video.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Video Metadata */}
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white flex items-end justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#bef238] block">
                        🎬 Video Player
                      </span>
                      <h4 className="text-xs font-bold truncate text-white" title={video.filename}>
                        {video.filename}
                      </h4>
                    </div>

                    {gallery?.allow_download && (
                      <a
                        href={`/api/gallery/${token}/download/${video.id}`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white shrink-0"
                        title="Download Video"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="p-16 text-center text-zinc-400">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-800">Tidak ada foto yang cocok</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                  Tidak ditemukan foto dengan kata kunci <strong className="text-zinc-700">"{searchQuery}"</strong>.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-[#114234] hover:bg-[#0d3429] text-[#bef238] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Hapus Pencarian
                </button>
              </>
            ) : (
              <>
                <CheckSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-800">
                  {activeFilter === "selected" ? "Belum ada foto yang dipilih" : "Foto Belum Tersedia"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                  {activeFilter === "selected"
                    ? "Pilih foto favorit Anda dari galeri dengan mengklik tombol centang pada foto."
                    : gallery?.error_message
                    ? gallery.error_message
                    : "Foto sedang disiapkan oleh fotografer atau sinkronisasi folder Google Drive sedang berjalan."}
                </p>
                {activeFilter === "selected" && (
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="px-4 py-2 bg-[#114234] text-white text-xs font-bold rounded-xl"
                  >
                    Lihat Semua Foto
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          /* 4. Photos Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredPhotos.map((photo, index) => {
              const isSelected = selectedIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  className={`group relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100 cursor-pointer transition-all duration-200 border-2 ${
                    isSelected
                      ? "border-[#114234] ring-2 ring-[#bef238] shadow-md scale-[0.99]"
                      : "border-transparent hover:border-zinc-300 shadow-xs"
                  }`}
                >
                  <GalleryImage
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    index={index}
                  />

                  {/* Gradient bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Selection Button */}
                  <button
                    onClick={(e) => toggleSelect(photo.id, e)}
                    className={`absolute top-2.5 left-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-150 z-20 ${
                      isSelected
                        ? "bg-[#114234] text-[#bef238] shadow-md scale-105"
                        : "bg-black/40 hover:bg-black/60 text-white border border-white/40"
                    }`}
                    title={isSelected ? "Batal pilih foto" : "Pilih foto"}
                  >
                    <Check className={`w-4 h-4 stroke-[2.5] ${isSelected ? "text-[#bef238]" : "text-white"}`} />
                  </button>

                  {/* Subfolder Badge (if photo belongs to a subfolder) */}
                  {photo.folder_name && activeCategory === "all" && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-mono font-bold text-zinc-200 z-10 flex items-center gap-1">
                      <Folder className="w-2.5 h-2.5 text-[#bef238]" />
                      <span className="truncate max-w-[70px]">{photo.folder_name}</span>
                    </div>
                  )}

                  {/* Download Button */}
                  {gallery?.allow_download && (
                    <a
                      href={`/api/gallery/${token}/download/${photo.id}`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/40 flex items-center justify-center transition-all duration-150 z-20 opacity-0 group-hover:opacity-100"
                      title="Download HD photo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Filename & Zoom trigger on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 text-white flex items-center justify-between text-[11px] font-mono z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <span className="truncate max-w-[100px]">{photo.filename}</span>
                    <ZoomIn className="w-3.5 h-3.5 text-white/80" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Floating Bottom Selection Bar                                */}
      {/* ------------------------------------------------------------- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-fadeIn">
          <div className="bg-[#114234] text-white py-3 px-5 sm:px-6 rounded-2xl shadow-2xl border border-emerald-700/60 flex items-center gap-4 sm:gap-6 pointer-events-auto max-w-xl w-full justify-between backdrop-blur-md">
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center font-extrabold text-xs">
                {selectedIds.size}
              </div>
              <div className="leading-tight">
                <span className="text-xs sm:text-sm font-extrabold text-white block">
                  {selectedIds.size} {selectedIds.size === 1 ? "foto" : "foto"} terpilih {gallery?.max_selections ? `(maks ${gallery.max_selections})` : ""}
                </span>
                <span className="text-[11px] text-emerald-200 font-medium block">
                  Siap dikirimkan ke fotografer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter(activeFilter === "selected" ? "all" : "selected")}
                className="px-3 py-2 rounded-xl bg-[#185342] hover:bg-[#1e614d] text-emerald-100 text-xs font-semibold transition-colors"
              >
                {activeFilter === "selected" ? "Lihat Semua" : "Lihat Pilihan"}
              </button>

              <button
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95"
              >
                <span>Kirim Pilihan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Video Player Modal                                            */}
      {/* ------------------------------------------------------------- */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10 z-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#bef238] text-[#114234] flex items-center justify-center font-bold">
                <Film className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{activeVideo.filename}</h3>
                <span className="text-[11px] text-zinc-400">Video Dokumentasi Acara</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {gallery?.allow_download && (
                <a
                  href={`/api/gallery/${token}/download/${activeVideo.id}`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download Video</span>
                </a>
              )}
              <button
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Tutup Video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Video Player Frame */}
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                src={activeVideo.video_stream_url || `https://drive.google.com/file/d/${activeVideo.drive_file_id}/preview`}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                title={activeVideo.filename}
              />
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[11px] text-zinc-400">
            Pemutar video Google Drive. Putar langsung tanpa perlu mengunduh file video ke perangkat Anda.
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Fullscreen Photo Lightbox with Isolated Zoom & Zero Lag       */}
      {/* ------------------------------------------------------------- */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-fadeIn">
          
          {/* Lightbox Top Header Bar */}
          <div className="p-3 sm:p-5 flex items-center justify-between text-white z-20 gap-3 border-b border-white/10 bg-black/60 backdrop-blur-md">
            
            {/* Left: Filename & Lightbox Index & Selection Counter */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="font-mono text-xs text-zinc-300 truncate max-w-[110px] sm:max-w-[220px]" title={filteredPhotos[lightboxIndex].filename}>
                {filteredPhotos[lightboxIndex].filename}
              </div>

              <span className="text-zinc-600 hidden sm:inline">•</span>

              <span className="text-xs text-zinc-400 shrink-0">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </span>

              {/* High-visibility Selection Counter Badge */}
              <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#114234] border border-[#bef238]/40 text-xs font-semibold text-white shadow-xs">
                <CheckSquare className="w-3.5 h-3.5 text-[#bef238]" />
                <span>
                  Terpilih: <strong className="text-[#bef238] font-bold">{selectedIds.size}</strong>
                  {gallery?.max_selections ? ` / ${gallery.max_selections}` : ""} foto
                </span>
              </div>
            </div>

            {/* Right: Zoom Controls, Select Button, Download, Close */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Isolated Zoom Controls Toolbar */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/10 rounded-xl border border-white/15 backdrop-blur-sm">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                  title="Perkecil Zoom (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-2 py-0.5 text-[11px] font-mono font-bold text-[#bef238] hover:underline"
                  title="Reset Zoom ke 100%"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 3.5}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                  title="Perbesar Zoom (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Main Select Button in Lightbox with Real-time Count */}
              <button
                onClick={() => toggleSelect(filteredPhotos[lightboxIndex].id)}
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                  selectedIds.has(filteredPhotos[lightboxIndex].id)
                    ? "bg-[#bef238] text-[#114234] ring-2 ring-[#bef238]"
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/25"
                }`}
                title={selectedIds.has(filteredPhotos[lightboxIndex].id) ? "Batal pilih foto" : "Pilih foto ini"}
              >
                <Check className={`w-4 h-4 stroke-[3] ${selectedIds.has(filteredPhotos[lightboxIndex].id) ? "text-[#114234]" : "text-white"}`} />
                <span>
                  {selectedIds.has(filteredPhotos[lightboxIndex].id)
                    ? `Foto Terpilih (${selectedIds.size}${gallery?.max_selections ? `/${gallery.max_selections}` : ""})`
                    : `Pilih Foto (${selectedIds.size} dipilih)`}
                </span>
              </button>

              {/* Download Button */}
              {gallery?.allow_download && (
                <a
                  href={`/api/gallery/${token}/download/${filteredPhotos[lightboxIndex].id}`}
                  download
                  className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center gap-1.5"
                  title="Download foto resolusi tinggi"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Download</span>
                </a>
              )}

              {/* Close Button */}
              <button
                onClick={() => { setLightboxIndex(null); setZoomScale(1); }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Tutup Preview (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Image Canvas with Isolated Zoom & Pan */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden select-none p-2 sm:p-6"
            style={{ touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handlePhotoTap}
          >
            {/* Previous Navigation Button (hidden when zoomed in to avoid accidental taps) */}
            {zoomScale === 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1));
                }}
                className="absolute left-3 sm:left-6 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all z-30 shadow-lg active:scale-95"
                title="Foto Sebelumnya (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Photo Stage (Isolated zoom transform applied strictly to image element) */}
            <div className="relative w-full h-full max-h-[82vh] flex items-center justify-center">
              <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{
                  transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0) scale(${zoomScale})`,
                  cursor: zoomScale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                  willChange: "transform",
                }}
              >
                {/* Instant Thumbnail Placeholder (0ms delay) */}
                <img
                  src={filteredPhotos[lightboxIndex].thumbnail_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute max-h-full max-w-full object-contain pointer-events-none filter blur-[1px] opacity-80"
                />

                {/* Full HD 2048px Preloaded Preview */}
                <img
                  src={getHDPreviewUrl(filteredPhotos[lightboxIndex].preview_url)}
                  alt={filteredPhotos[lightboxIndex].filename}
                  className="relative max-h-full max-w-full object-contain select-none pointer-events-none z-10"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>

            {/* Next Navigation Button */}
            {zoomScale === 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-3 sm:right-6 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all z-30 shadow-lg active:scale-95"
                title="Foto Selanjutnya (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Subtle Zoom Hint Banner */}
            {zoomScale > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 border border-white/20 text-white text-[11px] font-medium z-30 pointer-events-none flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-[#bef238]" />
                <span>Geser foto untuk melihat detail • Ketuk 2x untuk reset zoom</span>
              </div>
            )}
          </div>

          {/* Lightbox Bottom Info Bar with Mobile Counter */}
          <div className="p-3 text-center text-[11px] text-zinc-400 bg-black/60 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 sm:px-6">
            <span className="hidden sm:inline">
              Gunakan tombol panah ← / → di keyboard atau geser layar • Spasi untuk memilih foto • Ketuk 2x untuk zoom
            </span>
            <span className="sm:hidden font-mono text-[10px]">
              Geser kanan/kiri untuk ganti foto • Ketuk 2x untuk zoom foto
            </span>

            {/* Mobile Selection Counter */}
            <div className="md:hidden font-bold text-xs text-[#bef238]">
              {selectedIds.size}{gallery?.max_selections ? `/${gallery.max_selections}` : ""} Foto Terpilih
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Submit Selection Confirmation Modal                          */}
      {/* ------------------------------------------------------------- */}
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
              You have selected <strong>{selectedIds.size} photos</strong> from {gallery?.event_name}. Once submitted, your selection will be sent directly to your photographer.
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#114234] hover:bg-[#0d3429] text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#bef238]" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#bef238]" />
                      <span>Submit Selection ({selectedIds.size})</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Client Limit Selection Toast Alert */}
      {limitToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white text-xs sm:text-sm font-medium shadow-2xl animate-slideUp pointer-events-none">
          <AlertCircle className="w-4 h-4 text-[#bef238] shrink-0" />
          <span>{limitToast}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        © Copyright 2026 Studioin Photo Proofing. Powered by Studioin Creative.
      </footer>
    </div>
  );
}
