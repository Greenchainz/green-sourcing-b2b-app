import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Eye, ShoppingCart, FileText, Award } from "lucide-react";

const stats = [
  { label: "Profile Views", value: "1,284", change: "+18%", up: true, icon: Eye },
  { label: "RFQ Requests", value: "47", change: "+12%", up: true, icon: ShoppingCart },
  { label: "Quotes Sent", value: "31", change: "-4%", up: false, icon: FileText },
  { label: "CCPS Avg Score", value: "82.4", change: "+3.1", up: true, icon: Award },
];

const topMaterials = [
  { name: "EcoBoard Pro Insulation", views: 412, rfqs: 18, conversion: "4.4%" },
  { name: "GreenCrete Mix Type II", views: 289, rfqs: 11, conversion: "3.8%" },
  { name: "RecycledSteel Beam 50", views: 583, rfqs: 18, conversion: "3.1%" },
];

const recentActivity = [
  { event: "RFQ received", detail: "Downtown Office Renovation — 500 units EcoBoard Pro", time: "2h ago" },
  { event: "Profile viewed", detail: "Architect from New York viewed your catalog", time: "4h ago" },
  { event: "EPD verified", detail: "RecycledSteel Beam 50 EPD approved by GreenChainz", time: "1d ago" },
  { event: "Quote accepted", detail: "GreenCrete Mix — $48,200 order confirmed", time: "2d ago" },
];

export default function SupplierAnalytics() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Performance insights for your GreenChainz supplier profile
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${stat.up ? "text-green-500" : "text-red-500"}`}>
                  {stat.up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.change} vs last month
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Materials */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Top Performing Materials</h2>
            <div className="space-y-4">
              {topMaterials.map((mat, i) => (
                <div key={mat.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground text-sm">{mat.name}</p>
                      <p className="text-xs text-muted-foreground">{mat.views} views · {mat.rfqs} RFQs</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {mat.conversion} CVR
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.event}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CCPS Score Breakdown */}
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">CCPS Score Breakdown</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your average Comprehensive Carbon & Performance Score across all verified materials
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { pillar: "Carbon Footprint", score: 88, max: 100 },
              { pillar: "Certifications", score: 75, max: 100 },
              { pillar: "Recyclability", score: 82, max: 100 },
              { pillar: "Local Sourcing", score: 70, max: 100 },
              { pillar: "EPD Quality", score: 91, max: 100 },
              { pillar: "Innovation", score: 68, max: 100 },
            ].map((p) => (
              <div key={p.pillar} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.pillar}</span>
                  <span className="font-semibold text-foreground">{p.score}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] rounded-full transition-all duration-500"
                    style={{ width: `${p.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
