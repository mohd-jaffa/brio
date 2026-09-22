"use client";

import React, { useState } from "react";
import { AppShell } from "@/shared/components/AppShell";
import { Settings as SettingsIcon, Image as ImageIcon, Loader2, Save, UploadCloud } from "lucide-react";
import { getErrorMessage, ERROR_MESSAGES } from "@/constants/messages";

export default function SettingsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Rule 16: Maximum size 500 KB
    if (file.size > 500 * 1024) {
      setError("Logo exceeds maximum allowed size of 500 KB.");
      e.target.value = ""; // Reset
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      // Mock API call since actual Storage bucket isn't wired up yet
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess("Logo successfully updated! (Mock)");
    } catch {
      setError(getErrorMessage(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-fade-in-up pb-24 md:pb-8 max-w-2xl mx-auto">
        
        {/* Header */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text tracking-tight flex items-center gap-2 mb-1">
            <SettingsIcon size={28} className="text-primary" strokeWidth={2.5} />
            Settings
          </h2>
          <p className="text-sm text-text-muted font-medium">
            Manage your bakery profile and preferences
          </p>
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-danger-bg text-danger border border-danger/20 text-sm font-medium">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 rounded-xl bg-success/10 text-success border border-success/20 text-sm font-bold">
            {success}
          </div>
        )}

        {/* Bakery Profile */}
        <section className="p-6 rounded-3xl bg-surface border border-border shadow-card space-y-6">
          <h3 className="text-sm font-bold font-heading text-text uppercase tracking-wider">
            Bakery Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Bakery Name</label>
              <input
                type="text"
                defaultValue="Ovenly"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">Business Phone</label>
              <input
                type="tel"
                defaultValue="+91 9876543210"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <button className="touch-target flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-text font-bold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md w-full sm:w-auto justify-center">
              <Save size={18} strokeWidth={2.5} /> Save Details
            </button>
          </div>
        </section>

        {/* Brand & Logo Settings */}
        <section className="p-6 rounded-3xl bg-surface border border-border shadow-card space-y-6">
          <div>
            <h3 className="text-sm font-bold font-heading text-text uppercase tracking-wider mb-1">
              Brand Logo
            </h3>
            <p className="text-xs text-text-muted font-medium">
              This logo appears on your printed receipts and shareable links.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-background border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted">
              <ImageIcon size={32} strokeWidth={2} className="mb-1" />
              <span className="text-[10px] uppercase font-bold">Logo</span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="relative">
                <input 
                  type="file"
                  id="logo-upload"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <label 
                  htmlFor="logo-upload"
                  className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 active:scale-95 transition-all w-full justify-center pointer-events-none"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} strokeWidth={2.5} />}
                  {isUploading ? "Uploading..." : "Upload New Logo"}
                </label>
              </div>
              <div className="text-[10px] text-text-muted font-bold tracking-wider bg-warning/10 text-warning p-2 rounded-lg inline-block">
                Max Size: 500 KB. Formats: PNG, JPG, WebP.
              </div>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
