import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, SlidersHorizontal, CheckCircle2, X } from "lucide-react";

// ── Constants ───────────────────────────────────────────────────────────────

const MATERIAL_CATEGORIES = [
  "Concrete",
  "Steel",
  "Wood / Timber",
  "Insulation",
  "Glass / Glazing",
  "Aluminum",
  "Masonry / Brick",
  "Roofing",
  "Flooring",
  "Drywall / Gypsum",
  "Cladding",
  "MEP",
  "Rebar",
  "Copper",
  "Stone",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function SupplierFilterSetup() {
  const { user } = useAuth();

  // Form state
  const [materialPrefs, setMaterialPrefs] = useState<string[]>([]);
  const [serviceRadius, setServiceRadius] = useState<number>(250);
  const [noRadiusLimit, setNoRadiusLimit] = useState(false);
  const [acceptedStates, setAcceptedStates] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minLeadDays, setMinLeadDays] = useState("");
  const [maxLeadDays, setMaxLeadDays] = useState("");
  const [minOrderQuantity, setMinOrderQuantity] = useState("");
  const [dirty, setDirty] = useState(false);

  // Load existing filters
  const { data: existing, isLoading } = trpc.supplier.getMyFilters.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (!existing) return;
    setMaterialPrefs((existing.materialTypePreferences as string[]) ?? []);
    setServiceRadius(existing.serviceRadius ?? 250);
    setNoRadiusLimit(!existing.serviceRadius);
    setAcceptedStates(
      existing.acceptedLocations
        ? existing.acceptedLocations.split(",").map((s) => s.trim()).filter(Boolean)
        : []
    );
    setMinPrice(existing.minPrice ?? "");
    setMaxPrice(existing.maxPrice ?? "");
    setMinLeadDays(existing.minLeadDays?.toString() ?? "");
    setMaxLeadDays(existing.maxLeadDays?.toString() ?? "");
    setMinOrderQuantity(existing.minOrderQuantity ?? "");
  }, [existing]);

  // Save mutation
  const saveMutation = trpc.supplier.saveFilters.useMutation({
    onSuccess: () => {
      toast.success("Filter settings saved — your RFQ matches will update automatically");
      setDirty(false);
    },
    onError: (err) => toast.error(err.message || "Failed to save filters"),
  });

  const handleSave = () => {
    saveMutation.mutate({
      materialTypePreferences: materialPrefs,
      serviceRadius: noRadiusLimit ? null : serviceRadius,
      acceptedLocations: acceptedStates.join(", "),
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      minLeadDays: minLeadDays ? parseInt(minLeadDays) : null,
      maxLeadDays: maxLeadDays ? parseInt(maxLeadDays) : null,
      minOrderQuantity: minOrderQuantity ? parseFloat(minOrderQuantity) : null,
    });
  };

  const toggleMaterial = (cat: string) => {
    setDirty(true);
    setMaterialPrefs((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleState = (state: string) => {
    setDirty(true);
    setAcceptedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">RFQ Matching Filters</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            These settings control which RFQs you're matched to. More specific filters = higher quality leads.
          </p>
        </div>

        <div className="space-y-6">
          {/* Material Categories */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Material Categories</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Select every category you supply. RFQs requesting these materials will be matched to you.
            </p>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_CATEGORIES.map((cat) => {
                const selected = materialPrefs.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleMaterial(cat)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
            {materialPrefs.length > 0 && (
              <p className="text-xs text-primary mt-3">{materialPrefs.length} categories selected</p>
            )}
          </Card>

          {/* Service Radius */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Service Radius</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Maximum distance from your location you'll deliver to. Closer RFQs get higher match scores.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="no-radius"
                  checked={noRadiusLimit}
                  onChange={(e) => { setNoRadiusLimit(e.target.checked); setDirty(true); }}
                  className="rounded"
                />
                <Label htmlFor="no-radius" className="text-sm cursor-pointer">
                  No limit — I ship nationwide
                </Label>
              </div>
              {!noRadiusLimit && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Radius</span>
                    <span className="font-semibold text-foreground">{serviceRadius} miles</span>
                  </div>
                  <Slider
                    min={25}
                    max={1000}
                    step={25}
                    value={[serviceRadius]}
                    onValueChange={([v]) => { setServiceRadius(v); setDirty(true); }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>25 mi</span>
                    <span>500 mi</span>
                    <span>1000 mi</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Accepted States */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Accepted States</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Optional. Used as a fallback when GPS coordinates aren't available for an RFQ.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {US_STATES.map((state) => {
                const selected = acceptedStates.includes(state);
                return (
                  <button
                    key={state}
                    onClick={() => toggleState(state)}
                    className={`w-12 py-1.5 rounded text-xs font-medium border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary"
                    }`}
                  >
                    {state}
                  </button>
                );
              })}
            </div>
            {acceptedStates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground self-center">Selected:</span>
                {acceptedStates.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
                    {s}
                    <button onClick={() => toggleState(s)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Price & Lead Time Range */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Bid & Lead Time Preferences</h2>
            <p className="text-xs text-muted-foreground mb-5">
              Optional. Helps filter out RFQs that fall outside your capacity.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Bid Price Range ($)</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5,000"
                      value={minPrice}
                      onChange={(e) => { setMinPrice(e.target.value); setDirty(true); }}
                      className="mt-1"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">–</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 500,000"
                      value={maxPrice}
                      onChange={(e) => { setMaxPrice(e.target.value); setDirty(true); }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Lead Time Range (days)</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 7"
                      value={minLeadDays}
                      onChange={(e) => { setMinLeadDays(e.target.value); setDirty(true); }}
                      className="mt-1"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">–</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 90"
                      value={maxLeadDays}
                      onChange={(e) => { setMaxLeadDays(e.target.value); setDirty(true); }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Minimum Order Value ($)</h3>
              <p className="text-xs text-muted-foreground mb-2">
                RFQs below this value won't be shown to you.
              </p>
              <Input
                type="number"
                placeholder="e.g. 10,000"
                value={minOrderQuantity}
                onChange={(e) => { setMinOrderQuantity(e.target.value); setDirty(true); }}
                className="max-w-xs"
              />
            </div>
          </Card>

          {/* Save */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <p className="text-xs text-muted-foreground">
              {dirty ? "You have unsaved changes." : existing ? "Settings saved." : "No filters saved yet."}
            </p>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 min-w-32"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                "Save Filters"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
