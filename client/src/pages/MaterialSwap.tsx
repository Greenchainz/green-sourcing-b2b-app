import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";

export default function MaterialSwap() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [comparisonMaterialId, setComparisonMaterialId] = useState<number | null>(null);

  // Search materials
  const { data: searchResults, isLoading: searchLoading } = trpc.materialSwap.search.useQuery(
    {
      query: searchQuery,
      limit: 20,
    },
    { enabled: searchQuery.length > 2 }
  );

  // Get swap recommendations for selected material
  const { data: swapRecommendations, isLoading: swapsLoading } = trpc.materialSwap.findSwaps.useQuery(
    {
      materialId: selectedMaterialId!,
      maxGwpIncrease: 10, // Max 10% GWP increase
      maxPriceIncrease: 20, // Allow up to 20% price increase
      limit: 10,
    },
    { enabled: selectedMaterialId !== null }
  );

  // Compare two materials
  const { data: comparison } = trpc.materialSwap.compareScorecard.useQuery(
    {
      materialId1: selectedMaterialId!,
      materialId2: comparisonMaterialId!,
    },
    { enabled: selectedMaterialId !== null && comparisonMaterialId !== null }
  );

  const parseGwp = (gwp: string | null) => {
    if (!gwp) return null;
    const match = gwp.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Material Swap Engine</h1>
        <p className="text-muted-foreground">
          Find sustainable alternatives with full CCPS scorecard comparison
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Materials</CardTitle>
          <CardDescription>
            Enter a material name, category, or product to find alternatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {searchLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="mt-4 grid gap-4">
                {searchResults.map((material: any) => {
                const gwp = parseGwp(material.gwpValue);
                return (
                  <Card
                    key={material.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedMaterialId === material.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedMaterialId(material.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{material.name}</h3>
                          {material.productName && (
                            <p className="text-sm text-muted-foreground">{material.productName}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{material.category}</Badge>
                            {gwp && (
                              <Badge variant="secondary">
                                {gwp.toFixed(1)} kgCO2e
                              </Badge>
                            )}
                            {material.hasEpd && <Badge variant="default">EPD</Badge>}
                          </div>
                        </div>
                        {material.pricePerUnit && (
                          <div className="text-right">
                            <p className="font-semibold">${material.pricePerUnit}</p>
                            <p className="text-sm text-muted-foreground">{material.priceUnit}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swap Recommendations */}
      {selectedMaterialId && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Swap Recommendations</CardTitle>
            <CardDescription>
              Alternative materials with lower carbon footprint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {swapsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {swapRecommendations && swapRecommendations.swaps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No suitable swaps found for this material
                </p>
              </div>
            )}

            {swapRecommendations && swapRecommendations.swaps.length > 0 && (
              <div className="grid gap-4">
                {swapRecommendations.swaps.map((swap: any) => {
                  const originalGwp = parseGwp(swap.original.gwpValue);
                  const candidateGwp = parseGwp(swap.candidate.gwpValue);
                  const carbonSavings =
                    originalGwp && candidateGwp
                      ? ((originalGwp - candidateGwp) / originalGwp) * 100
                      : null;

                  return (
                    <Card
                      key={swap.candidate.id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => setComparisonMaterialId(swap.candidate.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{swap.candidate.name}</h3>
                            {swap.candidate.productName && (
                              <p className="text-sm text-muted-foreground">
                                {swap.candidate.productName}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {carbonSavings !== null && (
                                <Badge
                                  variant={carbonSavings > 0 ? "default" : "destructive"}
                                  className="flex items-center gap-1"
                                >
                                  {carbonSavings > 0 ? (
                                    <TrendingDown className="h-3 w-3" />
                                  ) : (
                                    <TrendingUp className="h-3 w-3" />
                                  )}
                                  {Math.abs(carbonSavings).toFixed(1)}% carbon
                                </Badge>
                              )}
                              {swap.tradeoffs.priceDelta !== null && (
                                <Badge
                                  variant={swap.tradeoffs.priceDelta <= 0 ? "default" : "secondary"}
                                >
                                  {swap.tradeoffs.priceDelta > 0 ? "+" : ""}
                                  {swap.tradeoffs.priceDelta.toFixed(1)}% price
                                </Badge>
                              )}
                              {swap.tradeoffs.leadTimeDelta !== null && (
                                <Badge variant="outline">
                                  {swap.tradeoffs.leadTimeDelta > 0 ? "+" : ""}
                                  {swap.tradeoffs.leadTimeDelta} days lead time
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Compare
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CCPS Scorecard Comparison */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle>CCPS Scorecard Comparison</CardTitle>
            <CardDescription>
              Side-by-side comparison of Carbon, Compliance, Certifications, Cost, Supply Chain, and
              Health metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="carbon">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="carbon">Carbon</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="certifications">Certifications</TabsTrigger>
                <TabsTrigger value="cost">Cost</TabsTrigger>
                <TabsTrigger value="supply">Supply</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
              </TabsList>

              <TabsContent value="carbon" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material1.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">GWP</p>
                          <p className="text-2xl font-bold">{comparison.material1.scorecard.carbon.gwp}</p>
                        </div>

                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material2.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">GWP</p>
                          <p className="text-2xl font-bold">{comparison.material2.scorecard.carbon.gwp}</p>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                </div>

                {comparison.comparison.carbonSavings !== null && (
                  <Card className="bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Carbon Savings</span>
                        <Badge variant={comparison.comparison.carbonSavings > 0 ? "default" : "destructive"} className="text-lg">
                          {comparison.comparison.carbonSavings > 0 ? "-" : "+"}
                          {Math.abs(comparison.comparison.carbonSavings).toFixed(1)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material1.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material1.scorecard.compliance.fireRating && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fire Rating</p>
                          <p className="font-semibold">{comparison.material1.scorecard.compliance.fireRating}</p>
                        </div>
                      )}
                      {comparison.material1.scorecard.compliance.rValue && (
                        <div>
                          <p className="text-sm text-muted-foreground">R-Value</p>
                          <p className="font-semibold">{comparison.material1.scorecard.compliance.rValue}</p>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {comparison.material1.scorecard.compliance.meetsTitle24 && (
                          <Badge variant="default">Title 24</Badge>
                        )}
                        {comparison.material1.scorecard.compliance.meetsIecc && (
                          <Badge variant="default">IECC</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material2.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material2.scorecard.compliance.fireRating && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fire Rating</p>
                          <p className="font-semibold">{comparison.material2.scorecard.compliance.fireRating}</p>
                        </div>
                      )}
                      {comparison.material2.scorecard.compliance.rValue && (
                        <div>
                          <p className="text-sm text-muted-foreground">R-Value</p>
                          <p className="font-semibold">{comparison.material2.scorecard.compliance.rValue}</p>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {comparison.material2.scorecard.compliance.meetsTitle24 && (
                          <Badge variant="default">Title 24</Badge>
                        )}
                        {comparison.material2.scorecard.compliance.meetsIecc && (
                          <Badge variant="default">IECC</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="certifications" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material1.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        {comparison.material1.scorecard.certifications.hasEpd && <Badge>EPD</Badge>}
                        {comparison.material1.scorecard.certifications.hasDeclare && <Badge>Declare</Badge>}
                        {comparison.material1.scorecard.certifications.hasHpd && <Badge>HPD</Badge>}
                        {comparison.material1.scorecard.certifications.hasFsc && <Badge>FSC</Badge>}
                        {comparison.material1.scorecard.certifications.hasC2c && <Badge>C2C</Badge>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material2.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        {comparison.material2.scorecard.certifications.hasEpd && <Badge>EPD</Badge>}
                        {comparison.material2.scorecard.certifications.hasDeclare && <Badge>Declare</Badge>}
                        {comparison.material2.scorecard.certifications.hasHpd && <Badge>HPD</Badge>}
                        {comparison.material2.scorecard.certifications.hasFsc && <Badge>FSC</Badge>}
                        {comparison.material2.scorecard.certifications.hasC2c && <Badge>C2C</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="cost" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material1.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material1.scorecard.cost.pricePerUnit && (
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="text-2xl font-bold">
                            ${comparison.material1.scorecard.cost.pricePerUnit}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {comparison.material1.scorecard.cost.priceUnit}
                            </span>
                          </p>
                        </div>
                      )}
                      {comparison.material1.scorecard.cost.leadTimeDays && (
                        <div>
                          <p className="text-sm text-muted-foreground">Lead Time</p>
                          <p className="font-semibold">{comparison.material1.scorecard.cost.leadTimeDays} days</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material2.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material2.scorecard.cost.pricePerUnit && (
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="text-2xl font-bold">
                            ${comparison.material2.scorecard.cost.pricePerUnit}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {comparison.material2.scorecard.cost.priceUnit}
                            </span>
                          </p>
                        </div>
                      )}
                      {comparison.material2.scorecard.cost.leadTimeDays && (
                        <div>
                          <p className="text-sm text-muted-foreground">Lead Time</p>
                          <p className="font-semibold">{comparison.material2.scorecard.cost.leadTimeDays} days</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {comparison.comparison.priceDifference !== null && (
                  <Card className="bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Cost Difference</span>
                        <Badge variant={comparison.comparison.priceDifference <= 0 ? "default" : "secondary"} className="text-lg">
                          {comparison.comparison.priceDifference > 0 ? "+" : ""}
                          ${comparison.comparison.priceDifference.toFixed(2)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="supply" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material1.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material1.scorecard.supplyChain.usManufactured && (
                        <Badge variant="default">US Manufactured</Badge>
                      )}
                      {comparison.material1.scorecard.supplyChain.regionalAvailabilityMiles && (
                        <div>
                          <p className="text-sm text-muted-foreground">Regional Availability</p>
                          <p className="font-semibold">
                            {comparison.material1.scorecard.supplyChain.regionalAvailabilityMiles} miles
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material2.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material2.scorecard.supplyChain.usManufactured && (
                        <Badge variant="default">US Manufactured</Badge>
                      )}
                      {comparison.material2.scorecard.supplyChain.regionalAvailabilityMiles && (
                        <div>
                          <p className="text-sm text-muted-foreground">Regional Availability</p>
                          <p className="font-semibold">
                            {comparison.material2.scorecard.supplyChain.regionalAvailabilityMiles} miles
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material1.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material1.scorecard.health.vocLevel && (
                        <div>
                          <p className="text-sm text-muted-foreground">VOC Level</p>
                          <p className="font-semibold">{comparison.material1.scorecard.health.vocLevel}</p>
                        </div>
                      )}
                      {comparison.material1.scorecard.health.onRedList && (
                        <Badge variant="destructive">On Red List</Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{comparison.material2.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {comparison.material2.scorecard.health.vocLevel && (
                        <div>
                          <p className="text-sm text-muted-foreground">VOC Level</p>
                          <p className="font-semibold">{comparison.material2.scorecard.health.vocLevel}</p>
                        </div>
                      )}
                      {comparison.material2.scorecard.health.onRedList && (
                        <Badge variant="destructive">On Red List</Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
