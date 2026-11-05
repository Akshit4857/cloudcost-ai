"use client";

import React from "react";
import { Search, Menu, LogOut, Database } from "lucide-react";
import BackendStatus from "./BackendStatus";
import { User } from "../../types/api";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
  user?: User | null;
  onLogout?: () => void;
}

export default function Header({
  onMenuClick,
  title = "Cloud Cost Overview",
  subtitle = "Real-time FinOps spending analytics & AI optimization tracking",
  user,
  onLogout,
}: HeaderProps) {
  // Derive avatar initials
  const getInitials = (currentUser?: User | null) => {
    if (!currentUser) return "??";
    if (currentUser.full_name) {
      const parts = currentUser.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return currentUser.email.slice(0, 2).toUpperCase();
  };

  const displayName = user?.full_name || user?.email || "Guest User";
  const initials = getInitials(user);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search + Status + User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Visual Search Input */}
        <div className="relative hidden md:block w-56 lg:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="search"
            readOnly
            placeholder="Search resources, tags..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
            aria-label="Search dashboard"
          />
        </div>

        {/* Live Backend Connection Status */}
        <BackendStatus variant="badge" />

        {/* Database Connected Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
          <Database className="w-3 h-3 text-blue-500" />
          <span>PostgreSQL Live</span>
        </div>

        {/* User Account / Profile Area */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[130px]">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[130px]">
              {user?.email || "Not signed in"}
            </span>
          </div>

          {onLogout && user && (
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label="Sign out of account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
