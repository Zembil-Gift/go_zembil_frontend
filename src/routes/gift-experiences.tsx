import { Navigate } from "react-router-dom";

// Old URL, kept so inbound links still land somewhere.
export default function GiftExperiences() {
  return <Navigate to="/events" replace />;
}
