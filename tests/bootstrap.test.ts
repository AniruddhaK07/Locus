import { describe, it, expect } from "vitest";
import { ENGINE_NAME, ENGINE_VERSION } from "../src/engine";

describe("Bootstrap verification", () => {
  it("exports stable engine identifiers", () => {
    expect(ENGINE_NAME).toBe("Locus Engine");
    expect(ENGINE_VERSION).toBe("0.1.0");
  });
});
