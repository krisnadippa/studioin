"use client";

import Link from "next/link";
import { PlusCircle, ExternalLink, Crown } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminTopNavProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function AdminTopNav({
  title,
  description,
  actionLabel,
  actionHref,
}: AdminTopNavProps) {
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: "superadmin" | "admin";
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="bg-white border-b border-zinc-200/80 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 bg-zinc-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View Site</span>
        </Link>

        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#114234] bg-[#bef238] hover:bg-[#b2e82e] transition-all shadow-xs active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionLabel}</span>
          </Link>
        )}

        {/* Studio / User Identity Badge */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-200 ml-1">
            <div className="w-9 h-9 rounded-xl bg-[#114234] text-[#bef238] font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "ST"}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-zinc-900 block leading-tight">
                Galeri {user.name}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {user.role === "superadmin" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    <Crown className="w-2.5 h-2.5 text-amber-600" /> Super Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Fotografer
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
