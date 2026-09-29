import { hasPlugins } from "./platform";

/**
 * Sharing and saving a file (plan §139.17.2): the web half, and the Android
 * half — Filesystem and the Share plugin — chosen as the call is made. Screens
 * call these through `@/lib/native` and never ask which platform they are on.
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

// The Android app's own scratch space for a file on its way to the share
// sheet: emptied each time, so nothing is kept (AGENTS §15).
const OUTBOX = "outbox";

/** Hands `blob` to the browser as a download called `name`. */
function download(blob: Blob, name: string) {
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

/** A blob as base64, which is how Filesystem takes a file's bytes. */
function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(",") + 1));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * On Android: the file written to the app's cache, and the system's share
 * sheet opened on it — which is also how a PDF is saved there, since a WebView
 * cannot download a blob. The last file shared is cleared first.
 */
async function shareOnAndroid(blob: Blob, name: string, text?: string): Promise<ShareOutcome> {
  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  await Filesystem.rmdir({ path: OUTBOX, directory: Directory.Cache, recursive: true }).catch(() => undefined);
  const { uri } = await Filesystem.writeFile({
    path: `${OUTBOX}/${name}`,
    data: await base64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  try {
    await Share.share({ files: [uri], text });
    return "SHARED";
  } catch (failure) {
    if (failure instanceof Error && /cancel/i.test(failure.message)) return "CANCELLED";
    throw failure;
  }
}

const onAndroid = () => hasPlugins("Filesystem", "Share");

/**
 * Saves a file: a download in a browser; on Android, the share sheet, from
 * which it is saved to the phone, a drive or a chat.
 */
export async function saveFile(blob: Blob, name: string): Promise<ShareOutcome> {
  if (onAndroid()) return shareOnAndroid(blob, name);
  download(blob, name);
  return "SAVED";
}

/**
 * Shares a file with a line of text. On Android, the system's share sheet.
 * In a browser, Web Share with the file where it takes files — Android's
 * share sheet, and so WhatsApp — and otherwise a download with the text
 * copied, so it can be pasted beside the file. A browser that refuses the
 * share (it took too long after the tap) is treated as one that cannot.
 */
export async function share(file: File, text: string): Promise<ShareOutcome> {
  if (onAndroid()) return shareOnAndroid(file, file.name, text);
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
  download(file, file.name);
  return (await copy(text)) ? "SAVED_AND_COPIED" : "SAVED";
}
