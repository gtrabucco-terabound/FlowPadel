import { describe, it, expect } from "vitest";
import { cn, initials } from "@/lib/utils";

describe("initials", () => {
  it("devuelve ? para vacío", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
  it("dos letras para un solo nombre", () => {
    expect(initials("German")).toBe("GE");
  });
  it("primera + última para nombre completo", () => {
    expect(initials("German Trabucco")).toBe("GT");
    expect(initials("  Ana  Maria  Lopez ")).toBe("AL");
  });
});

describe("cn", () => {
  it("combina clases", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("resuelve conflictos de tailwind (última gana)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("descarta falsy", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
