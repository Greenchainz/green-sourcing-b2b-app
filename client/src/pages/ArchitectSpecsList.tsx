import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, File, Calendar, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ArchitectSpecsList() {
  const [, navigate] = useLocation();
  const listSpecsQuery = trpc.architectSpec.listSpecs.useQuery();

  if (listSpecsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col">
        <Header />
        <div className="max-w-4xl mx-auto space-y-4 flex-1 w-full mt-8">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const specs = listSpecsQuery.data || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="max-w-4xl mx-auto space-y-8 flex-1 w-full py-12 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Embodied Carbon Specs</h1>
            <p className="text-gray-600 mt-2">Upload and analyze your project's material carbon footprint</p>
          </div>
          <Button
            onClick={() => navigate("/architect/specs/upload")}
            className="bg-green-600 hover:bg-green-700 gap-2 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            New Spec
          </Button>
        </div>

        {/* Specs List */}
        {specs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center flex flex-col items-center">
              <File className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No specs yet</h3>
              <p className="text-gray-600 mb-6 max-w-sm">
                Start by uploading your Embodied Carbon Table to find sustainable alternatives.
              </p>
              <Button
                onClick={() => navigate("/architect/specs/upload")}
                className="bg-green-600 hover:bg-green-700 min-h-[44px]"
              >
                Upload Your First Spec
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specs.map((spec) => (
              <Card
                key={spec.id}
                className="hover:shadow-lg transition cursor-pointer flex flex-col"
                onClick={() => navigate(`/architect/specs/${spec.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg truncate">{spec.originalFilename}</CardTitle>
                      <CardDescription>
                        {spec.projectName && `${spec.projectName}`}
                        {spec.projectName && spec.projectLocation && " • "}
                        {spec.projectLocation && `${spec.projectLocation}`}
                      </CardDescription>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {spec.parseStatus === "ready" && (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready
                        </Badge>
                      )}
                      {spec.parseStatus === "processing" && (
                        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Processing
                        </Badge>
                      )}
                      {spec.parseStatus === "failed" && (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                      {spec.parseStatus === "pending" && (
                        <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex items-center justify-between border-t pt-4 mt-2 border-gray-100">
                    <div className="flex items-center gap-4">
                      {spec.estimatedValue && (
                        <div>
                          <p className="text-xs font-medium text-gray-600">Material Value</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ${spec.estimatedValue.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {spec.createdAt ? new Date(spec.createdAt).toLocaleDateString() : "Unknown"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/architect/specs/${spec.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
