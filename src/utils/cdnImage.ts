// Host that CLOUDFLARE_PUBLIC_URL points at. Only URLs on this host can be resized.
const CDN_HOST = import.meta.env?.VITE_IMAGE_CDN_HOST || 'img.gogerami.com';

function transformable(url: string): boolean {
  return !!url && url.includes(CDN_HOST) && !url.includes('/cdn-cgi/image/');
}

/**
 * Rewrites an R2 image URL through Cloudflare's resizing endpoint.
 * Passes through untouched for local dev, placeholders and presigned delivery URLs.
 */
export function cdnImage(url: string, width: number): string {
  if (!transformable(url)) return url;
  return url.replace(
    `${CDN_HOST}/`,
    `${CDN_HOST}/cdn-cgi/image/width=${width},quality=80,format=auto/`
  );
}

/** srcset string so the browser picks the size it actually needs. undefined = not on the CDN. */
export function cdnSrcSet(url: string, widths: number[]): string | undefined {
  if (!transformable(url)) return undefined;
  return widths.map(w => `${cdnImage(url, w)} ${w}w`).join(', ');
}
