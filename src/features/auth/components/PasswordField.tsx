"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";

/**
 * A password box with a way to see what has been typed. On a phone a mistyped
 * password is the commonest reason a sign-in fails, and the reveal is a real
 * button with a label that says which state pressing it will produce — not an
 * icon a screen reader has to guess at (AGENTS.md §21).
 */
export const PasswordField = forwardRef<
  HTMLInputElement,
  {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    leading?: ReactNode;
    labelCase?: "caps" | "sentence";
  } & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id" | "type">
>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      ref={ref}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? UI_TEXT.auth.hidePassword : UI_TEXT.auth.showPassword}
          aria-pressed={visible}
          className="touch-target flex items-center justify-center rounded-lg px-2 text-text-muted transition-colors hover:text-text active:scale-95"
        >
          {visible ? (
            <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Eye size={18} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      }
    />
  );
});
