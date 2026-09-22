"use client";

import { useCallback, useState } from "react";

/**
 * Something that opens and closes — a sheet, a menu. Every list screen was
 * keeping the same `isOpen` boolean plus the record being edited, and had to
 * remember to clear the record when opening for a new one. This does both.
 */
export function useDisclosure<T = undefined>() {
  const [subject, setSubject] = useState<T | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((next?: T) => {
    setSubject(next);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, subject, open, close };
}
