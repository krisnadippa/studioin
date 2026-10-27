"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Images,
  Shield,
  ShieldOff,
  PlusCircle,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Unlock,
  Sliders,
  RefreshCw,
  Mail,
  Calendar,
  CheckSquare,
  Crown,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { UserActivityStats, AdminUser } from "@/lib/db/types";

export default function SuperAdminPage() {
  const router = useRouter();

  // Auth & Page State
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Users Data
  const [usersStats, setUsersStats] = useState<UserActivityStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "restricted">("all");
  const [filterRole, setFilterRole] = useState<"all" | "superadmin" | "admin">("all");

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    isUnlimited: true,
    galleryLimit: 5,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Restrictions Modal State
  const [selectedUserStats, setSelectedUserStats] = useState<UserActivityStats | null>(null);
  const [editForm, setEditForm] = useState({
    isRestricted: false,
    isUnlimited: true,
    galleryLimit: 5,
    role: "admin" as "admin" | "superadmin",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete User Confirm State
  const [userToDelete, setUserToDelete] = useState<UserActivityStats | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast Feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check Current User & Permissions
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!data?.user) {
        router.push("/admin/login");
        return;
      }
      setCurrentUser(data.user);
      if (data.user.role !== "superadmin") {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      fetchUsers();
    } catch {
      router.push("/admin/login");
    }
  }, [router]);

  // Fetch Users Activity
  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/superadmin/users");
      if (res.ok) {
        const data = await res.json();
        setUsersStats(data.users || []);
      } else {
        showToast("Failed to load users activity.", "error");
      }
    } catch {
      showToast("Network error fetching user data.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersStats.filter((item) => {
      const matchesSearch =
        item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "restricted"
          ? item.user.is_restricted
          : !item.user.is_restricted;

      const matchesRole =
        filterRole === "all" ? true : item.user.role === filterRole;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [usersStats, searchQuery, filterStatus, filterRole]);

  // System Stats Summaries
  const statsSummary = useMemo(() => {
    const totalUsers = usersStats.length;
    const totalGalleries = usersStats.reduce((acc, u) => acc + u.total_galleries, 0);
    const activeGalleries = usersStats.reduce((acc, u) => acc + u.active_galleries, 0);
    const totalSelections = usersStats.reduce((acc, u) => acc + u.total_selections, 0);
    const restrictedCount = usersStats.filter((u) => u.user.is_restricted).length;

    return { totalUsers, totalGalleries, activeGalleries, totalSelections, restrictedCount };
  }, [usersStats]);

  // Open Edit Modal
  const openEditModal = (item: UserActivityStats) => {
    setSelectedUserStats(item);
    setEditForm({
      isRestricted: item.user.is_restricted,
      isUnlimited: item.user.gallery_limit === null,
      galleryLimit: item.user.gallery_limit ?? 5,
      role: item.user.role,
    });
    setEditError(null);
  };

  // Quick Toggle Restriction (One-Click)
  const handleToggleRestriction = async (item: UserActivityStats) => {
    const newRestrictedState = !item.user.is_restricted;
    try {
      const res = await fetch(`/api/superadmin/users/${item.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_restricted: newRestrictedState }),
      });

      if (res.ok) {
        showToast(
          newRestrictedState
            ? `Account ${item.user.name} is now locked from creating galleries.`
            : `Restrictions removed for ${item.user.name}.`
        );
        // Optimistic update
        setUsersStats((prev) =>
          prev.map((u) =>
            u.user.id === item.user.id
              ? { ...u, user: { ...u.user, is_restricted: newRestrictedState } }
              : u
          )
        );
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update user restriction", "error");
      }
    } catch {
      showToast("Error toggling user restriction", "error");
    }
  };

  // Submit Edit Restrictions & Limit
  const handleSaveRestrictions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserStats) return;

    setEditLoading(true);
    setEditError(null);

    const payload = {
      is_restricted: editForm.isRestricted,
      gallery_limit: editForm.isUnlimited ? null : Number(editForm.galleryLimit),
      role: editForm.role,
    };

    try {
      const res = await fetch(`/api/superadmin/users/${selectedUserStats.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`User settings updated for ${selectedUserStats.user.name}`);
        setSelectedUserStats(null);
        fetchUsers();
      } else {
        setEditError(data.error || "Failed to update restrictions");
      }
    } catch {
      setEditError("Network error updating restrictions");
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Create Photographer Account
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    const payload = {
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      gallery_limit: createForm.isUnlimited ? null : Number(createForm.galleryLimit),
    };

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Account created for ${createForm.name}!`);
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          email: "",
          password: "",
          isUnlimited: true,
          galleryLimit: 5,
        });
        fetchUsers();
      } else {
        setCreateError(data.error || "Failed to create photographer account");
      }
    } catch {
      setCreateError("Network error while creating account");
    } finally {
      setCreateLoading(false);
    }
  };

  // Submit Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/superadmin/users/${userToDelete.user.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast(`Account ${userToDelete.user.name} has been deleted.`);
        setUserToDelete(null);
        fetchUsers();
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete user account");
      }
    } catch {
      setDeleteError("Network error while deleting account");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Not authorized screen
  if (!loading && authorized === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 min-h-[80vh]">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-600 shadow-inner">
          <ShieldOff className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Access Denied</h1>
        <p className="text-zinc-600 text-sm text-center max-w-md mb-6">
          You do not have Super Admin privileges to view this management console.
        </p>
        <button
          onClick={() => router.push("/admin")}
          className="px-5 py-2.5 bg-[#114234] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#185342] transition-colors cursor-pointer"
        >
          Return to Admin Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-7xl mx-auto w-full gap-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-900 text-[#bef238] border-emerald-700"
              : "bg-red-900 text-white border-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#bef238]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-300" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#bef238]/20 text-[#114234] border border-[#bef238]/40 uppercase tracking-wider">
              <Crown className="w-3 h-3 text-[#114234]" /> Super Admin Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#114234] tracking-tight">
            User Management & Restrictions
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">
            Monitor registered photographers, track gallery activities, and manage access limits or restrictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={refreshing}
            className="p-2.5 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#114234]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#114234] hover:bg-[#185342] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/15 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#bef238]" />
            <span>Create Photographer</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">Total Accounts</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-[#114234]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {loading ? "..." : statsSummary.totalUsers}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-medium">
              Registered users
            </span>
          </div>
        </div>

        {/* Total Galleries */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">Total Galleries</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-700">
              <Images className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {loading ? "..." : statsSummary.totalGalleries}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-medium">
              Across all users
            </span>
          </div>
        </div>

        {/* Active Galleries */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">Active Galleries</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {loading ? "..." : statsSummary.activeGalleries}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-medium">
              Currently proofing
            </span>
          </div>
        </div>

        {/* Total Selections */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">Client Selections</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-700">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {loading ? "..." : statsSummary.totalSelections}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-medium">
              Submitted by clients
            </span>
          </div>
        </div>

        {/* Restricted Accounts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">Locked Users</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {loading ? "..." : statsSummary.restrictedCount}
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5 block font-medium">
              Restricted from creating
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Filters and Search Bar */}
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Status Filter */}
            <div className="flex items-center bg-white border border-zinc-200 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterStatus === "all"
                    ? "bg-[#114234] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterStatus === "active"
                    ? "bg-[#114234] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("restricted")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterStatus === "restricted"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Locked
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 text-zinc-500 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3.5 px-6">User / Photographer</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-center">Galleries (Active / Total)</th>
                <th className="py-3.5 px-4 text-center">Client Selections</th>
                <th className="py-3.5 px-4 text-center">Gallery Quota / Limit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#114234]" />
                      <span>Loading user activities...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <UserX className="w-6 h-6 text-zinc-300" />
                      <span className="font-semibold text-zinc-600">No photographers found</span>
                      <span className="text-zinc-400 text-[11px]">
                        Try refining your search keyword or filter options
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item) => {
                  const isSuper = item.user.role === "superadmin";
                  const isCurrent = currentUser?.id === item.user.id;
                  const isRestricted = item.user.is_restricted;
                  const limit = item.user.gallery_limit;
                  const isLimitReached =
                    limit !== null && item.total_galleries >= limit;

                  return (
                    <tr
                      key={item.user.id}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuper
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : isRestricted
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-emerald-100 text-[#114234] border border-emerald-200"
                            }`}
                          >
                            {item.user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 text-xs sm:text-sm">
                                {item.user.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-zinc-200 text-zinc-700 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{item.user.email}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              Joined {new Date(item.user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Crown className="w-3 h-3 text-amber-600" /> Superadmin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                            Photographer
                          </span>
                        )}
                      </td>

                      {/* Galleries Count */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-sm text-zinc-900">
                            {item.active_galleries}{" "}
                            <span className="text-zinc-400 font-normal text-xs">/ {item.total_galleries}</span>
                          </span>
                          <span className="text-[10px] text-zinc-400 mt-0.5">
                            {item.expired_galleries} expired
                          </span>
                        </div>
                      </td>

                      {/* Client Selections */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 font-bold text-xs border border-purple-200/60">
                          <CheckSquare className="w-3 h-3 text-purple-600" />
                          {item.total_selections}
                        </span>
                      </td>

                      {/* Gallery Limit / Quota */}
                      <td className="py-4 px-4 text-center">
                        {limit === null ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Unlimited
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-[11px] font-bold ${
                                isLimitReached ? "text-red-600" : "text-zinc-700"
                              }`}
                            >
                              {item.total_galleries} / {limit} Max
                            </span>
                            <div className="w-20 bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200">
                              <div
                                className={`h-full ${
                                  isLimitReached ? "bg-red-500" : "bg-[#114234]"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.total_galleries / (limit || 1)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            {isLimitReached && (
                              <span className="text-[9px] font-bold text-red-600 uppercase tracking-tight">
                                Limit Reached
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status / Restriction Badge */}
                      <td className="py-4 px-4 text-center">
                        {isRestricted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            <Lock className="w-3 h-3 text-red-600" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Lock / Unlock Button */}
                          {!isSuper && (
                            <button
                              onClick={() => handleToggleRestriction(item)}
                              title={
                                isRestricted
                                  ? "Unlock gallery creation for this photographer"
                                  : "Lock / Restrict gallery creation"
                              }
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                isRestricted
                                  ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                  : "bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200"
                              }`}
                            >
                              {isRestricted ? (
                                <Lock className="w-3.5 h-3.5 text-red-600" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Edit Quota / Restrictions Modal */}
                          <button
                            onClick={() => openEditModal(item)}
                            title="Manage Restrictions & Quota"
                            className="p-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl transition-all cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          {!isSuper && !isCurrent && (
                            <button
                              onClick={() => {
                                setUserToDelete(item);
                                setDeleteError(null);
                              }}
                              title="Delete Photographer Account"
                              className="p-2 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-zinc-200 hover:border-red-200 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Create Photographer Account ────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 sm:p-7 relative overflow-hidden">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#114234]">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
                  Create Photographer Account
                </h3>
                <p className="text-zinc-500 text-xs">
                  Add a new photographer who can manage their own galleries.
                </p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Full Name / Studio Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Photography"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234] focus:bg-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="photographer@example.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234] focus:bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234] focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Quota Limit Setting */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-700">
                    Gallery Creation Limit
                  </span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.isUnlimited}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          isUnlimited: e.target.checked,
                        })
                      }
                      className="rounded border-zinc-300 text-[#114234] focus:ring-[#114234]"
                    />
                    <span className="text-xs text-zinc-600 font-medium">
                      Unlimited
                    </span>
                  </label>
                </div>

                {!createForm.isUnlimited && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={createForm.galleryLimit}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          galleryLimit: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-24 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234]"
                    />
                    <span className="text-xs text-zinc-500">
                      galleries max for this user
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-[#114234] hover:bg-[#185342] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Restrictions & Quotas ─────────────────────────────── */}
      {selectedUserStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 sm:p-7 relative overflow-hidden">
            <button
              onClick={() => setSelectedUserStats(null)}
              className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
                  User Restrictions & Quota
                </h3>
                <p className="text-zinc-500 text-xs">
                  Configure limits for {selectedUserStats.user.name}
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRestrictions} className="space-y-5">
              {/* Account Lock Toggle */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      editForm.isRestricted
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {editForm.isRestricted ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-zinc-900 block">
                      Lock Gallery Creation
                    </span>
                    <span className="text-[11px] text-zinc-500 block leading-tight mt-0.5">
                      When locked, user cannot create any new galleries and will see a lock notification.
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={editForm.isRestricted}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isRestricted: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* Gallery Limit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-700">
                    Max Gallery Limit
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isUnlimited}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          isUnlimited: e.target.checked,
                        })
                      }
                      className="rounded border-zinc-300 text-[#114234] focus:ring-[#114234]"
                    />
                    <span className="text-xs text-zinc-600 font-medium">
                      Unlimited
                    </span>
                  </label>
                </div>

                {!editForm.isUnlimited && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={editForm.galleryLimit}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          galleryLimit: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-24 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234]"
                    />
                    <span className="text-xs text-zinc-500">
                      Current: {selectedUserStats.total_galleries} galleries created
                    </span>
                  </div>
                )}
              </div>

              {/* Role Toggle */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  User Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as "admin" | "superadmin",
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#114234]/20 focus:border-[#114234]"
                >
                  <option value="admin">Photographer (Admin)</option>
                  <option value="superadmin">Super Administrator</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserStats(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 bg-[#114234] hover:bg-[#185342] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirm Delete Account ─────────────────────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-lg text-zinc-900 mb-1">
              Delete Photographer?
            </h3>
            <p className="text-zinc-500 text-xs mb-4">
              Are you sure you want to permanently delete account for{" "}
              <strong className="text-zinc-800">{userToDelete.user.name}</strong> ({userToDelete.user.email})? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteUser}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
