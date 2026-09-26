"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "@/lib/auth/auth-client";
import { AuthModal } from "./AuthModal";
import { LocalStorageService } from "@/lib/storage";
import Link from "next/link";
import {
  LogIn,
  CloudUpload,
  Download,
  Trash2,
  LogOut,
  ChevronDown,
  Loader2,
  Settings as SettingsIcon,
  LayoutDashboard,
  HelpCircle,
} from "lucide-react";

export function UserNav() {
  const { data: session, refetch } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await LocalStorageService.syncGuestDataToCloud();
      if (res.success) {
        setSyncStatus(`Synced! (${res.synced?.attempts ?? 0} exams)`);
      } else {
        setSyncStatus(res.error || "Sync completed.");
      }
    } catch {
      setSyncStatus("Sync failed.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handleExportAccountData = async () => {
    try {
      const res = await fetch("/api/user/account");
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviewtayo-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export account data. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently erase your account and all synchronized exam data? This action complies with Republic Act No. 10173 (Data Privacy Act of 2012) and cannot be undone."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (res.ok) {
        // RA 10173: deletion must also cover device-local data collected
        // during onboarding/guest study (workspace, prefs, onboarding state).
        LocalStorageService.clearAllGuestData();
        await signOut();
        setDropdownOpen(false);
        alert("Your account and personal data have been permanently erased.");
        window.location.reload();
      } else {
        alert("Failed to delete account. Please contact support.");
      }
    } catch {
      alert("Network error while deleting account.");
    } finally {
      setIsDeleting(false);
    }
  };


  if (!session?.user) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800 shadow-2xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          title="Sign in to sync your exam history across devices"
        >
          <LogIn className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="whitespace-nowrap">Sign In</span>
        </button>

        <AuthModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      </div>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        aria-expanded={dropdownOpen}
        aria-label="User account menu"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white uppercase">
          {initials}
        </div>
        <span className="hidden sm:inline-block max-w-[120px] truncate text-slate-700 dark:text-slate-300">
          {user.name || user.email}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95 duration-100 text-left">
          <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-2 mb-1">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {user.name || "Reviewer Examinee"}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
          </div>

          <div className="space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <LayoutDashboard className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <SettingsIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Settings</span>
            </Link>

            <Link
              href="/settings/help"
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <HelpCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Help &amp; Support</span>
            </Link>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />

          <div className="space-y-0.5">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              ) : (
                <CloudUpload className="h-4 w-4 text-brand-600" />
              )}
              <div className="flex-1 text-left">
                <div>Sync Offline Progress</div>
                {syncStatus && (
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    {syncStatus}
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleExportAccountData}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              title="Republic Act No. 10173 Right to Data Portability"
            >
              <Download className="h-4 w-4 text-slate-400" />
              <span>Export My Data (RA 10173)</span>
            </button>

            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
              title="Republic Act No. 10173 Right to Erasure"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
              <span>Delete Account & Data</span>
            </button>
          </div>

          <div className="border-t border-slate-100 mt-2 pt-1">
            <button
              onClick={async () => {
                await signOut();
                setDropdownOpen(false);
                refetch();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
