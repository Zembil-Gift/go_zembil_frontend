import type { MetaFunction } from "react-router";
import { useTranslation } from "react-i18next";
import { RouteLoading } from "@/components/route-guards";
import { noindexMeta } from "@/lib/seo-meta";

// Shared by the layout routes around everything that needs a signed-in user
// (protected, admin, vendor, delivery). Those pages are never rendered on the
// server -- only the browser knows who is signed in -- so each of those
// modules re-exports these three:
//
//   clientLoader + hydrate: the route waits for the browser, and the server
//     sends HydrateFallback in its place (nothing below it renders in Node);
//   meta: noindex for the whole subtree, as useNoindex() did in the guards.

export const clientLoader = async () => null;
clientLoader.hydrate = true as const;

export function HydrateFallback() {
  const { t } = useTranslation();
  return <RouteLoading message={t("Checking authentication...")} />;
}

export const meta: MetaFunction = ({ location }) => noindexMeta(undefined, location.pathname);
