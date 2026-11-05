"use client";

import React, { useState } from "react";
import { loginUser, registerUser } from "../../lib/api";
import { User } from "../../types/api";

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    if (mode === "register") {
      const res = await registerUser({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
      });
      setIsLoading(false);
      if (res.success && res.data) {
        onAuthSuccess(res.data.user);
      } else {
        setErrorMessage(res.error || "Failed to create account.");
      }
    } else {
      const res = await loginUser({
        email: email.trim(),
        password,
      });
      setIsLoading(false);
      if (res.success && res.data) {
        onAuthSuccess(res.data.user);
      } else {
        setErrorMessage(res.error || "Failed to sign in.");
      }
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string, demoName?: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (demoName) setFullName(demoName);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand logo icon */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
          ☁️
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          CloudCost AI
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Intelligent Cloud FinOps & Anomaly Detection Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-center text-sm font-semibold border-b-2 transition-colors ${
                mode === "login"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-center text-sm font-semibold border-b-2 transition-colors ${
                mode === "register"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              🧪 Quick Multi-User Demo Test
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDemoFill("alice@example.com", "password123", "Alice Engineer")
                }
                className="px-2.5 py-1.5 text-xs text-left rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <div className="font-semibold text-slate-800 text-[11px]">Alice (User 1)</div>
                <div className="text-[10px] text-slate-500 truncate">alice@example.com</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDemoFill("bob@example.com", "password123", "Bob DevOps")
                }
                className="px-2.5 py-1.5 text-xs text-left rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <div className="font-semibold text-slate-800 text-[11px]">Bob (User 2)</div>
                <div className="text-[10px] text-slate-500 truncate">bob@example.com</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Click either user to test isolated datasets and private history
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p className="flex-1 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="full-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Name (Optional)
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alice Chen"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Work Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading && (
                <svg
                  className="animate-spin h-3.5 w-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <span>
                {isLoading
                  ? "Authenticating..."
                  : mode === "login"
                  ? "Sign In to CloudCost AI"
                  : "Create Account"}
              </span>
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 text-center text-[11px] text-slate-400">
            🔒 Passwords hashed with bcrypt • JWT tokens for secure session access
          </div>
        </div>
      </div>
    </div>
  );
}

