"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const mockPhotoBankUrls = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1529636798458-92182e662485?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80",
];

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
  className,
  index = 0,
  priority = false,
}: GalleryImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setErrorCount(0);
  }, [src]);

  const handleError = () => {
    if (errorCount === 0) {
      setErrorCount(1);
      // First attempt: try drive.google.com thumbnail link if file ID can be parsed
      const match = src.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setCurrentSrc(`https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`);
        return;
      }
    }
    
    // Final fallback: use high definition photoshoot sample image
    const fallback = mockPhotoBankUrls[index % mockPhotoBankUrls.length];
    setCurrentSrc(fallback);
  };

  return (
    <Image
      src={currentSrc || mockPhotoBankUrls[index % mockPhotoBankUrls.length]}
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
