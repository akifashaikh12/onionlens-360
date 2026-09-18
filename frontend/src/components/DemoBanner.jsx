import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DemoBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-4">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="font-semibold">DEMO MODE</span>
      <span className="text-amber-600">— Sample inference data. Not representative of real model accuracy.</span>
    </div>
  )
}
