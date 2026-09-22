"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChefHat, 
  Phone, 
  Lock, 
  Mail, 
  Building2, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";

import { loginSchema, registerSchema, passwordResetRequestSchema } from "@/lib/validation";
import type { LoginInput, RegisterInput, PasswordResetRequestInput } from "@/lib/validation";
import { AuthClient } from "@/features/auth/api.client";
import { errorMessage } from "@/lib/errors/errorMessage";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function AuthPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forgot Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // 1. Login Form
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  // 2. Register Form
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      businessName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 3. Reset Password Form
  const resetForm = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  // Submit Login
  const onLoginSubmit = async (data: LoginInput) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await AuthClient.login(data);
      router.push("/");
    } catch (err: unknown) {
      setApiError(errorMessage(err, "AUTH_INVALID_CREDENTIALS"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Register
  const onRegisterSubmit = async (data: RegisterInput) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await AuthClient.register(data);
      // Automatically switch to login with confirmation alert
      setActiveTab("login");
      setResetSuccess(true);
      loginForm.setValue("phone", data.phone);
    } catch (err: unknown) {
      setApiError(errorMessage(err, "AUTH_PHONE_ALREADY_EXISTS"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reset
  const onResetSubmit = async (data: PasswordResetRequestInput) => {
    setResetError(null);
    setResetSubmitting(true);
    try {
      await AuthClient.requestPasswordReset(data);
      setResetSuccess(true);
    } catch (err: unknown) {
      setResetError(errorMessage(err, "INTERNAL_ERROR"));
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-between selection:bg-primary/20 relative overflow-hidden transition-colors duration-300">
      {/* Top Header Bar with Theme Switcher */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/20">
            <ChefHat size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl tracking-tight text-text flex items-center gap-1.5">
              Ovenly <Sparkles size={14} className="text-secondary animate-pulse" />
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Home Bakery Platform</p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={`Switch to ${theme === 'clean' ? 'Peach' : 'Clean'} theme`}
          className="touch-target p-2.5 rounded-2xl bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-hover active:scale-95 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
        >
          {theme === 'clean' ? <Sun size={16} className="text-warning" /> : <Moon size={16} className="text-primary" />}
          <span className="hidden sm:inline capitalize">{theme} Bakery</span>
        </button>
      </header>

      {/* Main Form Container */}
      <main className="w-full max-w-md mx-auto px-4 py-8 sm:py-12 z-10">
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card backdrop-blur-md relative">
          
          {/* Header Copy */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-heading text-text tracking-tight">
              {activeTab === "login" ? "Welcome Back, Baker!" : "Start Your Home Bakery"}
            </h2>
            <p className="text-xs text-text-muted mt-1.5 font-medium">
              {activeTab === "login"
                ? "Sign in to manage your orders, stock, and business."
                : "Create your free home bakery management account today."}
            </p>
          </div>

          {/* Mode Tabs */}
          <div 
            className="flex p-1 bg-background rounded-2xl border border-border mb-6" 
            role="tablist"
            aria-label="Authentication modes"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              aria-controls="login-panel"
              id="login-tab"
              onClick={() => { setActiveTab("login"); setApiError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "login"
                  ? "bg-surface text-primary shadow-sm border border-border/50"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "register"}
              aria-controls="register-panel"
              id="register-tab"
              onClick={() => { setActiveTab("register"); setApiError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === "register"
                  ? "bg-surface text-primary shadow-sm border border-border/50"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Top API Error Banner */}
          {apiError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-danger-bg/80 border border-danger/30 text-danger text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="font-medium leading-relaxed">{apiError}</span>
            </div>
          )}

          {/* Registration Success Banner */}
          {resetSuccess && activeTab === "login" && (
            <div className="mb-5 p-3.5 rounded-2xl bg-success/10 border border-success/30 text-success text-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span className="font-medium leading-relaxed">
                Account created successfully! Please sign in with your phone &amp; password.
              </span>
            </div>
          )}

          {/* ============================================================
              PANEL 1: LOGIN FORM
              ============================================================ */}
          {activeTab === "login" && (
            <form 
              id="login-panel" 
              role="tabpanel" 
              aria-labelledby="login-tab" 
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Phone Input */}
              <div>
                <label htmlFor="login-phone" className="block text-xs font-bold text-text mb-1.5">
                  Mobile Number <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold flex items-center gap-1">
                    <Phone size={14} /> +91
                  </span>
                  <input
                    id="login-phone"
                    type="tel"
                    placeholder="98765 43210"
                    autoComplete="tel-national"
                    aria-required="true"
                    aria-invalid={!!loginForm.formState.errors.phone}
                    {...loginForm.register("phone")}
                    className={`w-full pl-16 pr-4 py-3 text-sm bg-background border rounded-2xl outline-none transition-all ${
                      loginForm.formState.errors.phone
                        ? "border-danger focus:ring-2 focus:ring-danger/20"
                        : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                </div>
                {loginForm.formState.errors.phone && (
                  <p className="text-[11px] font-medium text-danger mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {loginForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-bold text-text">
                    Password <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowResetModal(true); setResetSuccess(false); setResetError(null); }}
                    className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Lock size={16} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-required="true"
                    aria-invalid={!!loginForm.formState.errors.password}
                    {...loginForm.register("password")}
                    className={`w-full pl-10 pr-10 py-3 text-sm bg-background border rounded-2xl outline-none transition-all ${
                      loginForm.formState.errors.password
                        ? "border-danger focus:ring-2 focus:ring-danger/20"
                        : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-[11px] font-medium text-danger mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="w-full mt-2 touch-target py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-white font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Bakery</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================
              PANEL 2: REGISTER FORM
              ============================================================ */}
          {activeTab === "register" && (
            <form 
              id="register-panel" 
              role="tabpanel" 
              aria-labelledby="register-tab" 
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
              className="space-y-3.5"
              noValidate
            >
              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="block text-xs font-bold text-text mb-1">
                  Your Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <User size={15} />
                  </span>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Priya Sharma"
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={!!registerForm.formState.errors.name}
                    {...registerForm.register("name")}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {registerForm.formState.errors.name && (
                  <p className="text-[11px] font-medium text-danger mt-0.5">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Bakery Business Name */}
              <div>
                <label htmlFor="reg-business" className="block text-xs font-bold text-text mb-1">
                  Bakery / Business Name <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Building2 size={15} />
                  </span>
                  <input
                    id="reg-business"
                    type="text"
                    placeholder="Sweet Delights Bakery"
                    aria-required="true"
                    aria-invalid={!!registerForm.formState.errors.businessName}
                    {...registerForm.register("businessName")}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {registerForm.formState.errors.businessName && (
                  <p className="text-[11px] font-medium text-danger mt-0.5">
                    {registerForm.formState.errors.businessName.message}
                  </p>
                )}
              </div>

              {/* Phone Input */}
              <div>
                <label htmlFor="reg-phone" className="block text-xs font-bold text-text mb-1">
                  Mobile Number <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold flex items-center gap-1">
                    <Phone size={14} /> +91
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="98765 43210"
                    autoComplete="tel-national"
                    aria-required="true"
                    aria-invalid={!!registerForm.formState.errors.phone}
                    {...registerForm.register("phone")}
                    className="w-full pl-16 pr-4 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {registerForm.formState.errors.phone && (
                  <p className="text-[11px] font-medium text-danger mt-0.5">
                    {registerForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="reg-email" className="block text-xs font-bold text-text mb-1">
                  Email Address <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Mail size={15} />
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="priya@bakery.com"
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={!!registerForm.formState.errors.email}
                    {...registerForm.register("email")}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-[11px] font-medium text-danger mt-0.5">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-xs font-bold text-text mb-1">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Lock size={15} />
                  </span>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!registerForm.formState.errors.password}
                    {...registerForm.register("password")}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted p-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-[11px] font-medium text-danger mt-0.5">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-bold text-text mb-1">
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Lock size={15} />
                  </span>
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!registerForm.formState.errors.confirmPassword}
                    {...registerForm.register("confirmPassword")}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-[11px] font-medium text-danger mt-0.5">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="w-full mt-2 touch-target py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-white font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Bakery Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Bakery Account</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-text-muted z-10 font-medium">
        &copy; {new Date().getFullYear()} Ovenly — Mobile-First Home Bakery Platform
      </footer>

      {/* ============================================================
          FORGOT PASSWORD RESET MODAL
          ============================================================ */}
      {showResetModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-elevated relative">
            <h3 id="reset-modal-title" className="text-xl font-bold font-heading text-text mb-2">
              Reset Password
            </h3>
            <p className="text-xs text-text-muted mb-5 leading-relaxed">
              Enter the email address registered with your bakery account. We&apos;ll send you a temporary password.
            </p>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-success/10 border border-success/30 text-success text-xs flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Check Your Email</span>
                    <span>If an account exists, a temporary password has been sent to your inbox.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-3 rounded-2xl bg-background border border-border text-text font-bold text-xs hover:bg-surface-hover"
                >
                  Close &amp; Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4" noValidate>
                {resetError && (
                  <div className="p-3 rounded-xl bg-danger-bg text-danger text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> {resetError}
                  </div>
                )}
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-bold text-text mb-1">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="baker@example.com"
                    autoFocus
                    {...resetForm.register("email")}
                    className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-2xl outline-none focus:border-primary"
                  />
                  {resetForm.formState.errors.email && (
                    <p className="text-[11px] text-danger mt-1">
                      {resetForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-background border border-border text-xs font-bold text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="flex-1 py-3 rounded-2xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {resetSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Send Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
