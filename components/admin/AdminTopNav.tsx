import Link from "next/link";
import { PlusCircle, ExternalLink } from "lucide-react";

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
      </div>
    </header>
  );
}
