import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: "ready" | "processing" | "preparing" | "expired" | "failed";
}

export function GalleryStatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active</span>
        </span>
      );
    case "processing":
    case "preparing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-lime-50 text-[#0f3d32] border border-[#bef238]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#114234]" />
          <span>{status === "preparing" ? "Preparing" : "Processing"}</span>
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>Expired</span>
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5" />
          <span>Failed</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
  }
}
