"use client"

import { useParams } from "next/navigation"
import { useLogs, useGenerateLogs, useTrip } from "@/hooks/useTripData"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function LogSheetPage() {
  const params = useParams()
  const tripId = params.id as string
  const { data: trip } = useTrip(tripId)
  const { data: logs, isLoading, refetch } = useLogs(tripId)
  const generateLogsMutation = useGenerateLogs(tripId)
  const [activeDate, setActiveDate] = useState<string | null>(null)

  const handleRegenerateLogs = async () => {
    try {
      await generateLogsMutation.mutateAsync()
      refetch()
    } catch (error) {
      console.error("Failed to regenerate logs", error)
    }
  }

  // Group logs by date
  const logsByDate = logs
    ? logs.reduce(
        (acc, log) => {
          if (!acc[log.date]) {
            acc[log.date] = []
          }
          acc[log.date].push(log)
          return acc
        },
        {} as Record<string, any[]>,
      )
    : {}

  // Get unique dates
  const dates = Object.keys(logsByDate).sort()

  // Set first date as active if none selected
  if (dates.length > 0 && !activeDate) {
    setActiveDate(dates[0])
  }

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading logs...</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Trip Log Sheet</h1>
        <div className="flex gap-2">
          <Button onClick={handleRegenerateLogs} disabled={generateLogsMutation.isPending}>
            {generateLogsMutation.isPending ? "Generating..." : "Generate Logs"}
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            Print / Download
          </Button>
        </div>
      </div>

      {trip && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Trip Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>From:</strong> {trip.current_location.address}
              </p>
              <p>
                <strong>To:</strong> {trip.dropoff_location.address}
              </p>
            </div>
            <div>
              <p>
                <strong>Estimated Distance:</strong>{" "}
                {trip.estimated_distance ? `${Math.round(trip.estimated_distance)} miles` : "Not calculated"}
              </p>
              <p>
                <strong>Estimated Duration:</strong>{" "}
                {trip.estimated_duration ? `${Math.round(trip.estimated_duration)} hours` : "Not calculated"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date selector tabs */}
      {dates.length > 0 ? (
        <>
          <div className="flex overflow-x-auto mb-4 border-b">
            {dates.map((date) => (
              <button
                key={date}
                className={`px-4 py-2 font-medium ${activeDate === date ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
                onClick={() => setActiveDate(date)}
              >
                {new Date(date).toLocaleDateString()}
              </button>
            ))}
          </div>

          {/* Log sheet for selected date */}
          {activeDate && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="text-lg font-semibold">
                  Daily Log for{" "}
                  {new Date(activeDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h2>
              </div>

              {/* ELD Log Visualization */}
              <div className="p-4 border-b">
                <h3 className="text-md font-medium mb-2">Hours of Service Graph</h3>
                <div className="relative h-32 border rounded">
                  <div className="absolute inset-0">
                    {/* Time markers */}
                    <div className="flex h-6 border-b">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="flex-1 text-xs text-center border-r">
                          {i}:00
                        </div>
                      ))}
                    </div>

                    {/* Status rows */}
                    <div className="flex flex-col h-[calc(100%-24px)]">
                      <div className="flex-1 border-b flex items-center pl-2 text-xs font-medium">Off Duty</div>
                      <div className="flex-1 border-b flex items-center pl-2 text-xs font-medium">Sleeper</div>
                      <div className="flex-1 border-b flex items-center pl-2 text-xs font-medium">Driving</div>
                      <div className="flex-1 flex items-center pl-2 text-xs font-medium">On Duty</div>
                    </div>

                    {/* Log entry bars */}
                    {logsByDate[activeDate]?.map((log, index) => {
                      const startHour = Number.parseInt(log.start_time.split(":")[0])
                      const startMin = Number.parseInt(log.start_time.split(":")[1])
                      const endHour = Number.parseInt(log.end_time.split(":")[0])
                      const endMin = Number.parseInt(log.end_time.split(":")[1])

                      const startPercent = ((startHour + startMin / 60) / 24) * 100
                      const endPercent = ((endHour + endMin / 60) / 24) * 100
                      const width = endPercent - startPercent

                      let top = 0
                      if (log.status === "off_duty") top = 6
                      else if (log.status === "sleeper") top = 6 + 26
                      else if (log.status === "driving") top = 6 + 26 * 2
                      else if (log.status === "on_duty") top = 6 + 26 * 3

                      return (
                        <div
                          key={index}
                          className={`absolute h-6 ${
                            log.status === "off_duty"
                              ? "bg-green-200"
                              : log.status === "sleeper"
                                ? "bg-blue-200"
                                : log.status === "driving"
                                  ? "bg-red-200"
                                  : "bg-yellow-200"
                          }`}
                          style={{
                            left: `${startPercent}%`,
                            width: `${width}%`,
                            top: `${top}px`,
                          }}
                          title={`${log.start_time} - ${log.end_time}: ${log.status}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Log entries table */}
              <div className="p-4">
                <h3 className="text-md font-medium mb-2">Log Entries</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 border text-left">Status</th>
                        <th className="p-2 border text-left">Start Time</th>
                        <th className="p-2 border text-left">End Time</th>
                        <th className="p-2 border text-left">Duration</th>
                        <th className="p-2 border text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsByDate[activeDate]?.map((log, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 border capitalize">{log.status.replace("_", " ")}</td>
                          <td className="p-2 border">{log.start_time}</td>
                          <td className="p-2 border">{log.end_time}</td>
                          <td className="p-2 border">{Math.round(log.duration / 60)} min</td>
                          <td className="p-2 border">{log.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily summary */}
              <div className="p-4 bg-gray-50">
                <h3 className="text-md font-medium mb-2">Daily Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["driving", "on_duty", "off_duty", "sleeper"].map((status) => {
                    const totalMinutes =
                      logsByDate[activeDate]
                        ?.filter((log) => log.status === status)
                        .reduce((sum, log) => sum + log.duration / 60, 0) || 0

                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = Math.round(totalMinutes % 60)

                    return (
                      <div key={status} className="bg-white p-3 rounded border">
                        <div className="text-sm text-gray-500 capitalize">{status.replace("_", " ")}</div>
                        <div className="text-xl font-semibold">
                          {hours}h {minutes}m
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">No log entries found for this trip.</p>
          <Button onClick={handleRegenerateLogs}>Generate Logs</Button>
        </div>
      )}
    </div>
  )
}

