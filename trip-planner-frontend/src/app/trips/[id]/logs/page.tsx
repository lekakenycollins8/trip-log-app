// src/app/trips/[id]/logs/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useLogs, useGenerateLogs } from "@/hooks/useTripData";
import { Button } from "@/components/ui/button";

export default function LogSheetPage() {
  const params = useParams();
  const tripId = params.id as string;
  const { data: logs, isLoading, refetch } = useLogs(tripId);
  const generateLogsMutation = useGenerateLogs(tripId);

  const handleRegenerateLogs = async () => {
    try {
      await generateLogsMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error("Failed to regenerate logs", error);
    }
  };

  if (isLoading) return <div>Loading logs...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Trip Log Sheet</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Start Time</th>
            <th className="p-2 border">End Time</th>
            <th className="p-2 border">Duration</th>
            <th className="p-2 border">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {logs && logs.map((log: any) => (
            <tr key={log.id}>
              <td className="p-2 border">{log.date}</td>
              <td className="p-2 border">{log.status}</td>
              <td className="p-2 border">{log.start_time}</td>
              <td className="p-2 border">{log.end_time}</td>
              <td className="p-2 border">{Math.round(log.duration / 3600)} hrs</td>
              <td className="p-2 border">{log.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <Button onClick={handleRegenerateLogs}>Regenerate Logs</Button>
        <Button onClick={() => window.print()} className="ml-2">
          Print / Download
        </Button>
      </div>
    </div>
  );
}