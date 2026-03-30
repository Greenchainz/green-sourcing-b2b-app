import React from 'react'
import EmbodiedCarbonChart from '@/components/EmbodiedCarbonChart'
import { Shield, Zap, TrendingDown, Leaf, Activity, Target, BarChart3, Users, Briefcase, Sparkles, Search, Database } from 'lucide-react'

// Strategic Procurement Data with Agent Intelligence & Interception Metrics
const STRATEGIC_ASSEMBLIES_DATA = [
  {
    id: 'EWS-3B-UHPC',
    name: 'EWS-3B UHPC (Diamond in Rough)',
    category: 'UHPC Panel',
    total_embodied_carbon: 17306,
    risk_score: 35,
    labor_productivity: 90,
    regulatory_compliance: true,
    fire_rating: '2-Hour',
    warranty_years: 30,
    lead_time_weeks: 10,
    cost_premium_pct: 20,
    defensibility_score: 95,
    asset_value_delta: 30,
    occupant_wellness_score: 88,
    visibility_gap: 85,
    interception_potential: 92,
    is_diamond_in_rough: true,
    agent_recommendation: "High-performance innovator with verified EPDs but low market visibility. Intercepting incumbent-led workflows with this 'Diamond in the Rough' provides 56% carbon reduction with zero engineering friction.",
    components: [
      { material: 'Interior GWB (5/8")', manufacturer: 'US Gypsum', product: 'USG Sheetrock Brand EcoSmart Panels', carbon: 232, is_incumbent: true },
      { material: 'CFMF Studs (6"-16"OC)', manufacturer: 'SCAFCO Steel Stud Company', product: 'Steel Framing stud and track', carbon: 1958, is_incumbent: true },
      { material: 'Mega Panel (HSS)', manufacturer: 'AISC fabricator', product: 'HSS', carbon: 3697, is_incumbent: true },
      { material: 'Unitized framing', manufacturer: 'Kawneer / YKK AP / EFCO', product: '1600 Wall System', carbon: 11071, is_incumbent: true },
      { material: 'UHPC Panel 2"', manufacturer: 'Ductal', product: 'Ductal Full Premix NaW3FO', carbon: 1384, is_incumbent: false, interception_target: 'Precast Concrete' },
    ],
  },
  {
    id: 'EWS-1A-Vision',
    name: 'EWS-1A Unitized Vision',
    category: 'Unitized Vision',
    total_embodied_carbon: 20597,
    risk_score: 45,
    labor_productivity: 85,
    regulatory_compliance: true,
    fire_rating: '1-Hour',
    warranty_years: 10,
    lead_time_weeks: 12,
    cost_premium_pct: 0,
    defensibility_score: 88,
    asset_value_delta: 12,
    occupant_wellness_score: 92,
    visibility_gap: 20,
    interception_potential: 45,
    is_diamond_in_rough: false,
    agent_recommendation: "Standard industry baseline. High visibility but moderate carbon footprint. Interception potential is limited due to entrenched incumbent distribution.",
    components: [
      { material: 'Unitized framing', manufacturer: 'Kawneer North America', product: '1600 Wall System', carbon: 15422, is_incumbent: true },
      { material: 'Vision IGU', manufacturer: 'Vitro / Guardian / AGC', product: 'Solarban® low-e IGU (Vitro)', carbon: 5175, is_incumbent: true },
    ],
  },
  {
    id: 'EWS-3C-GFRC',
    name: 'EWS-3C GFRC (Bio-Revolution)',
    category: 'GFRC Panel',
    total_embodied_carbon: 22128,
    risk_score: 48,
    labor_productivity: 88,
    regulatory_compliance: true,
    fire_rating: '2-Hour',
    warranty_years: 20,
    lead_time_weeks: 12,
    cost_premium_pct: 25,
    defensibility_score: 88,
    asset_value_delta: 22,
    occupant_wellness_score: 85,
    visibility_gap: 65,
    interception_potential: 78,
    is_diamond_in_rough: true,
    agent_recommendation: "Bio-composite innovator. Intercepting searches for traditional precast with this 'Zero-Training Transition' option. Selling 'Speed' and 'No VOCs' over just 'Sustainability'.",
    components: [
      { material: 'Interior GWB (5/8")', manufacturer: 'US Gypsum', product: 'USG Sheetrock Brand EcoSmart Panels', carbon: 232, is_incumbent: true },
      { material: 'CFMF Studs (6"-16"OC)', manufacturer: 'SCAFCO Steel Stud Company', product: 'Steel Framing stud and track', carbon: 1958, is_incumbent: true },
      { material: 'GFRC Panel', manufacturer: 'FIBROBETON', product: 'GFRC cladding', carbon: 3796, is_incumbent: false, interception_target: 'Precast' },
    ],
  },
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
              Agent-Led Interception v3.0
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Sustainable Supply Chain Interception</h1>
          <p className="text-gray-400 text-lg max-w-3xl">
            Unlocking the <strong>'Diamonds in the Rough'</strong> of the sustainable material ecosystem.
            Our AI agents move beyond a directory to become the <strong>Global Trust Layer</strong>,
            intercepting incumbent-led workflows with technically ready but invisible innovators.
          </p>
        </div>

        {/* Strategic KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Search className="w-12 h-12 text-cyan-400" />
            </div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Visibility Gap</h3>
            <div className="text-3xl font-bold text-cyan-400">85%</div>
            <p className="text-gray-600 text-xs mt-1">Innovators silenced by incumbents</p>
          </div>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-12 h-12 text-purple-400" />
            </div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Interception Rate</h3>
            <div className="text-3xl font-bold text-purple-400">92%</div>
            <p className="text-gray-600 text-xs mt-1">Successful agent-led swaps</p>
          </div>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Database className="w-12 h-12 text-green-400" />
            </div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Trust Layer</h3>
            <div className="text-3xl font-bold text-green-400">100%</div>
            <p className="text-gray-600 text-xs mt-1">ASTM & UL verified data</p>
          </div>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Carbon Core</h3>
            <div className="text-3xl font-bold text-blue-400">56%</div>
            <p className="text-gray-600 text-xs mt-1">Max reduction potential</p>
          </div>
        </div>

        {/* The Agent-Led Chart */}
        <EmbodiedCarbonChart data={STRATEGIC_ASSEMBLIES_DATA} />

        {/* Strategic Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-cyan-400" />
                Agent-Led Procurement Strategy
              </h3>
              <div className="prose prose-invert max-w-none text-gray-400 text-sm leading-relaxed">
                <p className="mb-6">
                  The global construction market is in <strong>Seismic Bifurcation</strong>. Entrenched incumbents control distribution via legacy inertia, while a fragmented ecosystem of innovators holds the technical solutions. GreenChainz is the <strong>Digital Interceptor</strong> that bridges this gap.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#1f1f1f]">
                    <h4 className="text-white font-bold mb-2 text-sm flex items-center gap-2">
                      <Search className="w-4 h-4 text-cyan-400" />
                      Survival through Visibility
                    </h4>
                    <p className="text-xs">In the era of Carbon Accounting, invisibility equals non-existence. If a product isn't in the digital GWP calculator, it is not specified.</p>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#1f1f1f]">
                    <h4 className="text-white font-bold mb-2 text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      Zero-Training Transition
                    </h4>
                    <p className="text-xs">Agents prioritize drop-in replacements that are chemically identical to incumbents, removing the engineering friction of sustainable swaps.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-6">
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Global Trust Layer
              </h4>
              <p className="text-xs text-gray-400 mb-6">
                Our agents validate innovators against the "Sword of Damocles"—the 8% of global CO2 from concrete and cement—to ensure every swap is technically defensible.
              </p>
              <div className="p-3 bg-[#0a0a0a]/60 rounded-lg border border-white/5 mb-4">
                <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1">Top Interceptor</div>
                <div className="text-sm text-white font-bold">EWS-3B UHPC Panel</div>
                <div className="text-xs text-gray-500 mt-1">92% Interception Potential</div>
              </div>
              <button className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-all text-sm">
                Execute Agent-Led Swap
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
