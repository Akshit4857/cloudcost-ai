"use client";

import React from "react";
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
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          aria-label="Open sidebar menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search + Status + User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Visual Search Input */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="search"
            readOnly
            placeholder="Search services, regions, tags..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition cursor-text"
            aria-label="Search dashboard (visual only)"
          />
        </div>

        {/* Live Backend Connection Status */}
        <BackendStatus variant="badge" />

        {/* Demo Data Indicator */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>Sample Data</span>
        </div>

        {/* User Account / Profile Area */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-2xs">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
              {user?.email || "Not signed in"}
            </span>
          </div>

          {onLogout && user && (
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label="Sign out of account"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
