import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, TrendingDown, Shield, FileText } from "lucide-react";

interface MaterialRecommendation {
  material: string;
  carbonReduction: number;
  complianceStatus: "pass" | "fail" | "warning";
  defensibilityScore: number;
  reason: string;
}

interface ComplianceValidation {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
}

interface AiAnalysisResult {
  materialRecommendations: MaterialRecommendation[];
  complianceValidation: ComplianceValidation;
  sustainabilityScore: number;
}

interface AiRecommendationsProps {
  analysis: AiAnalysisResult | null;
  isLoading?: boolean;
}

export function AiRecommendations({ analysis, isLoading }: AiRecommendationsProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No AI analysis available. Click "Analyze with AI" to get recommendations.</p>
      </Card>
    );
  }

  const { materialRecommendations, complianceValidation, sustainabilityScore } = analysis;

  // Determine sustainability score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sustainability Score */}
      <Card className={`p-6 border-2 ${getScoreColor(sustainabilityScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Overall Sustainability Score</h3>
            <p className="text-sm opacity-75">Based on carbon impact, compliance, and defensibility</p>
          </div>
          <div className="text-5xl font-bold">{sustainabilityScore}</div>
        </div>
        <div className="mt-4 h-3 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-500"
            style={{ width: `${sustainabilityScore}%` }}
          />
        </div>
      </Card>

      {/* Material Recommendations */}
      {materialRecommendations && materialRecommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Material Recommendations
          </h3>
          <div className="space-y-3">
            {materialRecommendations.map((rec, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{rec.material}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                  </div>
                  {getComplianceIcon(rec.complianceStatus)}
                </div>
                <div className="flex gap-4 mt-3">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {rec.carbonReduction}% Carbon Reduction
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Defensibility: {rec.defensibilityScore}/100
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Validation */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Compliance Validation
        </h3>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            {complianceValidation.isCompliant ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-600">Compliant</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-600">Non-Compliant</span>
              </>
            )}
          </div>

          {complianceValidation.violations && complianceValidation.violations.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-red-600 mb-2">Violations:</p>
              <ul className="text-sm space-y-1">
                {complianceValidation.violations.map((violation, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>{violation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {complianceValidation.warnings && complianceValidation.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-600 mb-2">Warnings:</p>
              <ul className="text-sm space-y-1">
                {complianceValidation.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {complianceValidation.isCompliant &&
            (!complianceValidation.warnings || complianceValidation.warnings.length === 0) && (
              <p className="text-sm text-muted-foreground">
                All materials meet state-specific building codes and LEED requirements.
              </p>
            )}
        </Card>
      </div>
    </div>
  );
}
