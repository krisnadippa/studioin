import Link from "next/link";
import { Clock } from "lucide-react";

export default function GalleryExpiredPage() {
  return (
    <div className="min-h-screen bg-[#114234] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#0e382b] border border-emerald-800/60 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#185342] text-[#bef238] border border-[#2b6553] flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Gallery Expired</h1>
        <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
          This client photo proofing gallery is no longer available. Please contact the photographer if you need to extend access.
        </p>
        <div className="pt-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#bef238] text-[#114234] font-bold text-xs shadow-md"
          >
            <span>Back to Studioin Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
