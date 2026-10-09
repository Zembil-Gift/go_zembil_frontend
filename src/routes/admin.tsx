export { clientLoader, HydrateFallback, meta } from "./client-only";
import { Outlet } from "react-router-dom";
import { AdminRoute } from "@/components/route-guards";

export default function Admin() {
  return (
    <AdminRoute>
      <div className="min-h-screen">
        <Outlet />
      </div>
    </AdminRoute>
  );
}
