import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessRequestUrl } from "./publicConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public access-request configuration", () => {
  it.each([
    "https://example.test/request-access",
    "mailto:access@example.test",
  ])("accepts the public %s URL", (value) => {
    vi.stubEnv("VITE_ACCESS_REQUEST_URL", value);
    expect(getAccessRequestUrl()).toBe(value);
  });

  it.each(["javascript:alert(1)", "not a URL", ""])(
    "rejects unsafe or missing value %s",
    (value) => {
      vi.stubEnv("VITE_ACCESS_REQUEST_URL", value);
      expect(getAccessRequestUrl()).toBeNull();
    },
  );
});
