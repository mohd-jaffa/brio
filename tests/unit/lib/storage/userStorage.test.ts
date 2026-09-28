import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearUserItems,
  onUserItemsCleared,
  readUserItem,
  removeUserItem,
  writeUserItem,
} from "@/lib/storage/userStorage";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("what the device keeps for a user", () => {
  it("keeps a value under the user's own key, and gives it back", () => {
    writeUserItem("u-1", "order_draft", { lines: [1] });
    expect(localStorage.getItem("brio_user:u-1:order_draft")).toBe('{"lines":[1]}');
    expect(readUserItem("u-1", "order_draft")).toEqual({ lines: [1] });
    expect(readUserItem("u-2", "order_draft")).toBeNull();
  });

  it("removes one value", () => {
    writeUserItem("u-1", "order_draft", 1);
    removeUserItem("u-1", "order_draft");
    expect(readUserItem("u-1", "order_draft")).toBeNull();
  });

  it("clears every user's values, leaving the rest of storage alone, and says so", () => {
    const cleared = vi.fn();
    const stop = onUserItemsCleared(cleared);
    writeUserItem("u-1", "a", 1);
    writeUserItem("u-2", "b", 2);
    localStorage.setItem("brio_theme", "peach");

    clearUserItems();
    expect(readUserItem("u-1", "a")).toBeNull();
    expect(readUserItem("u-2", "b")).toBeNull();
    expect(localStorage.getItem("brio_theme")).toBe("peach");
    expect(cleared).toHaveBeenCalledOnce();

    stop();
    clearUserItems();
    expect(cleared).toHaveBeenCalledOnce();
  });

  it("does nothing, and throws nothing, when storage refuses or holds nonsense", () => {
    localStorage.setItem("brio_user:u-1:bad", "{not json");
    expect(readUserItem("u-1", "bad")).toBeNull();

    const refuse = () => {
      throw new Error("denied");
    };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "key").mockImplementation(refuse);
    expect(() => writeUserItem("u-1", "a", 1)).not.toThrow();
    expect(() => removeUserItem("u-1", "a")).not.toThrow();
    writeUserItem("u-1", "x", 1);
    expect(() => clearUserItems()).not.toThrow();
  });
});
