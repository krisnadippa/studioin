import { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  accent?: "green" | "lime" | "amber" | "zinc";
}

export function AdminStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  accent = "zinc",
}: AdminStatCardProps) {
  const accentStyles = {
    green: "border-l-[#114234] text-[#114234]",
    lime: "border-l-[#bef238] text-[#114234]",
    amber: "border-l-amber-400 text-amber-900",
    zinc: "border-l-zinc-300 text-zinc-800",
  };

  return (
    <div className={`bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs border-l-4 ${accentStyles[accent]} flex items-start justify-between`}>
      <div>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
          {title}
        </span>
        <div className="text-3xl font-extrabold text-zinc-950 tracking-tight">
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-zinc-500 font-medium mt-1">
            {subtext}
          </p>
        )}
      </div>
      <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}
