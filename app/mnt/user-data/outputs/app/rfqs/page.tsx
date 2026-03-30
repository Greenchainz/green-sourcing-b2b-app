// app/rfqs/page.tsx
import { FileText } from 'lucide-react'

export default function RFQsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto mb-5">
          <FileText className="w-6 h-6 text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">RFQ Management</h1>
        <p className="text-gray-500 text-sm">
          Create and manage requests for quotes from verified sustainable material suppliers.
          This experience is coming soon.
        </p>
      </div>
    </div>
  )
}
