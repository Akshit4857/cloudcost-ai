"use client";

import React from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: string;
}

interface NavItem {
  name: string;
  id: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", id: "overview", icon: "📊" },
  { name: "Cost Analytics", id: "analytics", icon: "📈", badge: "Demo" },
  { name: "AI Insights", id: "insights", icon: "✨", badge: "3 New" },
  { name: "Billing Reports", id: "reports", icon: "📄" },
  { name: "Settings", id: "settings", icon: "⚙️" },
];

export default function Sidebar({
  isOpen,
  onClose,
  activeItem = "overview",
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-base font-bold shadow-xs">
              ☁️
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base leading-tight">
                CloudCost <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                FinOps Platform
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            aria-label="Close navigation sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeItem;
            return (
              <button
                key={item.id}
                type="button"
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base" role="img" aria-label={item.name}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-blue-200/70 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status Card */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Environment</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                Demo Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              Showing static sample data. Backend integration in Task 4+.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
