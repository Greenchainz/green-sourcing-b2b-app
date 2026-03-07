import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Package, Search, Plus, Upload, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

const mockMaterials = [
  {
    id: 1,
    name: "EcoBoard Pro Insulation",
    category: "Insulation",
    gwp: 1.2,
    status: "verified",
    epd: "EPD-2024-001",
    leedPoints: 4,
    lastUpdated: "2026-01-15",
  },
  {
    id: 2,
    name: "GreenCrete Mix Type II",
    category: "Concrete",
    gwp: 285,
    status: "pending",
    epd: "EPD-2024-002",
    leedPoints: 2,
    lastUpdated: "2026-02-01",
  },
  {
    id: 3,
    name: "RecycledSteel Beam 50",
    category: "Structural Steel",
    gwp: 0.89,
    status: "verified",
    epd: "EPD-2024-003",
    leedPoints: 6,
    lastUpdated: "2026-02-20",
  },
];

export default function SupplierMaterials() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = mockMaterials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Materials</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product catalog and EPD documentation
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/supplier/upload">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Bulk Upload
              </Button>
            </Link>
            <Button className="flex items-center gap-2 bg-primary text-white">
              <Plus className="w-4 h-4" />
              Add Material
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Materials</p>
                <p className="text-2xl font-bold">{mockMaterials.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified EPDs</p>
                <p className="text-2xl font-bold">
                  {mockMaterials.filter((m) => m.status === "verified").length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">
                  {mockMaterials.filter((m) => m.status === "pending").length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Materials Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Material</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Category</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">GWP (kg CO₂e)</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">EPD</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">LEED Points</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((material) => (
                  <tr key={material.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{material.name}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{material.category}</td>
                    <td className="p-4 text-foreground font-mono">{material.gwp}</td>
                    <td className="p-4 text-sm text-primary">{material.epd}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-sm font-medium">{material.leedPoints}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={material.status === "verified" ? "default" : "secondary"}
                        className={material.status === "verified" ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                      >
                        {material.status === "verified" ? "Verified" : "Pending"}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{material.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
