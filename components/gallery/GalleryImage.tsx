"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

interface GalleryImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  index?: number;
  priority?: boolean;
}

export function GalleryImage({
  src,
  alt,
  fill = true,
  sizes,
  className = "",
  index = 0,
  priority = false,
}: GalleryImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [errorStep, setErrorStep] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setErrorStep(0);
    setHasFailed(false);
  }, [src]);

  const handleError = () => {
    // Extract drive file ID if available
    const match = currentSrc?.match(/(?:id=|\/d\/|drive-storage\/)([a-zA-Z0-9_-]+)/);
    const driveId = match ? match[1] : null;

    if (errorStep === 0 && driveId) {
      setErrorStep(1);
      // Attempt 1: Standard Google Drive thumbnail
      setCurrentSrc(`https://drive.google.com/thumbnail?id=${driveId}&sz=w800`);
      return;
    }

    if (errorStep === 1 && driveId) {
      setErrorStep(2);
      // Attempt 2: Direct Google Usercontent endpoint
      setCurrentSrc(`https://lh3.googleusercontent.com/d/${driveId}=w800`);
      return;
    }

    // Clean fail without showing mock/template photos
    setHasFailed(true);
  };

  if (hasFailed || !currentSrc) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-400 p-3 select-none text-center ${className}`}>
        <ImageOff className="w-5 h-5 mb-1.5 text-zinc-500" />
        <span className="text-[10px] font-mono text-zinc-300 truncate max-w-full px-1">
          {alt || "Foto"}
        </span>
        <span className="text-[9px] text-zinc-500 mt-0.5 line-clamp-2 px-1">
          Gagal memuat foto (periksa izin Google Drive)
        </span>
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized
      onError={handleError}
    />
  );
}

