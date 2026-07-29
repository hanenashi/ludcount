const ALLOWED_ACCESS_REQUEST_PROTOCOLS = new Set(["https:", "mailto:"]);

export function getAccessRequestUrl(): string | null {
  const value = import.meta.env.VITE_ACCESS_REQUEST_URL?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ALLOWED_ACCESS_REQUEST_PROTOCOLS.has(url.protocol) ? value : null;
  } catch {
    return null;
  }
}
