"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Leaf,
  Clock,
  CheckCircle2,
  TrendingUp,
  Award,
  Search,
  SlidersHorizontal,
  BarChart3,
  ExternalLink,
} from "lucide-react";

type SupplierTier = "free" | "standard" | "premium";
type SortOption = "rating" | "carbonScore" | "responseTime" | "ordersCompleted" | "priceCompetitiveness";

interface Supplier {
  id: string;
  name: string;
  tier: SupplierTier;
  verified: boolean;
  rating: number;
  reviewCount: number;
  carbonScore: number; // 0-100, higher is better
  responseTime: string;
  avgResponseHours: number;
  ordersCompleted: number;
  onTimeDelivery: number; // percentage
  priceCompetitiveness: number; // 0-100, higher means more competitive
  categories: string[];
  certifications: string[];
  location: string;
  description: string;
}

// Mock supplier data
const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    name: "EcoSteel Corp",
    tier: "premium",
    verified: true,
    rating: 4.9,
    reviewCount: 156,
    carbonScore: 92,
    responseTime: "< 12h",
    avgResponseHours: 8,
    ordersCompleted: 234,
    onTimeDelivery: 98,
    priceCompetitiveness: 85,
    categories: ["Steel", "Metal Framing", "Rebar"],
    certifications: ["EPD Certified", "ISO 14001", "LEED Contributor"],
    location: "Pittsburgh, PA",
    description: "Leading supplier of recycled steel products with industry-best carbon footprint.",
  },
  {
    id: "sup-2",
    name: "GreenCement Ltd",
    tier: "premium",
    verified: true,
    rating: 4.8,
    reviewCount: 128,
    carbonScore: 95,
    responseTime: "< 24h",
    avgResponseHours: 16,
    ordersCompleted: 189,
    onTimeDelivery: 96,
    priceCompetitiveness: 78,
    categories: ["Concrete", "Cement", "Aggregates"],
    certifications: ["EPD Certified", "Carbon Neutral", "LEED Platinum"],
    location: "Denver, CO",
    description: "Pioneering low-carbon concrete solutions for sustainable construction.",
  },
  {
    id: "sup-3",
    name: "SolarTech Inc",
    tier: "standard",
    verified: true,
    rating: 4.7,
    reviewCount: 89,
    carbonScore: 88,
    responseTime: "24-48h",
    avgResponseHours: 32,
    ordersCompleted: 124,
    onTimeDelivery: 94,
    priceCompetitiveness: 82,
    categories: ["Solar Panels", "Energy Systems", "Inverters"],
    certifications: ["EPD Certified", "Energy Star Partner"],
    location: "Phoenix, AZ",
    description: "High-efficiency solar solutions for commercial and industrial projects.",
  },
  {
    id: "sup-4",
    name: "EcoInsulation Pro",
    tier: "standard",
    verified: true,
    rating: 4.6,
    reviewCount: 67,
    carbonScore: 90,
    responseTime: "24-48h",
    avgResponseHours: 28,
    ordersCompleted: 98,
    onTimeDelivery: 92,
    priceCompetitiveness: 88,
    categories: ["Insulation", "Thermal Systems", "Soundproofing"],
    certifications: ["GreenGuard Gold", "USDA BioPreferred"],
    location: "Portland, OR",
    description: "Sustainable insulation materials from recycled and renewable sources.",
  },
  {
    id: "sup-5",
    name: "BuildGreen Supplies",
    tier: "premium",
    verified: true,
    rating: 4.8,
    reviewCount: 203,
    carbonScore: 86,
    responseTime: "< 24h",
    avgResponseHours: 18,
    ordersCompleted: 312,
    onTimeDelivery: 97,
    priceCompetitiveness: 75,
    categories: ["Lumber", "Timber", "Wood Products"],
    certifications: ["FSC Certified", "PEFC", "SFI"],
    location: "Seattle, WA",
    description: "Premium sustainably-sourced timber and wood products.",
  },
  {
    id: "sup-6",
    name: "RecycleGlass Co",
    tier: "standard",
    verified: true,
    rating: 4.5,
    reviewCount: 45,
    carbonScore: 94,
    responseTime: "24-48h",
    avgResponseHours: 36,
    ordersCompleted: 67,
    onTimeDelivery: 91,
    priceCompetitiveness: 80,
    categories: ["Glass", "Windows", "Glazing"],
    certifications: ["EPD Certified", "Cradle to Cradle"],
    location: "Chicago, IL",
    description: "Recycled glass products for modern sustainable architecture.",
  },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "rating", label: "Highest Rated" },
  { value: "carbonScore", label: "Best Eco Score" },
  { value: "responseTime", label: "Fastest Response" },
  { value: "ordersCompleted", label: "Most Experienced" },
  { value: "priceCompetitiveness", label: "Best Value" },
];

