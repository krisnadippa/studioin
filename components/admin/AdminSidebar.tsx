"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Images,
  CheckSquare,
  Settings,
  LogOut,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapse state from localStorage on client side
  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("admin-sidebar-collapsed", String(nextState));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Galleries", href: "/admin/galleries", icon: Images },
    { label: "Selections", href: "/admin/galleries/gal-andi-sinta/selections", icon: CheckSquare },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <aside 
      className={`bg-[#114234] text-white flex flex-col justify-between shrink-0 h-screen border-r border-[#1a5644] select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className={`border-b border-emerald-800/40 flex transition-all duration-300 ${
          isCollapsed ? "p-4 flex-col items-center gap-4" : "p-6 items-center justify-between"
        }`}>
          <Link href="/admin" className={`flex items-center gap-3 group ${isCollapsed ? "justify-center" : ""}`}>
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <Image
                src="/images/logosiputih.png"
                alt="Studioin"
                width={32}
                height={32}
                className="w-7 h-7 object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap overflow-hidden">
                <span className="text-white text-lg font-bold tracking-tight block">Studioin</span>
                <span className="text-[11px] font-medium text-[#bef238] uppercase tracking-wider block">Photo Proofing</span>
              </div>
            )}
          </Link>
          <button 
            onClick={toggleCollapse}
            className="p-1 rounded-lg hover:bg-emerald-800/40 text-emerald-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick Action */}
        <div className={`pt-5 pb-2 transition-all duration-300 ${isCollapsed ? "px-2 flex justify-center" : "px-4"}`}>
          {isCollapsed ? (
            <Link
              href="/admin/galleries/new"
              title="Create New Gallery"
              className="w-10 h-10 flex items-center justify-center bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] rounded-xl transition-all duration-150 shadow-md shadow-lime-950/20 active:scale-98"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              href="/admin/galleries/new"
              className="w-full flex items-center justify-center gap-2 bg-[#bef238] hover:bg-[#b2e82e] text-[#114234] font-bold text-xs py-2.5 px-4 rounded-xl transition-all duration-150 shadow-md shadow-lime-950/20 active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Gallery</span>
            </Link>
          )}
        </div>

        {/* Navigation Links */}
        <nav className={`py-4 space-y-1 transition-all duration-300 ${isCollapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-xl transition-all duration-150 ${
                  isCollapsed
                    ? "justify-center p-2.5 w-10 h-10 mx-auto"
                    : "gap-3 px-3.5 py-2.5 text-sm font-medium"
                } ${
                  isActive
                    ? "bg-[#185342] text-[#bef238] font-semibold"
                    : "text-[#d1e3db] hover:bg-[#154c3c] hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#bef238]" : "text-emerald-300/80"}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User / Logout Section */}
      <div className={`p-4 border-t border-emerald-800/40 flex flex-col gap-2 ${isCollapsed ? "items-center" : ""}`}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={isCollapsed ? "Sign Out" : undefined}
          className={`flex items-center text-red-300 hover:text-white hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer ${
            isCollapsed
              ? "w-10 h-10 justify-center"
              : "w-full gap-2.5 px-3 py-2 text-xs font-medium"
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>{loggingOut ? "Logging out..." : "Sign Out"}</span>}
        </button>
      </div>
    </aside>
  );
}
