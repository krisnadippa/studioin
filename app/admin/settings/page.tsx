"use client";

import { useState } from "react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import {
  ShieldCheck,
  Cloud,
  HardDrive,
  Key,
  CheckCircle2,
  Save,
  Clock,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [defaultExpiration, setDefaultExpiration] = useState(3);
  const [retentionDays, setRetentionDays] = useState(7);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminTopNav
        title="Settings & Storage Configuration"
        description="Manage Google Drive integration, storage retention rules, and proofing defaults."
      />

      <main className="p-6 sm:p-8 max-w-3xl w-full mx-auto space-y-6">
        
        {saved && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Storage & Google Drive Card */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#114234] flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Storage Architecture Rules</h3>
                <p className="text-xs text-zinc-500">Google Drive & Object Storage connection status</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-600">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Original Photos:</strong> Safely preserved in your Google Drive folder. Studioin never downloads or deletes original files.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Temporary Previews:</strong> Cloudflare R2 / local proxy delivers optimized WebP thumbnails (400px) and previews (1600px) on demand.
                </p>
              </div>
            </div>
          </div>

          {/* Proofing Defaults & Retention Policy */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-lime-50 text-[#114234] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Lifecycle & Retention Policy</h3>
                <p className="text-xs text-zinc-500">Automatic gallery expiration and preview cleanup schedule</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Default Gallery Expiration
                </label>
                <select
                  value={defaultExpiration}
                  onChange={(e) => setDefaultExpiration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-[#114234]"
                >
                  <option value={3}>3 Days (Recommended)</option>
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Preview Storage Retention
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-[#114234]"
                >
                  <option value={7}>7 Days After Creation</option>
                  <option value={14}>14 Days After Creation</option>
                  <option value={30}>30 Days After Creation</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              When a gallery expires, clients can no longer access it. Previews are deleted after the retention period, while client selections remain permanently recorded.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
