"use client";

import { useEffect, useState, use, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
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
  Loader2,
  AlertCircle,
  Eye,
  Send,
  Camera,
  Search,
  Download,
} from "lucide-react";

interface PublicGallery {
  id: string;
  client_name: string;
  event_name: string;
  event_date: string;
  status: string;
  total_photos: number;
  expires_at: string;
  has_pin: boolean;
  max_selections: number;
  allow_download: boolean;
}

interface PublicPhoto {
  id: string;
  filename: string;
  thumbnail_url: string;
  preview_url: string;
  width?: number;
  height?: number;
  sort_order: number;
}

// Helper to convert size parameter to a high-definition 2048px (2K) format
const getHDPreviewUrl = (url: string) => {
  if (!url) return url;
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

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
        setError("This gallery has expired. Please contact the photographer if you need access again.");
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
        throw new Error(data.error || "Gallery not found");
      }

      setGallery(data.gallery);
      setPhotos(data.photos || []);
      setRequiresPin(false);

      // Restore saved local selections if available
      try {
        const saved = localStorage.getItem(`studioin_sel_${data.gallery.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSelectedIds(new Set(parsed));
          }
        }
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load gallery";
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
      showLimitToast(`Limit selections reached (${gallery.max_selections} photos). Please unselect another photo first.`);
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
        throw new Error(data.error || "Incorrect PIN. Please try again.");
      }

      fetchGallery();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid PIN";
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

  const filteredPhotos = useMemo(() => {
    let list = photos;
    if (activeFilter === "selected") {
      list = list.filter((p) => selectedIds.has(p.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.filename.toLowerCase().includes(q));
    }
    return list;
  }, [photos, activeFilter, selectedIds, searchQuery]);

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Gallery Expired or Unavailable</h1>
          <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#bef238] text-[#114234] font-bold text-xs shadow-md"
            >
              <span>Visit Studioin Homepage</span>
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
                Protected Client Gallery
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {gallery?.client_name || "Client Gallery"}
              </h1>
              <p className="text-xs text-emerald-200/80 mt-1.5 leading-relaxed">
                Please enter the {pinLength}-digit PIN provided by your photographer to access your photos.
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
                  {pinLength === 4 ? "PIN has 6 digits?" : "PIN has 4 digits?"}
                </button>
                
                {otp.some(d => d !== "") && (
                  <button
                    type="button"
                    onClick={() => setOtp(Array(pinLength).fill(""))}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={pinSubmitting || otp.some(digit => digit === "")}
                className="w-full py-3.5 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-sm rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-40 disabled:pointer-events-none"
              >
                {pinSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying PIN...
                  </span>
                ) : (
                  "Open Gallery"
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
      {/* Gallery Filter & Status Bar                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-zinc-100 bg-zinc-50/80 sticky top-[73px] sm:top-[65px] z-30 backdrop-blur-sm">
        <div className="max-w-[1560px] mx-auto px-5 sm:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === "all"
                  ? "bg-[#114234] text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              All Photos ({photos.length})
            </button>

            <button
              onClick={() => setActiveFilter("selected")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === "selected"
                  ? "bg-[#114234] text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#bef238]" />
              <span>Selected ({selectedIds.size}{gallery?.max_selections ? ` / ${gallery.max_selections}` : ""})</span>
            </button>
          </div>

          {/* Right: Search Box & Help Label */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <span className="hidden lg:inline-block text-xs text-zinc-400 font-medium whitespace-nowrap">
              Click photo to zoom • Click checkmark to select
            </span>
            
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photo filename..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234] transition-colors"
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
      {/* Main Responsive Photo Grid                                   */}
      {/* ------------------------------------------------------------- */}
      <main className="max-w-[1560px] mx-auto px-4 sm:px-8 py-8 w-full flex-1">
        {filteredPhotos.length === 0 ? (
          <div className="p-16 text-center text-zinc-400">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-800">No matching photos found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                  We couldn't find any photos matching <strong className="text-zinc-700">"{searchQuery}"</strong>. Try checking your spelling or clear the search query to view all photos.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-[#114234] hover:bg-[#0d3429] text-[#bef238] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Clear Search Query
                </button>
              </>
            ) : (
              <>
                <CheckSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-zinc-800">
                  {activeFilter === "selected" ? "No photos selected yet" : "No photos available"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  {activeFilter === "selected"
                    ? "Select photos from the gallery to create your final selection list."
                    : "Photos are currently being processed by the photographer."}
                </p>
                {activeFilter === "selected" && (
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="px-4 py-2 bg-[#114234] text-white text-xs font-bold rounded-xl"
                  >
                    Browse All Photos
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
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
                  <Image
                    src={photo.thumbnail_url}
                    alt={photo.filename}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    loading="lazy"
                    unoptimized
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
                    title={isSelected ? "Unselect photo" : "Select photo"}
                  >
                    <Check className={`w-4 h-4 stroke-[2.5] ${isSelected ? "text-[#bef238]" : "text-white"}`} />
                  </button>

                  {/* Download Button */}
                  {gallery?.allow_download && (
                    <a
                      href={`/api/gallery/${token}/download/${photo.id}`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/40 flex items-center justify-center transition-all duration-150 z-20 opacity-0 group-hover:opacity-100"
                      title="Download HD photo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Filename & Zoom trigger on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 text-white flex items-center justify-between text-[11px] font-mono z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                  {selectedIds.size} {selectedIds.size === 1 ? "photo" : "photos"} selected {gallery?.max_selections ? `(max ${gallery.max_selections})` : ""}
                </span>
                <span className="text-[11px] text-emerald-200 font-medium block">
                  Ready to send to photographer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter(activeFilter === "selected" ? "all" : "selected")}
                className="px-3 py-2 rounded-xl bg-[#185342] hover:bg-[#1e614d] text-emerald-100 text-xs font-semibold transition-colors"
              >
                {activeFilter === "selected" ? "Show All" : "View Selection"}
              </button>

              <button
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95"
              >
                <span>Submit Selection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Photo Fullscreen Lightbox Modal                              */}
      {/* ------------------------------------------------------------- */}
      {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none animate-fadeIn">
          {/* Lightbox Header Bar */}
          <div className="p-4 sm:p-6 flex items-center justify-between text-white z-20 gap-4">
            {/* Left Info: Filename & Counter */}
            <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs text-zinc-300 min-w-0">
              <span className="truncate max-w-[120px] sm:max-w-[200px]" title={filteredPhotos[lightboxIndex].filename}>
                {filteredPhotos[lightboxIndex].filename}
              </span>
              <span className="text-zinc-600 shrink-0">•</span>
              <span className="shrink-0">
                {lightboxIndex + 1} of {filteredPhotos.length}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Select button in Lightbox */}
              <button
                onClick={() => toggleSelect(filteredPhotos[lightboxIndex].id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-colors ${
                  selectedIds.has(filteredPhotos[lightboxIndex].id)
                    ? "bg-[#bef238] text-[#114234]"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
                title={selectedIds.has(filteredPhotos[lightboxIndex].id) ? "Selected" : "Select Photo"}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">
                  {selectedIds.has(filteredPhotos[lightboxIndex].id) ? "Selected" : "Select Photo"}
                </span>
              </button>

              {gallery?.allow_download && (
                <a
                  href={`/api/gallery/${token}/download/${filteredPhotos[lightboxIndex].id}`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                  title="Download HD photo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )}

              {/* Close Lightbox */}
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
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
              onClick={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1))}
              className="absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-colors z-20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Preview Image */}
            <div className="relative w-full h-full max-h-[82vh] flex items-center justify-center">
              <Image
                src={getHDPreviewUrl(filteredPhotos[lightboxIndex].preview_url)}
                alt={filteredPhotos[lightboxIndex].filename}
                fill
                priority
                unoptimized
                className="object-contain"
              />
            </div>

            {/* Next Button */}
            <button
              onClick={() => setLightboxIndex((prev) => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 transition-colors z-20"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Bottom Info Bar */}
          <div className="p-4 text-center text-[11px] text-zinc-500">
            Use Left / Right arrow keys to navigate • Spacebar to Select / Unselect • Esc to close
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
