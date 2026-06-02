import { useState, useMemo } from 'react'
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  Area,
} from 'recharts'
import {
  ChevronDown, Shield, Clock,
  DollarSign, Users, Target, Info,
  Zap, Search, Filter, ArrowRight, Sparkles, Database
} from 'lucide-react'

interface AssemblyData {
  id: string
  name: string
  category: string
  total_embodied_carbon: number
  risk_score: number
  labor_productivity: number
  regulatory_compliance: boolean
  fire_rating: string
  warranty_years: number
  lead_time_weeks: number
  cost_premium_pct: number
  defensibility_score: number
  asset_value_delta: number
  occupant_wellness_score: number
  // Agent Intelligence Metrics
  visibility_gap: number // 0-100 (higher means more "invisible" innovator)
  interception_potential: number // 0-100
  is_diamond_in_rough: boolean
  agent_recommendation?: string
  components: Array<{
    material: string
    manufacturer: string
    product: string
    carbon: number
    is_incumbent: boolean
    interception_target?: string
  }>
}

type Persona = 'AOR' | 'SPEC_WRITER' | 'QS' | 'INTERIOR_DESIGNER' | 'GC' | 'AGENT'

const PERSONAS: Record<Persona, { label: string; driver: string; icon: any; color: string }> = {
  AOR: { label: 'Architect of Record', driver: 'Liability & Code', icon: Shield, color: '#10b981' },
  SPEC_WRITER: { label: 'Spec Writer', driver: 'Defensibility & Data', icon: Target, color: '#3b82f6' },
  QS: { label: 'Quantity Surveyor', driver: 'Whole Life Costing', icon: DollarSign, color: '#f59e0b' },
  INTERIOR_DESIGNER: { label: 'Interior Designer', driver: 'Occupant Wellness', icon: Users, color: '#ec4899' },
  GC: { label: 'General Contractor', driver: 'Labor & Schedule', icon: Clock, color: '#8b5cf6' },
  AGENT: { label: 'AI Interceptor', driver: 'Supply Chain Intelligence', icon: Sparkles, color: '#06b6d4' },
}

