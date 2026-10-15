import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportHiggsfieldError } from "../lib/higgsfield-error-reporting";
import appMetaJson from "../app-meta.json";
import { asset } from "../lib/asset";

declare const __HF_DESIGN_INSPECTOR__: boolean;
type AppMeta = { og_title?: string|null; og_description?: string|null; og_image_url?: string|null; favicon_url?: string|null; og_video_url?: string|null };
const appMeta = appMetaJson as AppMeta;
// The static export serves public files from a CDN; point the share image there too.
if (import.meta.env.VITE_ASSET_BASE) appMeta.og_image_url = asset("/assets/gdg-og.png");

function buildHead(meta: AppMeta) {
  const title = meta.og_title ?? "GDG Ostim Tech";
  const description = meta.og_description ?? "Ankara'da öğrenen, paylaşan ve üreten geliştirici topluluğu.";
  return {
    meta: [{ charSet:"utf-8" }, { name:"viewport", content:"width=device-width, initial-scale=1" }, { name:"theme-color", content:"#FFFFFF" }, { title }, { name:"description", content:description }, { property:"og:title", content:title }, { property:"og:description", content:description }, { property:"og:type", content:"website" }, { property:"og:url", content:"https://gdgostimtech.com/" }, { name:"twitter:card", content:"summary_large_image" }, ...(meta.og_image_url ? [{ property:"og:image", content:meta.og_image_url }, { name:"twitter:image", content:meta.og_image_url }] : [])],
    links: [{ rel:"stylesheet", href:appCss }, { rel:"icon", href:asset("/assets/favicon.ico") }, { rel:"apple-touch-icon", href:asset("/assets/apple-touch-icon.png") }, { rel:"manifest", href:"/site.webmanifest" }],
  };
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => buildHead(appMeta),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <main className="error-page"><h1>404</h1><p>Aradığınız sayfa burada değil.</p><a href="/">Ana sayfaya dön</a></main>,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="tr" style={{ colorScheme:"light" }}><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (!__HF_DESIGN_INSPECTOR__) return;
    void import("../module/design-inspector/runtime")
      .then(({ installHiggsfieldDesignInspector }) => installHiggsfieldDesignInspector())
      .catch(error => reportHiggsfieldError(error instanceof Error ? error : new Error("Design inspector yüklenemedi"), { boundary:"higgsfield_design_inspector_import" }));
  }, []);
  return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>;
}
