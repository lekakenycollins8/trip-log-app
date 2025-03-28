// app/test/page.tsx
export default function TestPage() {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Tailwind Test Page
        </h1>
        <div className="bg-red-500 text-white p-4 rounded-lg">
          This should have a red background
        </div>
        <button className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
          Test Button
        </button>
      </div>
    );
  }