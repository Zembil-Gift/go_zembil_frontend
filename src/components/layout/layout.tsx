import { Outlet } from "react-router-dom";
import Header from "./streamlined-header";
import Footer from "./footer";
import SectionBoundary from "@/components/SectionBoundary";
import { useAuth } from "@/hooks/useAuth";

export default function Layout() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAdmin && <Header />}
      <main>
        {/* Last net: a page that throws loses the page, not the whole shell —
            navigation stays usable instead of the site going blank. */}
        <SectionBoundary
          name="Page"
          fallback={
            <div className="page-shell py-24 text-center">
              <p className="font-medium text-charcoal">
                Something went wrong loading this page.
              </p>
              <a
                href="/"
                className="mt-3 inline-block text-sm font-semibold text-viridian-green hover:underline"
              >
                Go to homepage
              </a>
            </div>
          }
        >
          <Outlet />
        </SectionBoundary>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}