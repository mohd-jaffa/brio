import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const android = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/native/platform", () => ({ hasPlugins: () => android.on }));
const native = vi.hoisted(() => ({
  rmdir: vi.fn(),
  writeFile: vi.fn(),
  share: vi.fn(),
}));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: { rmdir: native.rmdir, writeFile: native.writeFile },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: native.share } }));

import { saveFile, share } from "@/lib/native/share";

const file = new File(["png"], "ORD-1006 - Sweet Delights.png", { type: "image/png" });
const text = "Bill ORD-1006 from Sweet Delights — total ₹1,280.";

let clicked: { href: string; download: string }[];

beforeEach(() => {
  vi.useFakeTimers();
  android.on = false;
  native.rmdir.mockReset().mockResolvedValue(undefined);
  native.writeFile.mockReset().mockResolvedValue({ uri: "file:///cache/outbox/bill" });
  native.share.mockReset().mockResolvedValue({});
  clicked = [];
  URL.createObjectURL = vi.fn(() => "blob:bill");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.assign(navigator, { canShare: undefined, share: undefined, clipboard: undefined });
});

function sharing(result: () => Promise<void>) {
  const shared = vi.fn(result);
  Object.assign(navigator, { canShare: vi.fn(() => true), share: shared });
  return shared;
}

describe("saveFile", () => {
  it("downloads the file under its name, and lets go of it once the click is handled", async () => {
    expect(await saveFile(file, "ORD-1006.pdf")).toBe("SAVED");
    expect(clicked).toEqual([{ href: "blob:bill", download: "ORD-1006.pdf" }]);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:bill");
  });
});

describe("share (plan §139.17.2)", () => {
  it("hands the file and its text to the share sheet where the browser takes files", async () => {
    const shared = sharing(async () => undefined);
    await expect(share(file, text)).resolves.toBe("SHARED");
    expect(navigator.canShare).toHaveBeenCalledWith({ files: [file], text });
    expect(shared).toHaveBeenCalledWith({ files: [file], text });
    expect(clicked).toEqual([]);
  });

  it("reports nothing to do when the sheet is closed without sharing", async () => {
    sharing(async () => Promise.reject(new DOMException("closed", "AbortError")));
    await expect(share(file, text)).resolves.toBe("CANCELLED");
  });

  it("downloads and copies the text where a share is refused, or cannot carry files", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    sharing(async () => Promise.reject(new DOMException("too late", "NotAllowedError")));
    await expect(share(file, text)).resolves.toBe("SAVED_AND_COPIED");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text);

    Object.assign(navigator, { canShare: vi.fn(() => false) });
    await expect(share(file, text)).resolves.toBe("SAVED_AND_COPIED");
    expect(clicked).toHaveLength(2);
  });

  it("still downloads when the text cannot be copied, or there is no Web Share at all", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await expect(share(file, text)).resolves.toBe("SAVED");
    expect(clicked).toEqual([{ href: "blob:bill", download: "ORD-1006 - Sweet Delights.png" }]);
  });

  it("passes on any other failure of the share sheet", async () => {
    sharing(async () => Promise.reject(new TypeError("broken")));
    await expect(share(file, text)).rejects.toThrow("broken");
  });
});

describe("in the Android app", () => {
  beforeEach(() => {
    vi.useRealTimers();
    android.on = true;
  });

  it("shares through the system's sheet: the file written to the cache, the last one cleared first", async () => {
    expect(await share(file, text)).toBe("SHARED");
    expect(native.rmdir).toHaveBeenCalledWith({ path: "outbox", directory: "CACHE", recursive: true });
    expect(native.writeFile).toHaveBeenCalledWith({
      path: "outbox/ORD-1006 - Sweet Delights.png",
      data: btoa("png"),
      directory: "CACHE",
      recursive: true,
    });
    expect(native.share).toHaveBeenCalledWith({ files: ["file:///cache/outbox/bill"], text });
    expect(clicked).toEqual([]);
  });

  it("saves a PDF through the same sheet, since a WebView cannot download", async () => {
    const pdf = new Blob(["%PDF"], { type: "application/pdf" });
    expect(await saveFile(pdf, "ORD-1006.pdf")).toBe("SHARED");
    expect(native.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "outbox/ORD-1006.pdf", data: btoa("%PDF") }),
    );
    expect(native.share).toHaveBeenCalledWith({ files: ["file:///cache/outbox/bill"], text: undefined });
  });

  it("goes on when there was nothing to clear, reports a closed sheet, and passes on a failure", async () => {
    native.rmdir.mockRejectedValue(new Error("does not exist"));
    native.share.mockRejectedValueOnce(new Error("Share canceled"));
    expect(await share(file, text)).toBe("CANCELLED");
    native.share.mockRejectedValueOnce(new Error("No app can take it"));
    await expect(share(file, text)).rejects.toThrow("No app can take it");
    native.share.mockRejectedValueOnce("odd");
    await expect(share(file, text)).rejects.toBe("odd");
  });

  it("passes on a file it could not read", async () => {
    const unreadable = new File(["x"], "x.png");
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, "error", { value: new DOMException("unreadable") });
      this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
    });
    await expect(share(unreadable, text)).rejects.toThrow("unreadable");
  });
});
