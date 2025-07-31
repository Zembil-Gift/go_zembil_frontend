import { Outlet } from "react-router-dom";
import Header from "./streamlined-header";
import Footer from "./footer";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}