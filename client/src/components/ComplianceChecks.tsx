import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ComplianceCheckResult {
  id: string;
  type: "epd" | "certification" | "sustainability";
  name: string;
  status: "pass" | "warning" | "critical";
  message: string;
  expiryDate?: Date;
  daysUntilExpiry?: number;
  riskScore: number;
}

interface SupplierComplianceReport {
  supplierId: number;
  overallRiskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  checks: ComplianceCheckResult[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    warningChecks: number;
    criticalChecks: number;
  };
  recommendations: string[];
}

interface ComplianceChecksProps {
  report: SupplierComplianceReport;
  isLoading?: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pass":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    case "critical":
      return <XCircle className="w-5 h-5 text-red-600" />;
    default:
      return <AlertCircle className="w-5 h-5 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pass":
      return "bg-green-50 border-green-200";
    case "warning":
      return "bg-yellow-50 border-yellow-200";
    case "critical":
      return "bg-red-50 border-red-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case "low":
      return "bg-green-50 border-green-200 text-green-700";
    case "medium":
      return "bg-yellow-50 border-yellow-200 text-yellow-700";
    case "high":
      return "bg-orange-50 border-orange-200 text-orange-700";
    case "critical":
      return "bg-red-50 border-red-200 text-red-700";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700";
  }
};

const getRiskLevelLabel = (riskLevel: string) => {
  switch (riskLevel) {
    case "low":
      return "✓ Low Risk";
    case "medium":
      return "⚠ Medium Risk";
    case "high":
      return "⚠ High Risk";
    case "critical":
      return "✕ Critical Risk";
    default:
      return "Unknown Risk";
  }
};

export function ComplianceChecks({ report, isLoading }: ComplianceChecksProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Level Summary */}
      <Card className={`border-2 p-6 ${getRiskLevelColor(report.riskLevel)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Overall Risk Assessment</h3>
            <p className="text-sm opacity-75">
              Risk Score: {report.overallRiskScore}/100
            </p>
          </div>
          <div className="text-3xl font-bold">
            {getRiskLevelLabel(report.riskLevel)}
          </div>
        </div>
      </Card>

      {/* Compliance Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center border-green-200 bg-green-50">
          <div className="text-2xl font-bold text-green-700">
            {report.summary.passedChecks}
          </div>
          <p className="text-sm text-green-600 mt-1">Passed</p>
        </Card>
        <Card className="p-4 text-center border-yellow-200 bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-700">
            {report.summary.warningChecks}
          </div>
          <p className="text-sm text-yellow-600 mt-1">Warnings</p>
        </Card>
        <Card className="p-4 text-center border-red-200 bg-red-50">
          <div className="text-2xl font-bold text-red-700">
            {report.summary.criticalChecks}
          </div>
          <p className="text-sm text-red-600 mt-1">Critical</p>
        </Card>
        <Card className="p-4 text-center border-gray-200 bg-gray-50">
          <div className="text-2xl font-bold text-gray-700">
            {report.summary.totalChecks}
          </div>
          <p className="text-sm text-gray-600 mt-1">Total Checks</p>
        </Card>
      </div>

      {/* Compliance Checks List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Compliance Details</h3>
        <div className="space-y-3">
          {report.checks.map((check) => (
            <Card
              key={check.id}
              className={`border-l-4 p-4 ${getStatusColor(check.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{check.name}</h4>
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        {check.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{check.message}</p>
                    {check.daysUntilExpiry !== undefined && (
                      <p className="text-xs text-gray-600 mt-2">
                        {check.daysUntilExpiry >= 0
                          ? `Expires in ${check.daysUntilExpiry} days`
                          : `Expired ${Math.abs(check.daysUntilExpiry)} days ago`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Risk: {check.riskScore}%
                  </div>
                  <div className="w-16 h-2 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        check.riskScore >= 70
                          ? "bg-red-600"
                          : check.riskScore >= 40
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                      style={{ width: `${check.riskScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card className="bg-blue-50 border-blue-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">
            Recommendations
          </h3>
          <ul className="space-y-2">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {report.riskLevel === "critical" && (
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
            Request Remediation
          </button>
        )}
        {report.riskLevel === "high" && (
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">
            Request Updates
          </button>
        )}
        <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">
          Export Report
        </button>
      </div>
    </div>
  );
}
