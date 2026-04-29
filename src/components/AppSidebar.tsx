import { Home, Factory, Truck, FileText, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogoNue } from "@/components/common/LogoNue";
import { useState } from "react";

const menuItems = [
  { title: "Início", url: "/", icon: Home, color: "" },
  { title: "Produção", url: "/producao", icon: Factory, color: "text-nue-laranja" },
  { title: "Logística", url: "/logistica", icon: Truck, color: "text-nue-azul" },
  { title: "Registros", url: "/registros", icon: FileText, color: "text-nue-roxo" },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, color: "" },
];

const adminItem = { title: "Admin", url: "/admin", icon: Settings, color: "" };

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.perfil === "admin";
  const allItems = isAdmin ? [...menuItems, adminItem] : menuItems;

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-sidebar text-sidebar-foreground">
      {/* Logo — currentColor herda a cor do texto, então fica claro em fundo escuro */}
      <div className="flex items-center justify-center py-8 px-4 text-[#F0EDE8]">
        <LogoNue className="h-8 w-auto" aria-label="NUE Projetos" />
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
                  ? "bg-[#F0EDE8] text-[#0D0D0D]"
                  : "text-[#F0EDE8]/70 hover:bg-sidebar-accent/50 hover:text-white"
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? "" : item.color}`} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="text-sm font-medium text-[#F0EDE8] truncate">
          {profile?.nome || "Usuário"}
        </div>
        <div className="text-xs text-[#F0EDE8]/50 mt-0.5 capitalize">
          {profile?.perfil || "—"} • {profile?.base || "—"}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 mt-3 text-xs text-[#F0EDE8]/60 hover:text-white transition-colors"
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
