// app/materials/page.tsx
import { Layers } from 'lucide-react'

export default function MaterialsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto mb-5">
          <Layers className="w-6 h-6 text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">My Materials</h1>
        <p className="text-gray-500 text-sm">
          Track and manage the sustainable materials you've specified or saved for your projects.
        </p>
      </div>
    </div>
  )
}
