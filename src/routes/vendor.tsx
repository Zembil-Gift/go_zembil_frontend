export { clientLoader, HydrateFallback, meta } from "./client-only";
import { VendorRoute } from "@/components/route-guards";
import VendorDashboardLayout from "@/pages/vendor/VendorDashboardLayout";

// VendorDashboardLayout renders the <Outlet /> for /vendor/* itself.
export default function Vendor() {
  return (
    <VendorRoute>
      <VendorDashboardLayout />
    </VendorRoute>
  );
}