const CustomTooltip = ({ active, payload, persona }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AssemblyData
    const personaConfig = PERSONAS[persona as Persona]

    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 shadow-2xl max-w-xs">
        <p className="text-white font-bold text-base mb-1">{data.name}</p>
        <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 flex items-center gap-1">
          <personaConfig.icon className="w-3 h-3" style={{ color: personaConfig.color }} />
          {personaConfig.label} View
        </p>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Embodied Carbon:</span>
            <span className="text-green-400 font-bold text-sm">{data.total_embodied_carbon.toLocaleString()} kg</span>
          </div>

          {persona === 'AGENT' && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Visibility Gap:</span>
                <span className="text-cyan-400 font-bold text-sm">{data.visibility_gap}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Interception:</span>
                <span className="text-purple-400 font-bold text-sm">{data.interception_potential}%</span>
              </div>
            </>
          )}

          <div className="pt-2 border-t border-[#2a2a2a] mt-2">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-gray-500" />
              <span className="text-gray-400 text-[10px] italic">
                {personaConfig.driver}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function EmbodiedCarbonChart({
  data,
  height = 500,
}: { data: AssemblyData[]; height?: number }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activePersona, setActivePersona] = useState<Persona>('AGENT')

  const chartData = useMemo(() => {
    return [...data].sort((a, b) => b.total_embodied_carbon - a.total_embodied_carbon)
  }, [data])

  return (
    <div className="w-full bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
      {/* Persona Selector */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Decision-Maker Persona</h3>
          </div>
          {activePersona === 'AGENT' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase">Agent Intelligence Active</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {(Object.keys(PERSONAS) as Persona[]).map((p) => {
            const config = PERSONAS[p]
            const Icon = config.icon
            const isActive = activePersona === p
            return (
              <button
                key={p}
                onClick={() => setActivePersona(p)}
                className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-[#1a1a1a] border-white/20 ring-1 ring-white/10'
                    : 'bg-[#0a0a0a] border-[#1f1f1f] hover:border-white/10'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${isActive ? '' : 'opacity-40'}`} style={{ color: isActive ? config.color : '#4b5563' }} />
                <span className={`text-[10px] font-bold uppercase text-center ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {config.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-[#0a0a0a] rounded-2xl p-6 mb-10 border border-[#1f1f1f] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-purple-500 opacity-20" />

        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#4b5563', fontSize: 11 }}
              label={{ value: 'Embodied Carbon (kg CO₂e)', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 12, offset: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#4b5563', fontSize: 11 }}
              label={{ value: 'Intelligence Score', angle: 90, position: 'insideRight', fill: '#4b5563', fontSize: 12, offset: 10 }}
            />
            <Tooltip content={<CustomTooltip persona={activePersona} />} />

            <Bar yAxisId="left" dataKey="total_embodied_carbon" radius={[6, 6, 0, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.is_diamond_in_rough ? '#06b6d4' : '#1f1f1f'}
                  fillOpacity={activePersona === 'AGENT' ? 0.8 : 0.3}
                />
              ))}
            </Bar>

            {activePersona === 'AGENT' && (
              <>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="visibility_gap"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#06b6d4' }}
                  name="Visibility Gap"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="interception_potential"
                  fill="#8b5cf6"
                  stroke="#8b5cf6"
                  fillOpacity={0.1}
                  name="Interception Potential"
                />
              </>
            )}

            {activePersona === 'SPEC_WRITER' && (
              <Line yAxisId="right" type="monotone" dataKey="defensibility_score" stroke={PERSONAS.SPEC_WRITER.color} strokeWidth={3} />
            )}
            {activePersona === 'QS' && (
              <Line yAxisId="right" type="monotone" dataKey="asset_value_delta" stroke={PERSONAS.QS.color} strokeWidth={3} />
            )}
            {activePersona === 'GC' && (
              <Line yAxisId="right" type="monotone" dataKey="labor_productivity" stroke={PERSONAS.GC.color} strokeWidth={3} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Agent Intelligence Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Search className="w-12 h-12 text-cyan-400" />
          </div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Interception Strategy</h4>
          <div className="text-white font-bold text-sm mb-2">Survival through Visibility</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Our agents intercept incumbent-led workflows by injecting "Diamonds in the Rough"—innovators with verified EPDs but low market visibility.
          </p>
        </div>

        <div className="p-5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-12 h-12 text-purple-400" />
          </div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Agent-Led Procurement</h4>
          <div className="text-white font-bold text-sm mb-2">Zero-Training Transition</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Agents prioritize "Drop-In Replacements" that are chemically identical to incumbents, removing the engineering friction of sustainable swaps.
          </p>
        </div>

        <div className="p-5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database className="w-12 h-12 text-green-400" />
          </div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Global Trust Layer</h4>
          <div className="text-white font-bold text-sm mb-2">Verified Defensibility</div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Every recommendation is backed by the "Cold Calculus" of ASTM compliance and UL verification, ensuring legal safety for the AOR.
          </p>
        </div>
      </div>

      {/* Detailed Audit List with Interception Points */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Supply Chain Interception Audit
        </h3>
        {chartData.map((assembly) => (
          <div
            key={assembly.id}
            className={`bg-[#0a0a0a] border transition-all duration-300 rounded-xl overflow-hidden ${
              expandedId === assembly.id ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-[#1f1f1f]'
            }`}
          >
            <button
              onClick={() => setExpandedId(expandedId === assembly.id ? null : assembly.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#161616] transition-colors"
            >
              <div className="flex items-center gap-6 flex-1">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <div className="text-white font-bold text-base">{assembly.name}</div>
                    {assembly.is_diamond_in_rough && (
                      <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[8px] font-bold text-cyan-400 uppercase">
                        Diamond in Rough
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Shield className="w-3 h-3 text-green-500" />
                      {assembly.fire_rating}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      {assembly.interception_potential}% Interception
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${expandedId === assembly.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedId === assembly.id && (
              <div className="px-6 py-6 bg-[#0f0f0f] border-t border-[#1f1f1f]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Interception Points</h4>
                    <div className="space-y-3">
                      {assembly.components.map((comp, idx) => (
                        <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${comp.is_incumbent ? 'bg-[#111] border-[#1f1f1f]' : 'bg-cyan-500/5 border-cyan-500/20'}`}>
                          <div>
                            <div className="text-xs text-white font-medium flex items-center gap-2">
                              {comp.material}
                              {!comp.is_incumbent && <Sparkles className="w-3 h-3 text-cyan-400" />}
                            </div>
                            <div className="text-[10px] text-gray-500">{comp.manufacturer}</div>
                          </div>
                          {comp.is_incumbent && comp.interception_target && (
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-3 h-3 text-gray-600" />
                              <div className="text-[10px] font-bold text-cyan-400 uppercase">Intercept with {comp.interception_target}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#111] rounded-xl p-5 border border-[#1f1f1f]">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Agent Recommendation</h4>
                    <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#1f1f1f] mb-4">
                      <p className="text-xs text-gray-400 leading-relaxed italic">
                        "{assembly.agent_recommendation || "Agent is analyzing supply chain interception points for this assembly..."}"
                      </p>
                    </div>
                    <button className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" />
                      Execute Agent-Led Swap
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
