import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  action?: ReactNode;
}

export function AppLayout({ children, title, action }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 border-b border-[#CCC8C2] bg-[#F0EDE8]">
          <h1 className="font-display text-lg sm:text-xl text-[#0D0D0D] pl-12 lg:pl-0 truncate min-w-0">{title}</h1>
          {action && <div className="flex-shrink-0">{action}</div>}
        </header>

        {/* Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
