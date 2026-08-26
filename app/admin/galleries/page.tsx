"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Images,
  Search,
  PlusCircle,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Clock,
  CheckSquare,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { GalleryStatusBadge } from "@/components/admin/GalleryStatusBadge";
import { Gallery } from "@/lib/db/types";

export default function AdminGalleriesListPage() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [filteredGalleries, setFilteredGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDanger: boolean;
    onConfirm: () => void;
  } | null>(null);

  const openConfirmModal = (
    title: string,
    description: string,
    actionLabel: string,
    isDanger: boolean,
    onConfirm: () => void
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      description,
      actionLabel,
      isDanger,
      onConfirm,
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("deleted") === "true") {
      showToast("Gallery successfully deleted!");
      router.replace("/admin/galleries");
    }
  }, []);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/galleries");
      if (res.ok) {
        const data = await res.json();
        setGalleries(data.galleries || []);
      }
    } catch (err) {
      console.error("Failed to fetch galleries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  useEffect(() => {
    let list = [...galleries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.client_name.toLowerCase().includes(q) ||
          g.event_name.toLowerCase().includes(q) ||
          g.access_token.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((g) => {
        if (statusFilter === "active") return g.status === "ready";
        if (statusFilter === "processing") return g.status === "processing" || g.status === "preparing";
        if (statusFilter === "expired") return g.status === "expired";
        return true;
      });
    }

    setFilteredGalleries(list);
  }, [galleries, searchQuery, statusFilter]);

  const copyClientUrl = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/gallery/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleExtend = (id: string) => {
    openConfirmModal(
      "Extend Gallery Expiration",
      "Are you sure you want to extend this gallery's expiration by 3 days?",
      "Extend +3 Days",
      false,
      async () => {
        setActionLoadingId(id);
        try {
          const res = await fetch(`/api/admin/galleries/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ additional_days: 3 }),
          });
          if (res.ok) {
            fetchGalleries();
            showToast("Gallery extended by +3 days successfully!");
          } else {
            showToast("Failed to extend gallery.", "error");
          }
        } catch {
          showToast("An error occurred while extending the gallery.", "error");
        } finally {
          setActionLoadingId(null);
          setConfirmModal(null);
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    openConfirmModal(
      "Delete Gallery",
      "Are you sure you want to delete this gallery? All selection records for this gallery will be permanently removed.",
      "Delete Gallery",
      true,
      async () => {
        setActionLoadingId(id);
        try {
          const res = await fetch(`/api/admin/galleries/${id}`, { method: "DELETE" });
          if (res.ok) {
            setGalleries(galleries.filter((g) => g.id !== id));
            showToast("Gallery successfully deleted!");
          } else {
            showToast("Failed to delete gallery.", "error");
          }
        } catch {
          showToast("An error occurred while deleting the gallery.", "error");
        } finally {
          setActionLoadingId(null);
          setConfirmModal(null);
        }
      }
    );
  };

  const getExpirationBadge = (expiresAt: string, status: string) => {
    if (status === "expired") {
      return (
        <span className="text-zinc-400 font-medium text-xs">Expired</span>
      );
    }
    const now = Date.now();
    const expTime = new Date(expiresAt).getTime();
    const diff = expTime - now;

    if (diff <= 0) {
      return <span className="text-zinc-400 font-medium text-xs">Expired</span>;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    return (
      <span className="text-xs font-semibold text-zinc-700">
        {days > 0 ? `${days}d ${remHours}h left` : `${hours}h left`}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminTopNav
        title="Client Proofing Galleries"
        description="Manage all client photoshoot collections and track active proofing links."
        actionLabel="New Gallery"
        actionHref="/admin/galleries/new"
      />

      <main className="p-6 sm:p-8 max-w-[1440px] w-full mx-auto space-y-6">
        
        {/* Controls Bar: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client or event name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#114234] focus:ring-1 focus:ring-[#114234]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto text-xs font-semibold shrink-0">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "processing", label: "Processing" },
              { id: "expired", label: "Expired" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === tab.id
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Galleries Table Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-zinc-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredGalleries.length === 0 ? (
            <div className="p-16 text-center">
              <Images className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-zinc-800">No galleries found</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search query or filter."
                  : "Start by creating your first client proofing gallery."}
              </p>
              <Link
                href="/admin/galleries/new"
                className="inline-flex items-center gap-2 bg-[#bef238] text-[#114234] font-bold text-xs py-2.5 px-4 rounded-xl"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Gallery</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                    <th className="py-4 px-6">Client / Event</th>
                    <th className="py-4 px-6">Event Date</th>
                    <th className="py-4 px-6">Total Photos</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Expiration</th>
                    <th className="py-4 px-6">Access Link</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {filteredGalleries.map((gallery) => (
                    <tr key={gallery.id} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Client / Event */}
                      <td className="py-4 px-6">
                        <Link href={`/admin/galleries/${gallery.id}`} className="block group">
                          <span className="font-bold text-zinc-950 text-sm group-hover:text-[#114234] transition-colors block">
                            {gallery.client_name}
                          </span>
                          <span className="text-zinc-500 text-[11px] flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span>{gallery.event_name}</span>
                            {gallery.has_pin && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/50 font-mono text-[9px] font-bold">
                                <Lock className="w-2.5 h-2.5" />
                                <span>PIN: {gallery.pin_code || "Active"}</span>
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>

                      {/* Event Date */}
                      <td className="py-4 px-6 text-zinc-600 font-medium">
                        {gallery.event_date}
                      </td>

                      {/* Total Photos */}
                      <td className="py-4 px-6 font-semibold text-zinc-900">
                        {gallery.total_photos.toLocaleString()} Photos
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        <GalleryStatusBadge status={gallery.status} />
                      </td>

                      {/* Expiration */}
                      <td className="py-4 px-6">
                        {getExpirationBadge(gallery.expires_at, gallery.status)}
                      </td>

                      {/* Access Link Copy */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => copyClientUrl(gallery.access_token)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-mono text-[11px] transition-colors"
                        >
                          {copiedToken === gallery.access_token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>/gallery/{gallery.access_token}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/gallery/${gallery.access_token}`}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                            title="Open Client View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/admin/galleries/${gallery.id}/selections`}
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                            title="View Client Selections"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleExtend(gallery.id)}
                            disabled={actionLoadingId === gallery.id}
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                            title="Extend Gallery +3 Days"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/admin/galleries/${gallery.id}`}
                            className="px-3 py-1.5 rounded-lg bg-[#114234] hover:bg-[#0d3429] text-white font-semibold"
                          >
                            Manage
                          </Link>

                          <button
                            onClick={() => handleDelete(gallery.id)}
                            disabled={actionLoadingId === gallery.id}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"
                            title="Delete Gallery"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-zinc-100/80 flex flex-col space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.isDanger ? "bg-red-50 text-red-600" : "bg-emerald-50 text-[#114234]"
              }`}>
                {confirmModal.isDanger ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-400">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-98 cursor-pointer ${
                  confirmModal.isDanger 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-[#114234] hover:bg-[#0d3429]"
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-white text-xs sm:text-sm font-medium shadow-2xl animate-slideUp pointer-events-none">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#bef238] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
