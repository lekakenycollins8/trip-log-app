"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { X, Home, FileText, Truck, ChevronDown, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { getTripsList, deleteTrip as deleteTripApi } from "@/services/api"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [tripsExpanded, setTripsExpanded] = useState(false)

  // Fetch trips list for the sidebar
  const { data: trips } = useQuery({
    queryKey: ["trips-list"],
    queryFn: getTripsList,
    staleTime: 60000, // 1 minute
  })

  // Expand trips section if we're on a trip page
  useEffect(() => {
    if (pathname?.includes("/trips/")) {
      setTripsExpanded(true)
    }
  }, [pathname])

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      <aside
        className={`
          w-64 h-full bg-gray-800 text-white fixed left-0 top-0 z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          overflow-y-auto
        `}
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold text-gray-200">ELD Trip Planner</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <div className="p-4">
          <nav className="space-y-1">
            <Link
              href="/"
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors font-medium
                ${pathname === "/" ? "bg-gray-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-700 hover:text-white"}
              `}
            >
              <Home className="h-5 w-5 mr-2" />
              <span>Home</span>
            </Link>

            {/* Trips section with dropdown */}
            <div>
              <button
                onClick={() => setTripsExpanded(!tripsExpanded)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                  ${
                    pathname?.includes("/trips") && !pathname?.includes("/trips/new")
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }
                `}
              >
                <div className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  <span>Trips</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${tripsExpanded ? "rotate-180" : ""}`} />
              </button>

              {tripsExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <Link
                    href="/trips/new"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium
                      ${pathname === "/trips/new" ? "bg-gray-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                  >
                    <span>+ New Trip</span>
                  </Link>

                  {trips && trips.length > 0 ? (
                    trips.map((trip: any) => (
                      <Link key={trip.id} href={`/trips/${trip.id}`} className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${pathname === `/trips/${trip.id}` ? "bg-gray-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}>
                        <span className="truncate">
                          {trip.pickup_location?.address?.split(",")[0]} to{" "}
                          {trip.dropoff_location?.address?.split(",")[0]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-500 hover:text-white"
                          onClick={(e) => {
                            e.preventDefault(); // Prevent navigation
                            if (window.confirm("Are you sure you want to delete this trip?")) {
                              deleteTripApi(trip.id);
                            }
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-400">No trips yet</div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/help"
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors
                ${pathname === "/help" ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}
              `}
            >
              <FileText className="h-5 w-5 mr-2" />
              <span>Help & Regulations</span>
            </Link>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            <p>ELD Trip Planner</p>
            <p>HOS Compliant • FMCSA Regulations</p>
          </div>
        </div>
      </aside>
    </>
  )
}