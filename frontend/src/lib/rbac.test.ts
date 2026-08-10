import { describe, expect, it } from "vitest";
import {
  isAdminRole,
  isMemberOrAbove,
  normalizeWorkspaceRole,
} from "./rbac";

describe("normalizeWorkspaceRole", () => {
  it("boşluk kırpar ve büyük harfe çevirir", () => {
    expect(normalizeWorkspaceRole("  admin ")).toBe("ADMIN");
  });

  it("null/undefined için boş string döner", () => {
    expect(normalizeWorkspaceRole(null)).toBe("");
    expect(normalizeWorkspaceRole(undefined)).toBe("");
  });
});

describe("isAdminRole", () => {
  it.each(["Admin", "ADMIN", "admin", "OWNER", "owner"])(
    "%s için true döner",
    (role) => {
      expect(isAdminRole(role)).toBe(true);
    },
  );

  it.each(["Member", "Guest", "", null, undefined])(
    "%s için false döner",
    (role) => {
      expect(isAdminRole(role)).toBe(false);
    },
  );
});

describe("isMemberOrAbove", () => {
  it.each(["Admin", "OWNER", "Member", "member"])(
    "%s için true döner",
    (role) => {
      expect(isMemberOrAbove(role)).toBe(true);
    },
  );

  it.each(["Guest", "", null, undefined])("%s için false döner", (role) => {
    expect(isMemberOrAbove(role)).toBe(false);
  });
});
