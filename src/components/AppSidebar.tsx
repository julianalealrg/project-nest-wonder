import { Home, Factory, Truck, FileText, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNue from "@/assets/logo-nue-v1.svg";
import { useState } from "react";

const menuItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Produção", url: "/producao", icon: Factory },
  { title: "Logística", url: "/logistica", icon: Truck },
  { title: "Registros", url: "/registros", icon: FileText },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
];

const adminItem = { title: "Admin", url: "/admin", icon: Settings };

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.perfil === "admin";
  const allItems = isAdmin ? [...menuItems, adminItem] : menuItems;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center justify-center py-8 px-4">
        <img src={logoNue} alt="NUE Projetos" className="h-10 w-auto invert" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {allItems.map((item) => {
          const active = location.pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="text-sm font-medium text-sidebar-foreground truncate">
          {profile?.nome || "Usuário"}
        </div>
        <div className="text-xs text-sidebar-muted mt-0.5 capitalize">
          {profile?.perfil || "—"} • {profile?.base || "—"}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 mt-3 text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-md shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[220px] z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground z-50"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] min-h-screen flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
