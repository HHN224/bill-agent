import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { ToasterProvider } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ["/"] }: { initialEntries?: string[] } = {},
) {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToasterProvider>
            <MemoryRouter initialEntries={initialEntries}>
              {children}
            </MemoryRouter>
          </ToasterProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}
