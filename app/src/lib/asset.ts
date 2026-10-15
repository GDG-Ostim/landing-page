// Public files (images, video, fonts) can be served from a CDN in the static
// export: set VITE_ASSET_BASE to the CDN origin+path; locally it stays "".
const ASSET_BASE = ((import.meta.env.VITE_ASSET_BASE as string | undefined) ?? "").replace(/\/$/, "");

export const asset = (path: string) => `${ASSET_BASE}${path}`;
