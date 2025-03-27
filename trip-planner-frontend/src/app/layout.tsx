// src/app/layout.tsx
"use client";
import React from "react";
import Sidebar from "@/components/Sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex">
        <QueryClientProvider client={queryClient}>
          {/* Sidebar occupies a fixed portion of the screen */}
          <Sidebar />
          {/* Main content area */}
          <main className="flex-1 p-4">{children}</main>
        </QueryClientProvider>
      </body>
    </html>
  );
}