"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  MessageSquare,
  DollarSign,
  Clock,
  MapPin,
  Loader2,
  CheckCircle,
  Send,
  ChevronRight,
} from "lucide-react";

interface RFQ {
  id: string;
  project_name: string;
  buyer_name: string;
  product_name?: string;
  material_name?: string;
  quantity: number;
  unit: string;
  status: "pending" | "quoted" | "accepted" | "declined" | "expired";
  received_at: string;
  deadline?: string;
  message?: string;
  location?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 border-blue-200",
  quoted: "bg-amber-100 text-amber-700 border-amber-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  declined: "bg-slate-100 text-slate-700 border-slate-200",
  expired: "bg-red-100 text-red-700 border-red-200",
};

const MOCK_RFQS: RFQ[] = [
  {
    id: "101",
    project_name: "Skyline Office Tower",
    buyer_name: "Studio Alpha Architects",
    material_name: "Eco-Batt Insulation",
    quantity: 5000,
    unit: "sqm",
    status: "pending",
    received_at: "2026-01-15T10:00:00Z",
    deadline: "2026-02-15",
    message: "We are looking for LEED Gold compatible insulation for a new office building project.",
    location: "Austin, TX",
  },
  {
    id: "102",
    project_name: "Residential Complex B",
    buyer_name: "BuildRight Construction",
    material_name: "Bamboo Flooring",
    quantity: 1200,
    unit: "sqm",
    status: "quoted",
    received_at: "2026-01-14T14:30:00Z",
    deadline: "2026-02-01",
    message: "Please provide pricing for bulk order of sustainable bamboo flooring.",
    location: "Dallas, TX",
  },
  {
    id: "103",
    project_name: "Green Valley School",
    buyer_name: "Perkins+Will",
    material_name: "Recycled Steel Beams",
    quantity: 50,
    unit: "tons",
    status: "accepted",
    received_at: "2026-01-10T09:00:00Z",
    deadline: "2026-03-01",
    message: "Need structural steel with high recycled content for educational facility.",
    location: "Round Rock, TX",
  },
];

export default function SupplierRFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);

  useEffect(() => {
    const fetchRfqs = async () => {
      try {
        const res = await fetch("/api/supplier/rfqs");
        if (!res.ok) throw new Error("Failed to load RFQs");
        const data = await res.json();
        // Use API data if available, otherwise use mock data
        setRfqs(data.length > 0 ? data : MOCK_RFQS);
      } catch (err) {
        console.error(err);
        // Use mock data on error for demo purposes
        setRfqs(MOCK_RFQS);
      } finally {
        setLoading(false);
      }
    };
    fetchRfqs();
  }, []);

  const filteredRfqs = rfqs.filter((rfq) => {
    const matchesFilter = filter === "all" || rfq.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      rfq.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.material_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = rfqs.filter((r) => r.status === "pending").length;
  const quotedCount = rfqs.filter((r) => r.status === "quoted").length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">RFQ Responses</h1>
        <p className="text-slate-600">
          Manage incoming requests and send quotes to potential buyers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{quotedCount}</p>
              <p className="text-sm text-slate-500">Quoted</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {rfqs.filter((r) => r.status === "accepted").length}
              </p>
              <p className="text-sm text-slate-500">Won</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Clock className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{rfqs.length}</p>
              <p className="text-sm text-slate-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project, buyer, or material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            {["all", "pending", "quoted", "accepted"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === status
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* RFQ List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredRfqs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No RFQs found
              </h3>
              <p className="text-slate-500">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your search or filters."
                  : "You haven't received any RFQs yet."}
              </p>
            </div>
          ) : (
            filteredRfqs.map((rfq) => (
              <div
                key={rfq.id}
                onClick={() => setSelectedRfq(rfq)}
                className={`bg-white rounded-xl border shadow-sm p-6 cursor-pointer transition-all ${
                  selectedRfq?.id === rfq.id
                    ? "border-forest-500 ring-2 ring-forest-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {rfq.project_name}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_STYLES[rfq.status]
                        }`}
                      >
                        {rfq.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm">{rfq.buyer_name}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      Material
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {rfq.material_name || rfq.product_name || "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      Quantity
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {rfq.quantity} {rfq.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-slate-500">
                    {rfq.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {rfq.location}
                      </span>
                    )}
                    {rfq.deadline && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="h-4 w-4" />
                        Due {new Date(rfq.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400">
                    {new Date(rfq.received_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedRfq ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-6">
              <div className="mb-6">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    STATUS_STYLES[selectedRfq.status]
                  }`}
                >
                  {selectedRfq.status.toUpperCase()}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-3">
                  {selectedRfq.project_name}
                </h2>
                <p className="text-slate-500">{selectedRfq.buyer_name}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                    Material Requested
                  </p>
                  <p className="text-slate-900 font-medium">
                    {selectedRfq.material_name || selectedRfq.product_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                    Quantity
                  </p>
                  <p className="text-slate-900 font-medium">
                    {selectedRfq.quantity} {selectedRfq.unit}
                  </p>
                </div>
                {selectedRfq.location && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      Location
                    </p>
                    <p className="text-slate-900 font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedRfq.location}
                    </p>
                  </div>
                )}
                {selectedRfq.deadline && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      Deadline
                    </p>
                    <p className="text-amber-600 font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(selectedRfq.deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedRfq.message && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      Message
                    </p>
                    <p className="text-slate-600 text-sm bg-slate-50 rounded-lg p-3">
                      {selectedRfq.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-lg font-medium transition-colors">
                  <Send className="h-4 w-4" />
                  Send Quote
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Select an RFQ to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
