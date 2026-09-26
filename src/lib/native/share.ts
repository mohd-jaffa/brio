/**
 * Sharing and saving a file (plan §139.17.2): the web half of the native
 * capability layer. The Android half — Filesystem and the Share plugin —
 * comes with R8.3; screens call these through `@/lib/native` and never ask
 * which platform they are on.
 */

export type ShareOutcome =
  /** The share sheet took it. */
  | "SHARED"
  /** The sheet was opened and closed again: nothing to report. */
  | "CANCELLED"
  /** Where a file cannot be shared, it was downloaded and its text copied. */
  | "SAVED_AND_COPIED"
  /** Downloaded; the text could not be copied. */
  | "SAVED";

/** Hands `blob` to the browser as a download called `name`. */
export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked once the click has been handled, not before.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Web Share with the file where the browser takes files — Android's share
 * sheet, and so WhatsApp — and otherwise a download with the text copied, so
 * it can be pasted beside the file. A browser that refuses the share (it
 * took too long after the tap) is treated as one that cannot.
 */
export async function share(file: File, text: string): Promise<ShareOutcome> {
  const data: ShareData = { files: [file], text };
  if (typeof navigator.canShare === "function" && navigator.canShare(data)) {
    try {
      await navigator.share(data);
      return "SHARED";
    } catch (failure) {
      if (failure instanceof DOMException && failure.name === "AbortError") return "CANCELLED";
      if (!(failure instanceof DOMException && failure.name === "NotAllowedError")) throw failure;
    }
  }
  saveFile(file, file.name);
  return (await copy(text)) ? "SAVED_AND_COPIED" : "SAVED";
}
