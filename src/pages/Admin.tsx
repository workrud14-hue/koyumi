import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  PlusCircle,
  LogOut,
  Store,
  ShieldOff,
  Layers,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

const sidebarLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "DASHBOARD", exact: true },
  { to: "/admin/products", icon: Package, label: "PRODUCTS" },
  { to: "/admin/collections", icon: Layers, label: "COLLECTIONS" },
  { to: "/admin/pricing", icon: DollarSign, label: "PRICING" },
  { to: "/admin/add-product", icon: PlusCircle, label: "ADD PRODUCT" },
];

export default function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth?returnTo=/admin", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <div className="h-8 w-8 animate-spin border-2 border-outline-variant border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4">
        <div className="text-center">
          <ShieldOff size={48} className="mx-auto mb-4 text-error" strokeWidth={1} />
          <h1 className="mb-2 font-display text-2xl font-bold text-signal">
            ACCESS DENIED
          </h1>
          <p className="mb-6 font-body text-sm text-shadow">
            You don't have permission to access the admin panel.
          </p>
          <Link
            to="/"
            className="inline-block border border-signal bg-transparent px-6 py-2.5 font-mono text-xs tracking-[0.15em] text-signal no-underline transition-colors hover:bg-signal hover:text-void"
          >
            BACK TO STORE
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (path: string, exact?: boolean) =>
    exact
      ? location.pathname === path
      : location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-void">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-outline-variant/20 bg-surface md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-outline-variant/20 px-6">
          <Store size={18} className="text-primary" />
          <span className="font-display text-sm font-bold text-signal">ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-4">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to, link.exact);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`mb-1 flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.1em] no-underline transition-colors ${
                  active
                    ? "bg-primary-container/10 text-primary"
                    : "text-shadow hover:bg-surface-container hover:text-signal"
                }`}
              >
                <Icon size={16} strokeWidth={1.5} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant/20 p-3">
          <div className="mb-3 px-3">
            <p className="font-mono text-[9px] tracking-[0.1em] text-outline truncate">{user.email}</p>
          </div>
          <Link
            to="/"
            className="mb-1 flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.1em] text-shadow no-underline transition-colors hover:text-signal"
          >
            <Store size={16} strokeWidth={1.5} />
            VIEW STORE
          </Link>
          <button
            onClick={() => signOut().then(() => navigate("/"))}
            className="flex w-full items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.1em] text-shadow transition-colors hover:text-error"
          >
            <LogOut size={16} strokeWidth={1.5} />
            SIGN OUT
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-outline-variant/20 bg-surface md:hidden">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to, link.exact);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-1 flex-col items-center gap-1 py-3 no-underline ${
                active ? "text-primary" : "text-outline"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="font-mono text-[8px] tracking-[0.1em]">{link.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
