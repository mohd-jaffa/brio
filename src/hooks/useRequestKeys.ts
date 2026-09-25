"use client";

import { useState } from "react";

import { requestKeys } from "@/lib/api/request-key";

/** A form's idempotency keys (src/lib/api/request-key.ts), kept for as long as it is mounted. */
export function useRequestKeys() {
  const [keys] = useState(requestKeys);
  return keys;
}
