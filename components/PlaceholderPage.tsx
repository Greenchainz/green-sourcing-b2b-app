import Link from "next/link";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
        <div className="mb-6">
          <span className="text-6xl">🚧</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-lg text-gray-600 mb-8">{description}</p>
        <p className="text-sm text-gray-500 mb-8">
          This page is under construction. Check back soon!
        </p>
        <Link
          href="/"
          className="inline-block bg-[#66BB6A] hover:bg-[#4CAF50] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
