import { Outlet } from "react-router-dom";
import Header from "./streamlined-header";
import Footer from "./footer";
import { useAuth } from "@/hooks/useAuth";

export default function Layout() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAdmin && <Header />}
      <main>
        <Outlet />
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}