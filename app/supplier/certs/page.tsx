"use client";

import { useState, useEffect } from "react";
import {
  Award,
  Upload,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Plus,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";

interface Certification {
  id: string;
  name: string;
  type: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  status: "verified" | "pending" | "expired";
  document_url?: string;
}

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const MOCK_CERTIFICATIONS: Certification[] = [
  {
    id: "1",
    name: "ISO 14001:2015",
    type: "Environmental Management",
    issuer: "Bureau Veritas",
    issue_date: "2024-03-15",
    expiry_date: "2027-03-15",
    status: "verified",
    document_url: "#",
  },
  {
    id: "2",
    name: "LEED Certified",
    type: "Green Building",
    issuer: "USGBC",
    issue_date: "2024-01-10",
    expiry_date: "2026-01-10",
    status: "verified",
    document_url: "#",
  },
  {
    id: "3",
    name: "FSC Chain of Custody",
    type: "Sustainable Forestry",
    issuer: "Forest Stewardship Council",
    issue_date: "2025-06-20",
    expiry_date: "2025-06-20",
    status: "pending",
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  verified: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  pending: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
  expired: { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle },
};

export default function SupplierCertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    // Mock fetch - replace with real API
    setTimeout(() => {
      setCertifications(MOCK_CERTIFICATIONS);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
      </div>
    );
  }

  const verifiedCount = certifications.filter((c) => c.status === "verified").length;
  const pendingCount = certifications.filter((c) => c.status === "pending").length;
  const expiringCount = certifications.filter((c) => {
    const daysUntilExpiry = getDaysUntilExpiry(c.expiry_date);
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  }).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Certifications</h1>
          <p className="text-slate-600">
            Manage and showcase your sustainability certifications.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Certification
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{verifiedCount}</p>
              <p className="text-sm text-slate-500">Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-sm text-slate-500">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{expiringCount}</p>
              <p className="text-sm text-slate-500">Expiring Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications List */}
      {certifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No certifications yet
          </h3>
          <p className="text-slate-500 mb-6">
            Add your sustainability certifications to build trust with buyers.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Certification
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {certifications.map((cert) => {
            const statusConfig = STATUS_STYLES[cert.status];
            const StatusIcon = statusConfig.icon;
            const daysUntilExpiry = getDaysUntilExpiry(cert.expiry_date);

            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-forest-50 rounded-lg">
                      <Award className="h-6 w-6 text-forest-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg text-slate-900">
                          {cert.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{cert.type}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-slate-400" />
                          Issued by: {cert.issuer}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                        </span>
                        {daysUntilExpiry <= 90 && daysUntilExpiry > 0 && (
                          <span className="text-orange-600 font-medium">
                            ⚠️ Expires in {daysUntilExpiry} days
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {cert.document_url && (
                      <a
                        href={cert.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Document
                      </a>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors text-sm font-medium">
                      <Upload className="h-4 w-4" />
                      Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommended Certifications */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">
          Recommended Certifications
        </h3>
        <p className="text-sm text-blue-700 mb-4">
          Based on your product catalog, these certifications could help you reach
          more buyers:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Cradle to Cradle",
              desc: "Product design for circular economy",
            },
            { name: "EPD (Type III)", desc: "Environmental Product Declaration" },
            { name: "B Corp", desc: "Social and environmental performance" },
          ].map((rec) => (
            <div
              key={rec.name}
              className="bg-white rounded-lg p-4 border border-blue-200"
            >
              <p className="font-medium text-slate-900">{rec.name}</p>
              <p className="text-sm text-slate-500">{rec.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Add Certification
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Certification Name *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none"
                  placeholder="e.g., ISO 14001:2015"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Certification Type *
                </label>
                <select className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none bg-white">
                  <option value="">Select type</option>
                  <option value="environmental">Environmental Management</option>
                  <option value="green_building">Green Building</option>
                  <option value="sustainability">Sustainability</option>
                  <option value="forestry">Sustainable Forestry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none"
                  placeholder="e.g., Bureau Veritas"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-forest-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Document
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-forest-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">
                    Drag and drop or{" "}
                    <span className="text-forest-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    PDF, PNG, or JPG up to 10MB
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add Certification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
