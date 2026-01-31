import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
// FIX: Use only one Toaster (Sonner) and configure it globally
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/components/shared/UserContext";
import Pages from "@/pages/index.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <UserProvider>
            <Pages />
            {/* FIX: Position top-right to match your preference, remove duplicate bottom-right */}
            <Toaster position="top-right" richColors closeButton />
          </UserProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;