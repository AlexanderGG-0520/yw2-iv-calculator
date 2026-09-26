import { describe, expect, it } from "vitest";
import { isAllowedMcpOrigin, mcpAllowedOrigins } from "./originPolicy";

describe("MCP Origin policy", () => {
  it("allows originless MCP clients", () => {
    expect(
      isAllowedMcpOrigin(undefined, mcpAllowedOrigins("https://yw2-iv.alec-ofc.com")),
    ).toBe(true);
  });

  it("allows only configured browser origins", () => {
    const allowed = mcpAllowedOrigins(
      "https://yw2-iv.alec-ofc.com, http://localhost:8080/",
    );

    expect(isAllowedMcpOrigin("https://yw2-iv.alec-ofc.com", allowed)).toBe(true);
    expect(isAllowedMcpOrigin("http://localhost:8080", allowed)).toBe(true);
    expect(isAllowedMcpOrigin("https://evil.example", allowed)).toBe(false);
  });

  it("does not treat Origin null as originless", () => {
    const denied = mcpAllowedOrigins("https://yw2-iv.alec-ofc.com");
    const allowed = mcpAllowedOrigins("https://yw2-iv.alec-ofc.com,null");

    expect(isAllowedMcpOrigin("null", denied)).toBe(false);
    expect(isAllowedMcpOrigin("null", allowed)).toBe(true);
  });

  it("defaults to the production site origin", () => {
    expect(mcpAllowedOrigins(undefined)).toEqual(
      new Set(["https://yw2-iv.alec-ofc.com"]),
    );
  });
});
