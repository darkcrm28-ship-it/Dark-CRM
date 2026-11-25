export function isSupportedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    const { hostname: host, pathname: path } = url;
    if (host === "fcm.googleapis.com") return path.startsWith("/fcm/send/") || path.startsWith("/wp/");
    if (host === "updates.push.services.mozilla.com") return path.startsWith("/wpush/");
    if (host.endsWith(".push.apple.com")) return path.length > 1;
    return host.endsWith(".notify.windows.com") && path.length > 1;
  } catch {
    return false;
  }
}
