// src/components/ui/Sidebar.tsx
import Link from "next/link";
import React from "react";

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-800 text-white fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-8 text-gray-200">Trip Planner</h2>
        
        <nav className="space-y-2">
          <Link 
            href="/" 
            className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          >
            <span className="text-lg">🏠</span>
            <span className="ml-3">Home</span>
          </Link>

          <Link 
            href="/trips/[id]" 
            as="/trips/1" 
            className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          >
            <span className="text-lg">📍</span>
            <span className="ml-3">Trip Details</span>
          </Link>

          <Link 
            href="/trips/[id]/logs" 
            as="/trips/1/logs" 
            className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
          >
            <span className="text-lg">📝</span>
            <span className="ml-3">Log Sheet</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}