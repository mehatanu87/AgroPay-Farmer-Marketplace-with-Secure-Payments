import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-extrabold text-agro-600 mb-2">404</h1>
      <p className="text-gray-500 mb-6">This page doesn't exist.</p>
      <Link to="/" className="px-5 py-2 rounded-full bg-agro-600 text-white text-sm font-medium">
        Back home
      </Link>
    </div>
  );
}
