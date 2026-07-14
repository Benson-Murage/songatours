import { useEffect } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * Syncs runtime <head> tags to the app_settings values so branding,
 * SEO defaults, and PWA colors update sitewide without redeploys.
 * Mounted once at the App root.
 */
const setMeta = (selector: string, attr: string, value: string) => {
  if (!value) return;
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    const isLink = selector.startsWith("link");
    el = document.createElement(isLink ? "link" : "meta") as any;
    if (selector.includes('[name="')) {
      const name = selector.match(/\[name="([^"]+)"\]/)?.[1];
      if (name) el!.setAttribute("name", name);
    } else if (selector.includes('[property="')) {
      const p = selector.match(/\[property="([^"]+)"\]/)?.[1];
      if (p) el!.setAttribute("property", p);
    } else if (selector.includes('[rel="')) {
      const r = selector.match(/\[rel="([^"]+)"\]/)?.[1];
      if (r) el!.setAttribute("rel", r);
    }
    document.head.appendChild(el!);
  }
  el.setAttribute(attr, value);
};

const SettingsApplier = () => {
  const { data } = useAppSettings();

  useEffect(() => {
    if (!data) return;

    const title = data.seo?.default_title || data.company?.name || "Songa Travel & Tours";
    const description = data.seo?.default_description || data.company?.description || "";
    const themeColor = data.pwa?.theme_color || data.branding?.primary_color || "#1a7a6d";
    const appTitle = data.pwa?.short_name || data.company?.name || "Songa";
    const favicon = data.branding?.favicon_url;
    const ogImage = data.seo?.og_image;

    // Only set title if no route-level useSEO() has claimed a custom one
    // (useSEO sets titles containing brand or full page names; leave those alone).
    if (!document.title || document.title === "Songa Travel & Tours") {
      document.title = title;
    }

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="theme-color"]', "content", themeColor);
    setMeta('meta[name="apple-mobile-web-app-title"]', "content", appTitle);
    if (ogImage) {
      setMeta('meta[property="og:image"]', "content", ogImage);
      setMeta('meta[name="twitter:image"]', "content", ogImage);
    }
    if (favicon) {
      setMeta('link[rel="icon"]', "href", favicon);
      setMeta('link[rel="apple-touch-icon"]', "href", favicon);
    }
    // Keep <html lang> in sync with a well-known default
    document.documentElement.lang = document.documentElement.lang || "en";
  }, [data]);

  return null;
};

export default SettingsApplier;