export default function SupplierComparisonPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [tierFilter, setTierFilter] = useState<SupplierTier | "all">("all");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const filteredSuppliers = useMemo(() => {
    let result = MOCK_SUPPLIERS;

    // Apply tier filter
    if (tierFilter !== "all") {
      result = result.filter((s) => s.tier === tierFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.categories.some((c) => c.toLowerCase().includes(query)) ||
          s.location.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return result.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "carbonScore":
          return b.carbonScore - a.carbonScore;
        case "responseTime":
          return a.avgResponseHours - b.avgResponseHours;
        case "ordersCompleted":
          return b.ordersCompleted - a.ordersCompleted;
        case "priceCompetitiveness":
          return b.priceCompetitiveness - a.priceCompetitiveness;
        default:
          return 0;
      }
    });
  }, [searchQuery, sortBy, tierFilter]);

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : prev.length < 3
          ? [...prev, supplierId]
          : prev
    );
  };

  const selectedSuppliersData = useMemo(
    () => MOCK_SUPPLIERS.filter((s) => selectedSuppliers.includes(s.id)),
    [selectedSuppliers]
  );

  const getTierBadge = (tier: SupplierTier) => {
    const config = {
      premium: "bg-purple-100 text-purple-700",
      standard: "bg-blue-100 text-blue-700",
      free: "bg-slate-100 text-slate-600",
    };
    return config[tier];
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-amber-600";
    return "text-slate-600";
  };

  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/buyer"
            className="inline-flex items-center text-slate-500 hover:text-emerald-600 mb-4 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-emerald-600" />
                Supplier Comparison
              </h1>
              <p className="text-slate-500 mt-1">
                Compare and evaluate suppliers based on sustainability, reliability, and value.
              </p>
            </div>
            {selectedSuppliers.length >= 2 && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="gc-btn gc-btn-primary"
              >
                Compare Selected ({selectedSuppliers.length})
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="gc-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search suppliers, categories, or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="gc-input pl-10"
                />
              </div>
            </div>

            {/* Tier Filter */}
            <div className="flex gap-2">
              {(["all", "premium", "standard"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tierFilter === tier
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50"
                  }`}
                >
                  {tier === "all" ? "All Tiers" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="gc-select py-2 px-3 text-sm"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSuppliers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Selected for comparison:</span>
                {selectedSuppliersData.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1"
                  >
                    {s.name}
                    <button
                      onClick={() => toggleSupplierSelection(s.id)}
                      className="ml-1 hover:text-emerald-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedSuppliers.length < 3 && (
                  <span className="text-slate-400 text-xs">
                    (Select up to {3 - selectedSuppliers.length} more)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Supplier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`gc-card p-5 transition-all ${
                selectedSuppliers.includes(supplier.id)
                  ? "ring-2 ring-emerald-500 shadow-lg"
                  : "hover:shadow-lg"
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {supplier.name}
                    {supplier.verified && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${getTierBadge(supplier.tier)}`}
                    >
                      {supplier.tier}
                    </span>
                    <span className="text-xs text-slate-500">{supplier.location}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleSupplierSelection(supplier.id)}
                  role="checkbox"
                  aria-checked={selectedSuppliers.includes(supplier.id)}
                  aria-label={`Select ${supplier.name} for comparison`}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedSuppliers.includes(supplier.id)
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-300 hover:border-emerald-500"
                  }`}
                >
                  {selectedSuppliers.includes(supplier.id) && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {supplier.description}
              </p>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Star className="w-3 h-3" /> Rating
                  </div>
                  <div className="font-bold text-slate-800">
                    {supplier.rating} <span className="text-xs font-normal text-slate-500">({supplier.reviewCount})</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Leaf className="w-3 h-3" /> Eco Score
                  </div>
                  <div className={`font-bold ${getScoreColor(supplier.carbonScore)}`}>
                    {supplier.carbonScore}/100
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <Clock className="w-3 h-3" /> Response
                  </div>
                  <div className="font-bold text-slate-800">{supplier.responseTime}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <TrendingUp className="w-3 h-3" /> On-Time
                  </div>
                  <div className="font-bold text-slate-800">{supplier.onTimeDelivery}%</div>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1 mb-4">
                {supplier.categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Certifications */}
              <div className="flex flex-wrap gap-1 mb-4">
                {supplier.certifications.slice(0, 2).map((cert) => (
                  <span
                    key={cert}
                    className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded flex items-center gap-1"
                  >
                    <Award className="w-3 h-3" /> {cert}
                  </span>
                ))}
                {supplier.certifications.length > 2 && (
                  <span className="text-xs text-slate-500">
                    +{supplier.certifications.length - 2} more
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Link
                  href={`/supplier/${supplier.id}`}
                  className="gc-btn gc-btn-secondary flex-1 text-sm justify-center"
                >
                  View Profile <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
                <Link
                  href={`/dashboard/buyer/rfqs/new?supplier=${supplier.id}`}
                  className="gc-btn gc-btn-primary flex-1 text-sm justify-center"
                >
                  Request Quote
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="gc-card p-12 text-center">
            <div className="text-slate-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No suppliers found</h3>
            <p className="text-slate-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Comparison Modal */}
        {showCompareModal && selectedSuppliersData.length >= 2 && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompareModal(false)}
          >
            <div
              className="gc-card p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Supplier Comparison
                </h2>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="p-4 font-bold text-slate-500 text-sm">Criteria</th>
                      {selectedSuppliersData.map((s) => (
                        <th key={s.id} className="p-4 font-bold text-slate-800">
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Tier</td>
                      {selectedSuppliersData.map((s) => (
                        <td key={s.id} className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getTierBadge(s.tier)}`}>
                            {s.tier}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Rating</td>
                      {selectedSuppliersData.map((s) => {
                        const best = Math.max(...selectedSuppliersData.map((x) => x.rating));
                        return (
                          <td key={s.id} className="p-4">
                            <span className={`inline-flex items-center gap-1 ${s.rating === best ? "text-emerald-600 font-bold" : ""}`}>
                              <Star className="w-4 h-4 fill-current" /> {s.rating} ({s.reviewCount} reviews)
                            </span>
                            {s.rating === best && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Best
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Eco Score</td>
                      {selectedSuppliersData.map((s) => {
                        const best = Math.max(...selectedSuppliersData.map((x) => x.carbonScore));
                        return (
                          <td key={s.id} className="p-4">
                            <span className={`inline-flex items-center gap-1 ${s.carbonScore === best ? "text-emerald-600 font-bold" : ""}`}>
                              <Leaf className="w-4 h-4" /> {s.carbonScore}/100
                            </span>
                            {s.carbonScore === best && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Best
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Response Time</td>
                      {selectedSuppliersData.map((s) => {
                        const best = Math.min(...selectedSuppliersData.map((x) => x.avgResponseHours));
                        return (
                          <td key={s.id} className="p-4">
                            <span className={s.avgResponseHours === best ? "text-emerald-600 font-bold" : ""}>
                              {s.responseTime}
                            </span>
                            {s.avgResponseHours === best && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Fastest
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">On-Time Delivery</td>
                      {selectedSuppliersData.map((s) => {
                        const best = Math.max(...selectedSuppliersData.map((x) => x.onTimeDelivery));
                        return (
                          <td key={s.id} className="p-4">
                            <span className={s.onTimeDelivery === best ? "text-emerald-600 font-bold" : ""}>
                              {s.onTimeDelivery}%
                            </span>
                            {s.onTimeDelivery === best && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Best
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Orders Completed</td>
                      {selectedSuppliersData.map((s) => {
                        const best = Math.max(...selectedSuppliersData.map((x) => x.ordersCompleted));
                        return (
                          <td key={s.id} className="p-4">
                            <span className={s.ordersCompleted === best ? "text-emerald-600 font-bold" : ""}>
                              {s.ordersCompleted}
                            </span>
                            {s.ordersCompleted === best && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Most
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Price Competitiveness</td>
                      {selectedSuppliersData.map((s) => {
                        const best = Math.max(...selectedSuppliersData.map((x) => x.priceCompetitiveness));
                        return (
                          <td key={s.id} className="p-4">
                            <span className={s.priceCompetitiveness === best ? "text-emerald-600 font-bold" : ""}>
                              {s.priceCompetitiveness}/100
                            </span>
                            {s.priceCompetitiveness === best && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Best Value
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-4 font-semibold text-slate-700">Certifications</td>
                      {selectedSuppliersData.map((s) => (
                        <td key={s.id} className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {s.certifications.map((cert) => (
                              <span
                                key={cert}
                                className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4"></td>
                      {selectedSuppliersData.map((s) => (
                        <td key={s.id} className="p-4">
                          <Link
                            href={`/dashboard/buyer/rfqs/new?supplier=${s.id}`}
                            className="gc-btn gc-btn-primary w-full justify-center text-sm"
                          >
                            Request Quote
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
