"use client";

import React, { useState } from "react";
import {
  Cloud,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
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
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Cloud className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          CloudCost <span className="text-blue-600">AI</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Intelligent Cloud FinOps &amp; Anomaly Detection Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200/90 sm:px-10">
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
                  ? "border-blue-600 text-blue-600 font-bold"
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
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Multi-User Demo Test</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDemoFill("alice@example.com", "password123", "Alice Engineer")
                }
                className="px-2.5 py-1.5 text-xs text-left rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors shadow-2xs"
              >
                <div className="font-semibold text-slate-800 text-[11px]">Alice (User 1)</div>
                <div className="text-[10px] text-slate-500 truncate">alice@example.com</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDemoFill("bob@example.com", "password123", "Bob DevOps")
                }
                className="px-2.5 py-1.5 text-xs text-left rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors shadow-2xs"
              >
                <div className="font-semibold text-slate-800 text-[11px]">Bob (User 2)</div>
                <div className="text-[10px] text-slate-500 truncate">bob@example.com</div>
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="flex-1 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In to Dashboard" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
