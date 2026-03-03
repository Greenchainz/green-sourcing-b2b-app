"use client";

import { useState } from "react";
import { Search, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Download } from "lucide-react";

// Mock data for development - replace with actual API calls
const mockMaterials = [
  { id: 1, name: "Traditional Portland Cement Concrete", category: "Concrete", gwp: 420 },
  { id: 2, name: "Fly Ash Concrete (30% replacement)", category: "Concrete", gwp: 294 },
  { id: 3, name: "Standard Asphalt Shingles", category: "Roofing", gwp: 180 },
  { id: 4, name: "Metal Roofing (Recycled Content)", category: "Roofing", gwp: 95 },
];

const mockValidations = [
  {
    id: 1,
    date: "2026-02-15",
    incumbentName: "Traditional Portland Cement Concrete",
    sustainableName: "Fly Ash Concrete (30% replacement)",
    status: "APPROVED",
    score: 95,
    carbonSavings: 30,
    costDelta: -2.5,
    checks: {
      astmMatch: true,
      fireRating: true,
      compressiveStrength: true,
      rValue: true,
      stcRating: true,
      ulListing: true,
      laborUnits: true,
      warranty: true,
    },
  },
  {
    id: 2,
    date: "2026-02-14",
    incumbentName: "Standard Asphalt Shingles",
    sustainableName: "Metal Roofing (Recycled Content)",
    status: "EXPERIMENTAL",
    score: 78,
    carbonSavings: 47,
    costDelta: 15.2,
    checks: {
      astmMatch: true,
      fireRating: true,
      compressiveStrength: null,
      rValue: false,
      stcRating: true,
      ulListing: true,
      laborUnits: false,
      warranty: true,
    },
  },
];

type ValidationStatus = "APPROVED" | "EXPERIMENTAL" | "REJECTED";

const statusConfig: Record<ValidationStatus, { color: string; icon: React.ReactNode; bgColor: string }> = {
  APPROVED: {
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  EXPERIMENTAL: {
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  REJECTED: {
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function SwapValidationDashboard() {
  const [incumbentSearch, setIncumbentSearch] = useState("");
  const [sustainableSearch, setSustainableSearch] = useState("");
  const [selectedIncumbent, setSelectedIncumbent] = useState<number | null>(null);
  const [selectedSustainable, setSelectedSustainable] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ValidationStatus | "ALL">("ALL");

  const handleRunValidation = async () => {
    if (!selectedIncumbent || !selectedSustainable) {
      alert("Please select both incumbent and sustainable materials");
      return;
    }

    setIsValidating(true);
    // TODO: Call /api/swap-validation API
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsValidating(false);
    alert("Validation complete! Check the results table below.");
  };

  const filteredValidations = mockValidations.filter(
    (v) => filterStatus === "ALL" || v.status === filterStatus
  );

  const exportToCSV = () => {
    const headers = ["Date", "Incumbent", "Sustainable", "Status", "Score", "Carbon Savings %", "Cost Delta %"];
    const rows = filteredValidations.map((v) => [
      v.date,
      v.incumbentName,
      v.sustainableName,
      v.status,
      v.score,
      v.carbonSavings,
      v.costDelta,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swap-validations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Swap Validation Engine</h1>
          <p className="text-gray-600">
            Validate material substitutions with comprehensive showstopper checks (ASTM, fire rating, strength, R-value, STC, UL listing)
          </p>
        </div>

        {/* Material Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Select Materials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incumbent Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Incumbent Material</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={incumbentSearch}
                  onChange={(e) => setIncumbentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {mockMaterials
                  .filter((m) => m.name.toLowerCase().includes(incumbentSearch.toLowerCase()))
                  .map((material) => (
                    <div
                      key={material.id}
                      onClick={() => setSelectedIncumbent(material.id)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedIncumbent === material.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900">{material.name}</div>
                      <div className="text-sm text-gray-500">
                        {material.category} • {material.gwp} kgCO2e/1000SF
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Sustainable Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sustainable Material</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={sustainableSearch}
                  onChange={(e) => setSustainableSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {mockMaterials
                  .filter((m) => m.name.toLowerCase().includes(sustainableSearch.toLowerCase()))
                  .map((material) => (
                    <div
                      key={material.id}
                      onClick={() => setSelectedSustainable(material.id)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedSustainable === material.id ? "bg-green-50 border-l-4 border-green-500" : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900">{material.name}</div>
                      <div className="text-sm text-gray-500">
                        {material.category} • {material.gwp} kgCO2e/1000SF
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleRunValidation}
            disabled={!selectedIncumbent || !selectedSustainable || isValidating}
            className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? "Running Validation..." : "Run Validation"}
          </button>
        </div>

        {/* Validation Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Validation History</h2>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 mb-4">
            {(["ALL", "APPROVED", "EXPERIMENTAL", "REJECTED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Incumbent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sustainable</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Carbon Savings</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cost Delta</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredValidations.map((validation) => (
                  <>
                    <tr key={validation.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{validation.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{validation.incumbentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{validation.sustainableName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            statusConfig[validation.status].color
                          } ${statusConfig[validation.status].bgColor}`}
                        >
                          {statusConfig[validation.status].icon}
                          {validation.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{validation.score}/100</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">-{validation.carbonSavings}%</td>
                      <td className={`px-4 py-3 text-sm font-medium ${validation.costDelta > 0 ? "text-red-600" : "text-green-600"}`}>
                        {validation.costDelta > 0 ? "+" : ""}{validation.costDelta}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedRow(expandedRow === validation.id ? null : validation.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                          >
                            {expandedRow === validation.id ? (
                              <>
                                <ChevronUp className="w-4 h-4" /> Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" /> Show
                              </>
                            )}
                          </button>
                          <a
                            href={`/api/swap-validation/${validation.id}/export-csi-form`}
                            download
                            className="text-sm px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 inline-flex items-center gap-1"
                            title="Export CSI Form 13.1A"
                          >
                            <Download className="w-4 h-4" />
                            CSI Form
                          </a>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === validation.id && (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(validation.checks).map(([check, passed]) => (
                              <div key={check} className="flex items-center gap-2">
                                {passed === true ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : passed === false ? (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                ) : (
                                  <div className="w-5 h-5 bg-gray-300 rounded-full" />
                                )}
                                <span className="text-sm text-gray-700 capitalize">
                                  {check.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
