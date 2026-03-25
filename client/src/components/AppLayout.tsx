import { useLocation, Link } from "wouter";
import { Search, BarChart2, Users, TrendingUp, FileText, Shield, Home, ChevronRight, RefreshCw } from "lucide-react";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
  parliamentarianId?: number;
  parliamentarianName?: string;
}

export default function AppLayout({ children, parliamentarianId, parliamentarianName }: AppLayoutProps) {
  const [location] = useLocation();

  const navItems = parliamentarianId ? [
    { href: `/parlamentar/${parliamentarianId}`, label: "Visão Geral", icon: BarChart2 },
    { href: `/parlamentar/${parliamentarianId}/funcionarios`, label: "Funcionários", icon: Users },
    { href: `/parlamentar/${parliamentarianId}/patrimonio`, label: "Patrimônio", icon: TrendingUp },
    { href: `/parlamentar/${parliamentarianId}/contratos`, label: "Contratos", icon: FileText },
    { href: `/parlamentar/${parliamentarianId}/relatorio`, label: "Relatório IA", icon: Shield },
  ] : [];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b-3 border-black" style={{ borderBottomWidth: "3px" }}>
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3 no-underline text-black">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <span className="font-black text-sm tracking-widest uppercase">Parliament</span>
              <span className="font-black text-sm tracking-widest uppercase text-gray-400"> Monitor</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/admin/sync" className="brutal-btn-outline text-xs">
              <RefreshCw size={13} />
              Sincronizar
            </Link>
            <Link href="/search" className="brutal-btn-outline text-xs">
              <Search size={13} />
              Nova Busca
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb + sidebar layout */}
      {parliamentarianId ? (
        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="w-56 border-r-2 border-black flex-shrink-0 hidden lg:block">
            <div className="p-4 border-b-2 border-black">
              <p className="mono-label mb-1">Parlamentar</p>
              <p className="font-bold text-sm leading-tight">{parliamentarianName ?? "—"}</p>
            </div>
            <nav className="py-2">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item ${location === href ? "active" : ""}`}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t-2 border-black mt-auto">
              <Link href="/" className="nav-item text-xs">
                <Home size={12} />
                Início
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile nav */}
            <div className="lg:hidden border-b-2 border-black overflow-x-auto">
              <div className="flex">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-3 ${location === href ? "border-black bg-black text-white" : "border-transparent"}`}
                    style={{ borderBottomWidth: location === href ? "3px" : "3px", borderBottomColor: location === href ? "black" : "transparent" }}
                  >
                    <Icon size={12} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      ) : (
        <main className="flex-1">
          {children}
        </main>
      )}
    </div>
  );
}
