import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { ToasterProvider } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { router } from "@/routes/router";

import "@/styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToasterProvider>
          <RouterProvider router={router} />
        </ToasterProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
