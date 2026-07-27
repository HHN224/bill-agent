import { LogOut, Plus } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "总览" },
  { to: "/transactions", label: "交易" },
];

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-card/90 sticky top-0 z-40 border-b-2 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 font-extrabold tracking-tight"
          >
            <span
              aria-hidden
              className="bg-primary text-primary-foreground shadow-pop-sm flex size-7 shrink-0 -rotate-6 items-center justify-center rounded-md text-sm font-bold"
            >
              账
            </span>
            <span className="hidden whitespace-nowrap min-[420px]:inline">
              Pocket Ledger
            </span>
          </NavLink>
          <nav aria-label="主导航" className="ml-2 flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-pop-sm font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/transactions/new")}
              className="gap-1"
            >
              <Plus aria-hidden />
              <span className="hidden sm:inline">新增交易</span>
              <span className="sm:hidden">新增</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="退出登录"
              className="text-muted-foreground"
            >
              <LogOut aria-hidden />
              <span className="hidden sm:inline">退出</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
