import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "wouter";
import { toast } from "sonner";
import { Package, Search, Upload, TrendingUp, CheckCircle, AlertCircle, Plus, ShieldCheck, ExternalLink, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── EPD Submit Modal ──────────────────────────────────────────────────────────

const epdSchema = z.object({
  productName: z.string().min(1, "Product name required"),
  epdNumber: z.string().optional(),
  epdUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  epdProgramOperator: z.string().optional(),
  gwpValue: z.coerce.number().positive("Must be positive").optional(),
  gwpUnit: z.string().default("kgCO2e"),
  declaredUnit: z.string().optional(),
  externallyVerified: z.boolean().default(false),
  expiresAt: z.string().optional(),
});

type EpdFormData = z.infer<typeof epdSchema>;

function EpdSubmitModal({
  open,
  onClose,
  materialId,
  materialName,
}: {
  open: boolean;
  onClose: () => void;
  materialId?: number;
  materialName?: string;
}) {
  const submit = trpc.epd.submit.useMutation({
    onSuccess: () => {
      toast.success("EPD submitted for review");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EpdFormData>({
    resolver: zodResolver(epdSchema),
    defaultValues: { productName: materialName ?? "", gwpUnit: "kgCO2e" },
  });

  const onSubmit = (data: EpdFormData) => {
    submit.mutate({
      ...data,
      materialId,
      epdUrl: data.epdUrl || undefined,
      gwpValue: data.gwpValue,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { reset(); onClose(); }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit EPD</DialogTitle>
          <DialogDescription>
            Link an Environmental Product Declaration to{" "}
            {materialName ? <strong>{materialName}</strong> : "a material"}.
            Our team will verify and publish it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input
              placeholder="e.g. GreenCrete Mix II"
              {...register("productName")}
              className={errors.productName ? "border-red-500" : ""}
            />
            {errors.productName && <p className="text-sm text-red-500">{errors.productName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GWP Value</Label>
              <Input type="number" step="any" min="0" placeholder="e.g. 285" {...register("gwpValue")} />
              {errors.gwpValue && <p className="text-sm text-red-500">{errors.gwpValue.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input placeholder="kgCO2e" defaultValue="kgCO2e" {...register("gwpUnit")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Declared Unit</Label>
            <Input placeholder="e.g. 1 m3, 1 kg, 1 tonne" {...register("declaredUnit")} />
          </div>

          <div className="space-y-1.5">
            <Label>EPD Number</Label>
            <Input placeholder="e.g. EPD-BRE-2024-001" {...register("epdNumber")} />
          </div>

          <div className="space-y-1.5">
            <Label>Program Operator</Label>
            <Input placeholder="e.g. Building Transparency (EC3), NSF, UL" {...register("epdProgramOperator")} />
          </div>

          <div className="space-y-1.5">
            <Label>EPD Document URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              {...register("epdUrl")}
              className={errors.epdUrl ? "border-red-500" : ""}
            />
            {errors.epdUrl && <p className="text-sm text-red-500">{errors.epdUrl.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Expiry Date</Label>
            <Input type="date" {...register("expiresAt")} />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("externallyVerified")} className="w-4 h-4 rounded" />
            Third-party / externally verified EPD
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Submit EPD"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupplierMaterials() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [epdModal, setEpdModal] = useState<{ open: boolean; materialId?: number; materialName?: string }>({ open: false });

  // Supplier's submitted EPDs
  const { data: myEpds = [], isLoading: epdsLoading, refetch: refetchEpds } = trpc.epd.listMine.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });

  // Stats
  const verified = myEpds.filter((e) => e.status === "approved");
  const pending = myEpds.filter((e) => e.status === "pending");

  const filtered = myEpds.filter(
    (e) =>
      !search ||
      e.productName.toLowerCase().includes(search.toLowerCase()) ||
      (e.epdNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openEpdModal = (materialId?: number, materialName?: string) =>
    setEpdModal({ open: true, materialId, materialName });
  const closeEpdModal = () => {
    setEpdModal({ open: false });
    refetchEpds();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Materials & EPDs</h1>
            <p className="text-muted-foreground mt-1">
              Manage your EPD documentation — verified data builds trust with architects.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/supplier/upload">
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Bulk Upload
              </Button>
            </Link>
            <Button
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => openEpdModal()}
            >
              <Plus className="w-4 h-4" />
              Submit EPD
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total EPDs</p>
                <p className="text-2xl font-bold">{myEpds.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{verified.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{pending.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name or EPD number…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* EPD Table */}
        {epdsLoading ? (
          <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No EPDs submitted yet.</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Submit an EPD to make your carbon data visible to architects.
            </p>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => openEpdModal()}>
              <Plus className="w-4 h-4 mr-2" /> Submit Your First EPD
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Product</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">GWP</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">EPD #</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Operator</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Expiry</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((epd) => {
                    const expired = epd.expiresAt ? new Date(epd.expiresAt) < new Date() : false;
                    return (
                      <tr key={epd.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-foreground">{epd.productName}</p>
                          {epd.externallyVerified && (
                            <span className="flex items-center gap-1 text-[11px] text-green-600 mt-0.5">
                              <ShieldCheck className="w-3 h-3" /> Externally verified
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {epd.gwpValue ? (
                            <span className="text-sm font-mono">
                              {parseFloat(epd.gwpValue).toFixed(2)} {epd.gwpUnit ?? "kgCO₂e"}
                              {epd.declaredUnit && (
                                <span className="text-muted-foreground"> / {epd.declaredUnit}</span>
                              )}
                            </span>
                          ) : "—"}
                          {epd.gwpValue && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm font-mono text-primary">{epd.epdNumber || "—"}</td>
                        <td className="p-4 text-sm text-muted-foreground">{epd.epdProgramOperator || "—"}</td>
                        <td className="p-4 text-sm">
                          {epd.expiresAt ? (
                            <span className={expired ? "text-red-600" : "text-foreground"}>
                              {new Date(epd.expiresAt).toLocaleDateString()}
                              {expired && " (Expired)"}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={
                              epd.status === "approved"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : epd.status === "rejected"
                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            }
                          >
                            {epd.status === "approved" ? "Verified" : epd.status === "rejected" ? "Rejected" : "Pending"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {epd.epdUrl && (
                              <a href={epd.epdUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                                  <ExternalLink className="w-3 h-3" /> View
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <EpdSubmitModal
        open={epdModal.open}
        onClose={closeEpdModal}
        materialId={epdModal.materialId}
        materialName={epdModal.materialName}
      />
    </div>
  );
}
