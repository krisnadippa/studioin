"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Loader2 } from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (!data?.authenticated || !data?.user) {
            router.replace("/admin/login");
          } else if (data.user.role !== "superadmin") {
            router.replace("/admin");
          } else {
            setIsAuthorized(true);
            setCheckingAuth(false);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          router.replace("/admin/login");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingAuth || !isAuthorized) {
    return (
      <div className="h-screen w-screen bg-[#114234] flex flex-col items-center justify-center text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#bef238]" />
          <span className="text-xs font-semibold tracking-wider text-emerald-200 uppercase">
            Verifying Super Admin Privileges...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f8faf9] flex overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
