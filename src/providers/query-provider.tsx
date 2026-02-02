"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimización: Mantener datos frescos más tiempo para navegación rápida
            staleTime: 5 * 60 * 1000, // 5 minutos - reduce refetches entre navegaciones
            gcTime: 10 * 60 * 1000, // 10 minutos - mantener cache más tiempo
            refetchOnWindowFocus: false,
            refetchOnMount: false, // No refetch si ya hay datos en cache
            refetchOnReconnect: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
