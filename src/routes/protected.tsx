import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/route-guards";

// Pathless layout around every customer page that needs a login.
export default function Protected() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}
