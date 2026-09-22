import { z } from 'zod';
import { VALIDATION_MESSAGES } from '@/constants/messages';

export function optionalNumberText(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === '') return null;
      if (!/^\d+(\.\d+)?$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: VALIDATION_MESSAGES.number(label) });
        return z.NEVER;
      }
      return Number(text);
    });
}

export function optionalText() {
  return z
    .string()
    .trim()
    .transform((text) => (text === '' ? null : text));
}

export function amountText(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (!/^\d+(\.\d+)?$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: VALIDATION_MESSAGES.number(label) });
        return z.NEVER;
      }
      return Number(text);
    });
}

export function optionalEmail(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === '') return null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: VALIDATION_MESSAGES.email(label) });
        return z.NEVER;
      }
      return text;
    });
}
