"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Images,
  CheckCircle2,
  Clock,
  AlertCircle,
  CheckSquare,
  PlusCircle,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { GalleryStatusBadge } from "@/components/admin/GalleryStatusBadge";
import { Gallery } from "@/lib/db/types";

interface DashboardStats {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
  pending_selections: number;
}

export default function AdminDashboardPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    pending_selections: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/galleries");
      if (res.ok) {
        const data = await res.json();
        setGalleries(data.galleries || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setCurrentUser(d.user);
      })
      .catch(() => {});
  }, []);

  const copyClientUrl = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/gallery/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getExpirationText = (expiresAt: string, status: string) => {
    if (status === "expired") return "Expired";
    const now = Date.now();
    const expTime = new Date(expiresAt).getTime();
    const diff = expTime - now;

    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return `Expires in ${days}d ${remHours}h`;
    }
    return `Expires in ${hours}h`;
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminTopNav
        title={currentUser?.name ? `Dashboard — Galeri ${currentUser.name}` : "Photographer Dashboard"}
        description={
          currentUser?.name
            ? `Selamat datang kembali, ${currentUser.name}! Kelola galeri photoshoot dan pantau seleksi foto klien Anda.`
            : "Overview of client photo proofing galleries, status, and pending selections."
        }
        actionLabel="Create Gallery"
        actionHref="/admin/galleries/new"
      />

      <main className="p-6 sm:p-8 max-w-[1440px] w-full mx-auto space-y-8">
        
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <AdminStatCard
            title="Total Galleries"
            value={loading ? "-" : stats.total}
            subtext="All photoshoot albums"
            icon={Images}
            accent="green"
          />
          <AdminStatCard
            title="Active Galleries"
            value={loading ? "-" : stats.active}
            subtext="Accessible by clients"
            icon={CheckCircle2}
            accent="lime"
          />
          <AdminStatCard
            title="Expiring Soon"
            value={loading ? "-" : stats.expiring_soon}
            subtext="Within 48 hours"
            icon={Clock}
            accent="amber"
          />
          <AdminStatCard
            title="Expired Galleries"
            value={loading ? "-" : stats.expired}
            subtext="Can be extended"
            icon={AlertCircle}
            accent="zinc"
          />
          <AdminStatCard
            title="Pending Selections"
            value={loading ? "-" : stats.pending_selections}
            subtext="Submitted by clients"
            icon={CheckSquare}
            accent="lime"
          />
        </section>

        {/* Quick Action Banner */}
        <section className="bg-[#114234] rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-md">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#1b5645] text-[#bef238] border border-[#2b6553] mb-3">
              {currentUser?.name ? `Studio Galeri ${currentUser.name}` : "Google Drive Workflow"}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Ready to create a new client proofing gallery?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 leading-relaxed">
              Upload original high-res photos to Google Drive, paste the folder link, and Studioin will generate fast WebP previews automatically.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <Link
              href="/admin/galleries/new"
              className="inline-flex items-center gap-2 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-xs sm:text-sm py-3 px-5 rounded-xl transition-all shadow-md active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Gallery</span>
            </Link>
          </div>
        </section>

        {/* Recent Galleries Section */}
        <section className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-950">Recent Client Galleries</h3>
              <p className="text-xs text-zinc-500 font-medium">Photoshoot proofing links sent to clients</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboardData}
                className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Link
                href="/admin/galleries"
                className="text-xs font-bold text-[#114234] hover:text-[#0d3429] hover:underline inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-zinc-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : galleries.length === 0 ? (
            <div className="p-12 text-center">
              <Images className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-zinc-800">No galleries created yet</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                Create your first gallery using a Google Drive folder link to share photo proofing with clients.
              </p>
              <Link
                href="/admin/galleries/new"
                className="inline-flex items-center gap-2 bg-[#bef238] text-[#114234] font-bold text-xs py-2 px-4 rounded-xl"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Gallery</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                    <th className="py-3.5 px-6">Client & Event</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Photos</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Expiration</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {galleries.slice(0, 5).map((gallery) => (
                    <tr key={gallery.id} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Client & Event */}
                      <td className="py-4 px-6">
                        <Link href={`/admin/galleries/${gallery.id}`} className="block group">
                          <span className="font-bold text-zinc-950 text-sm group-hover:text-[#114234] transition-colors block">
                            {gallery.client_name}
                          </span>
                          <span className="text-zinc-500 text-[11px] block mt-0.5">
                            {gallery.event_name}
                          </span>
                        </Link>
                      </td>

                      {/* Event Date */}
                      <td className="py-4 px-6 text-zinc-600 font-medium">
                        {gallery.event_date}
                      </td>

                      {/* Photo Count */}
                      <td className="py-4 px-6 font-semibold text-zinc-900">
                        {gallery.total_photos.toLocaleString()} Photos
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <GalleryStatusBadge status={gallery.status} />
                      </td>

                      {/* Expiration */}
                      <td className="py-4 px-6 font-medium text-zinc-600">
                        {getExpirationText(gallery.expires_at, gallery.status)}
                      </td>

                      {/* Action Links */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => copyClientUrl(gallery.access_token)}
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
                            title="Copy Client Proofing URL"
                          >
                            {copiedToken === gallery.access_token ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <Link
                            href={`/gallery/${gallery.access_token}`}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
                            title="Open Client View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/admin/galleries/${gallery.id}`}
                            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
