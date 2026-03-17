import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Storage helper will be implemented

export default function SupplierSpecSubmission() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const materialId = params.get("materialId");
  const supplierId = params.get("supplierId");

  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    // Compliance
    fireRating: "",
    fireRatingStandard: "",
    rValue: "",
    thermalUValue: "",
    compressiveStrength: "",
    tensileStrength: "",
    astmStandards: "",
    meetsTitle24: false,
    meetsIecc: false,
    buildingCodes: "",
    
    // Cost
    pricePerUnit: "",
    priceUnit: "",
    minimumOrderQuantity: "",
    moqUnit: "",
    bulkDiscountAvailable: false,
    
    // Supply Chain
    leadTimeDays: "",
    manufacturingLocation: "",
    usManufactured: false,
    regionalAvailabilityMiles: "",
    shippingRegions: "",
    inStock: true,
    stockQuantity: "",
    
    // Health
    vocLevel: "",
    vocCertification: "",
    onRedList: false,
    toxicityRating: "",
    indoorAirQualityRating: "",
    
    // Certifications
    hasEpd: false,
    hasHpd: false,
    hasFsc: false,
    hasC2c: false,
    hasGreenguard: false,
    hasDeclare: false,
    certificationUrls: {} as Record<string, string>,
    
    // Documents
    datasheetUrl: "",
    specSheetUrl: "",
    testReportUrls: [] as string[],
    
    // Additional
    notes: "",
    recycledContentPct: "",
    warrantyYears: "",
    expectedLifecycleYears: "",
  });

  const submitSpec = trpc.materialSpec.submit.useMutation({
    onSuccess: () => {
      toast.success("Specification submitted successfully! Pending admin review.");
      setLocation("/supplier/dashboard");
    },
    onError: (error) => {
      toast.error(`Failed to submit specification: ${error.message}`);
    },
  });

  const handleFileUpload = async (file: File, field: "datasheetUrl" | "specSheetUrl") => {
    if (!file) return;
    
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      // TODO: Implement S3 upload via tRPC endpoint
      const url = `https://placeholder.com/${file.name}`;
      
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success(`${field === "datasheetUrl" ? "Datasheet" : "Spec sheet"} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload file: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!materialId || !supplierId) {
      toast.error("Missing material ID or supplier ID");
      return;
    }
    
    // Convert form data to API format
    const payload = {
      materialId: parseInt(materialId),
      supplierId: parseInt(supplierId),
      
      // Compliance
      fireRating: formData.fireRating || undefined,
      fireRatingStandard: formData.fireRatingStandard || undefined,
      rValue: formData.rValue ? parseFloat(formData.rValue) : undefined,
      thermalUValue: formData.thermalUValue ? parseFloat(formData.thermalUValue) : undefined,
      compressiveStrength: formData.compressiveStrength || undefined,
      tensileStrength: formData.tensileStrength || undefined,
      astmStandards: formData.astmStandards ? formData.astmStandards.split(",").map(s => s.trim()) : undefined,
      meetsTitle24: formData.meetsTitle24,
      meetsIecc: formData.meetsIecc,
      buildingCodes: formData.buildingCodes ? formData.buildingCodes.split(",").map(s => s.trim()) : undefined,
      
      // Cost
      pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : undefined,
      priceUnit: formData.priceUnit || undefined,
      minimumOrderQuantity: formData.minimumOrderQuantity ? parseInt(formData.minimumOrderQuantity) : undefined,
      moqUnit: formData.moqUnit || undefined,
      bulkDiscountAvailable: formData.bulkDiscountAvailable,
      
      // Supply Chain
      leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
      manufacturingLocation: formData.manufacturingLocation || undefined,
      usManufactured: formData.usManufactured,
      regionalAvailabilityMiles: formData.regionalAvailabilityMiles ? parseInt(formData.regionalAvailabilityMiles) : undefined,
      shippingRegions: formData.shippingRegions ? formData.shippingRegions.split(",").map(s => s.trim()) : undefined,
      inStock: formData.inStock,
      stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : undefined,
      
      // Health
      vocLevel: formData.vocLevel || undefined,
      vocCertification: formData.vocCertification || undefined,
      onRedList: formData.onRedList,
      toxicityRating: formData.toxicityRating || undefined,
      indoorAirQualityRating: formData.indoorAirQualityRating || undefined,
      
      // Certifications
      hasEpd: formData.hasEpd,
      hasHpd: formData.hasHpd,
      hasFsc: formData.hasFsc,
      hasC2c: formData.hasC2c,
      hasGreenguard: formData.hasGreenguard,
      hasDeclare: formData.hasDeclare,
      certificationUrls: Object.keys(formData.certificationUrls).length > 0 ? formData.certificationUrls : undefined,
      
      // Documents
      datasheetUrl: formData.datasheetUrl || undefined,
      specSheetUrl: formData.specSheetUrl || undefined,
      testReportUrls: formData.testReportUrls.length > 0 ? formData.testReportUrls : undefined,
      
      // Additional
      notes: formData.notes || undefined,
      recycledContentPct: formData.recycledContentPct ? parseFloat(formData.recycledContentPct) : undefined,
      warrantyYears: formData.warrantyYears ? parseInt(formData.warrantyYears) : undefined,
      expectedLifecycleYears: formData.expectedLifecycleYears ? parseInt(formData.expectedLifecycleYears) : undefined,
    };
    
    submitSpec.mutate(payload);
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit Material Specification</CardTitle>
          <CardDescription>
            Provide detailed specifications for your material. All fields are optional, but more complete information helps buyers make informed decisions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="compliance">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="cost">Cost</TabsTrigger>
                <TabsTrigger value="supply">Supply Chain</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
                <TabsTrigger value="certs">Certifications</TabsTrigger>
              </TabsList>

              <TabsContent value="compliance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fireRating">Fire Rating</Label>
                    <Input
                      id="fireRating"
                      placeholder="e.g., Class A, 1-hour"
                      value={formData.fireRating}
                      onChange={(e) => setFormData(prev => ({ ...prev, fireRating: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fireRatingStandard">Fire Rating Standard</Label>
                    <Input
                      id="fireRatingStandard"
                      placeholder="e.g., ASTM E84, UL 723"
                      value={formData.fireRatingStandard}
                      onChange={(e) => setFormData(prev => ({ ...prev, fireRatingStandard: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rValue">R-Value</Label>
                    <Input
                      id="rValue"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 13.0"
                      value={formData.rValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, rValue: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thermalUValue">U-Value</Label>
                    <Input
                      id="thermalUValue"
                      type="number"
                      step="0.0001"
                      placeholder="e.g., 0.0769"
                      value={formData.thermalUValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, thermalUValue: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compressiveStrength">Compressive Strength</Label>
                    <Input
                      id="compressiveStrength"
                      placeholder="e.g., 3000 psi"
                      value={formData.compressiveStrength}
                      onChange={(e) => setFormData(prev => ({ ...prev, compressiveStrength: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tensileStrength">Tensile Strength</Label>
                    <Input
                      id="tensileStrength"
                      placeholder="e.g., 500 psi"
                      value={formData.tensileStrength}
                      onChange={(e) => setFormData(prev => ({ ...prev, tensileStrength: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="astmStandards">ASTM Standards (comma-separated)</Label>
                  <Input
                    id="astmStandards"
                    placeholder="e.g., ASTM C90, ASTM C270"
                    value={formData.astmStandards}
                    onChange={(e) => setFormData(prev => ({ ...prev, astmStandards: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buildingCodes">Building Codes (comma-separated)</Label>
                  <Input
                    id="buildingCodes"
                    placeholder="e.g., IBC 2021, NFPA 5000"
                    value={formData.buildingCodes}
                    onChange={(e) => setFormData(prev => ({ ...prev, buildingCodes: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="meetsTitle24"
                      checked={formData.meetsTitle24}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, meetsTitle24: checked as boolean }))}
                    />
                    <Label htmlFor="meetsTitle24">Meets Title 24</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="meetsIecc"
                      checked={formData.meetsIecc}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, meetsIecc: checked as boolean }))}
                    />
                    <Label htmlFor="meetsIecc">Meets IECC</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cost" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerUnit">Price Per Unit</Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 12.50"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceUnit">Price Unit</Label>
                    <Input
                      id="priceUnit"
                      placeholder="e.g., per SF, per unit"
                      value={formData.priceUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceUnit: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrderQuantity">Minimum Order Quantity</Label>
                    <Input
                      id="minimumOrderQuantity"
                      type="number"
                      placeholder="e.g., 100"
                      value={formData.minimumOrderQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderQuantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moqUnit">MOQ Unit</Label>
                    <Input
                      id="moqUnit"
                      placeholder="e.g., SF, units"
                      value={formData.moqUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, moqUnit: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bulkDiscountAvailable"
                    checked={formData.bulkDiscountAvailable}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bulkDiscountAvailable: checked as boolean }))}
                  />
                  <Label htmlFor="bulkDiscountAvailable">Bulk Discount Available</Label>
                </div>
              </TabsContent>

              <TabsContent value="supply" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                    <Input
                      id="leadTimeDays"
                      type="number"
                      placeholder="e.g., 14"
                      value={formData.leadTimeDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, leadTimeDays: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturingLocation">Manufacturing Location</Label>
                    <Input
                      id="manufacturingLocation"
                      placeholder="e.g., Portland, OR"
                      value={formData.manufacturingLocation}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturingLocation: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regionalAvailabilityMiles">Regional Availability (Miles)</Label>
                    <Input
                      id="regionalAvailabilityMiles"
                      type="number"
                      placeholder="e.g., 500"
                      value={formData.regionalAvailabilityMiles}
                      onChange={(e) => setFormData(prev => ({ ...prev, regionalAvailabilityMiles: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity">Stock Quantity</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      placeholder="e.g., 10000"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingRegions">Shipping Regions (comma-separated)</Label>
                  <Input
                    id="shippingRegions"
                    placeholder="e.g., West Coast, Southwest, Mountain"
                    value={formData.shippingRegions}
                    onChange={(e) => setFormData(prev => ({ ...prev, shippingRegions: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="usManufactured"
                      checked={formData.usManufactured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, usManufactured: checked as boolean }))}
                    />
                    <Label htmlFor="usManufactured">US Manufactured</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inStock"
                      checked={formData.inStock}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inStock: checked as boolean }))}
                    />
                    <Label htmlFor="inStock">In Stock</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vocLevel">VOC Level</Label>
                    <Input
                      id="vocLevel"
                      placeholder="e.g., < 50 g/L"
                      value={formData.vocLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, vocLevel: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vocCertification">VOC Certification</Label>
                    <Input
                      id="vocCertification"
                      placeholder="e.g., GREENGUARD Gold"
                      value={formData.vocCertification}
                      onChange={(e) => setFormData(prev => ({ ...prev, vocCertification: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toxicityRating">Toxicity Rating</Label>
                    <Input
                      id="toxicityRating"
                      placeholder="e.g., Low, None"
                      value={formData.toxicityRating}
                      onChange={(e) => setFormData(prev => ({ ...prev, toxicityRating: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="indoorAirQualityRating">Indoor Air Quality Rating</Label>
                    <Input
                      id="indoorAirQualityRating"
                      placeholder="e.g., Excellent, Good"
                      value={formData.indoorAirQualityRating}
                      onChange={(e) => setFormData(prev => ({ ...prev, indoorAirQualityRating: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onRedList"
                    checked={formData.onRedList}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, onRedList: checked as boolean }))}
                  />
                  <Label htmlFor="onRedList">Contains Red List Chemicals</Label>
                </div>
              </TabsContent>

              <TabsContent value="certs" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasEpd"
                        checked={formData.hasEpd}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasEpd: checked as boolean }))}
                      />
                      <Label htmlFor="hasEpd">EPD</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasHpd"
                        checked={formData.hasHpd}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasHpd: checked as boolean }))}
                      />
                      <Label htmlFor="hasHpd">HPD</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasFsc"
                        checked={formData.hasFsc}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasFsc: checked as boolean }))}
                      />
                      <Label htmlFor="hasFsc">FSC</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasC2c"
                        checked={formData.hasC2c}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasC2c: checked as boolean }))}
                      />
                      <Label htmlFor="hasC2c">Cradle to Cradle</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasGreenguard"
                        checked={formData.hasGreenguard}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasGreenguard: checked as boolean }))}
                      />
                      <Label htmlFor="hasGreenguard">GREENGUARD</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasDeclare"
                        checked={formData.hasDeclare}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasDeclare: checked as boolean }))}
                      />
                      <Label htmlFor="hasDeclare">Declare</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Supporting Documents</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="datasheet">Product Datasheet</Label>
                        <Input
                          id="datasheet"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "datasheetUrl");
                          }}
                          disabled={uploading}
                        />
                        {formData.datasheetUrl && (
                          <p className="text-sm text-muted-foreground">✓ Uploaded</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specSheet">Technical Spec Sheet</Label>
                        <Input
                          id="specSheet"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "specSheetUrl");
                          }}
                          disabled={uploading}
                        />
                        {formData.specSheetUrl && (
                          <p className="text-sm text-muted-foreground">✓ Uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about this material..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recycledContentPct">Recycled Content (%)</Label>
                  <Input
                    id="recycledContentPct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 25.5"
                    value={formData.recycledContentPct}
                    onChange={(e) => setFormData(prev => ({ ...prev, recycledContentPct: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warrantyYears">Warranty (Years)</Label>
                  <Input
                    id="warrantyYears"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.warrantyYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, warrantyYears: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedLifecycleYears">Expected Lifecycle (Years)</Label>
                  <Input
                    id="expectedLifecycleYears"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.expectedLifecycleYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedLifecycleYears: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/supplier/dashboard")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitSpec.isPending || uploading || !materialId || !supplierId}
              >
                {submitSpec.isPending ? "Submitting..." : "Submit Specification"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
