const workerOrigin = "https://wodejia-line-console.plmp99065.workers.dev";

export function apiUrl(path: string) {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
    return `${workerOrigin}${path}`;
  }
  return path;
}

export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
