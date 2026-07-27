import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/pages/login-page";
import { NotFoundPage } from "@/pages/not-found-page";

/** 未持有内存凭证时回到登录页，并记录来源路径用于登录后回跳。 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <>{children}</>;
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      {
        path: "/dashboard",
        lazy: async () => ({
          Component: (await import("@/pages/dashboard-page")).DashboardPage,
        }),
      },
      {
        path: "/transactions",
        lazy: async () => ({
          Component: (await import("@/pages/transactions-page"))
            .TransactionsPage,
        }),
      },
      {
        path: "/transactions/new",
        lazy: async () => ({
          Component: (await import("@/pages/transaction-new-page"))
            .TransactionNewPage,
        }),
      },
      {
        path: "/transactions/:id/edit",
        lazy: async () => ({
          Component: (await import("@/pages/transaction-edit-page"))
            .TransactionEditPage,
        }),
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
