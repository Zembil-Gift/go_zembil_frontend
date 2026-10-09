export { clientLoader, HydrateFallback, meta } from "./client-only";
import { DeliveryRoute } from "@/components/route-guards";
import DeliveryLayout from "@/pages/delivery/DeliveryLayout";

// DeliveryLayout renders the <Outlet /> for /delivery/* itself.
export default function Delivery() {
  return (
    <DeliveryRoute>
      <DeliveryLayout />
    </DeliveryRoute>
  );
}
