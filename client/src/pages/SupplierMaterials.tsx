import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  Search,
  Upload,
  CheckCircle,
  AlertCircle,
  Plus,
  ShieldCheck,
  ExternalLink,
  FileText,
  Loader2,
  Edit3,
  X,
  Save,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Zap,
} from "lucide-react";

// ── MCS Score Badge ──────────────────────────────────────────────────────────

interface McsScore {
  materialId: number;
  total: number;
  topTip: string | null;
  breakdown: {
    epd: { score: number; max: number; hasEpd: boolean };
    carbon: { score: number; max: number; gwp: number | null };
    certifications: { score: number; max: number; count: number };
    localSourcing: { score: number; max: number; miles: number | null; usManufactured: boolean };
    transparency: { score: number; max: number; filledFields: number; totalFields: number };
  };
}

function McsScoreBadge({ score }: { score: McsScore | undefined }) {
  if (!score) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const { total } = score;
  const color =
    total >= 70 ? "#22c55e" : total >= 40 ? "#f59e0b" : "#ef4444";
  const label =
    total >= 70 ? "Good" : total >= 40 ? "Fair" : "Low";

  const radius = 12;
  const circ = 2 * Math.PI * radius;
  const filled = circ * (total / 100);

  return (
    <div className="flex items-center gap-2">
      {/* Mini ring */}
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="-rotate-90">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="16" cy="16" r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </svg>
      <div>
        <p className="text-sm font-bold tabular-nums leading-none" style={{ color }}>{total}</p>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
      </div>
    </div>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Concrete",
  "Steel",
  "Timber",
  "Glass",
  "Insulation",
  "Roofing",
  "Flooring",
  "Cladding",
  "MEP",
  "Other",
] as const;

const CERTIFICATIONS = [
  { key: "hasEpd", label: "EPD" },
  { key: "hasHpd", label: "HPD" },
  { key: "hasFsc", label: "FSC" },
  { key: "hasC2c", label: "Cradle to Cradle" },
  { key: "hasGreenguard", label: "GreenGuard" },
  { key: "hasDeclare", label: "Declare" },
] as const;

// ── EPD Submit Modal ─────────────────────────────────────────────────────────

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
    resolver: zodResolver(epdSchema) as any,
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
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit EPD</DialogTitle>
          <DialogDescription>
            Link an Environmental Product Declaration to{" "}
            {materialName ? <strong>{materialName}</strong> : "a material"}. Our
            team will verify and publish it.
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
            {errors.productName && (
              <p className="text-sm text-red-500">
                {errors.productName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GWP Value</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 285"
                {...register("gwpValue")}
              />
              {errors.gwpValue && (
                <p className="text-sm text-red-500">
                  {errors.gwpValue.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input
                placeholder="kgCO2e"
                defaultValue="kgCO2e"
                {...register("gwpUnit")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Declared Unit</Label>
            <Input
              placeholder="e.g. 1 m3, 1 kg, 1 tonne"
              {...register("declaredUnit")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>EPD Number</Label>
            <Input
              placeholder="e.g. EPD-BRE-2024-001"
              {...register("epdNumber")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Program Operator</Label>
            <Input
              placeholder="e.g. Building Transparency (EC3), NSF, UL"
              {...register("epdProgramOperator")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>EPD Document URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              {...register("epdUrl")}
              className={errors.epdUrl ? "border-red-500" : ""}
            />
            {errors.epdUrl && (
              <p className="text-sm text-red-500">{errors.epdUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Expiry Date</Label>
            <Input type="date" {...register("expiresAt")} />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register("externallyVerified")}
              className="w-4 h-4 rounded"
            />
            Third-party / externally verified EPD
          </label>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#2D6A4F] hover:bg-[#245a42]"
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Submit EPD"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Material Dialog ──────────────────────────────────────────────────────

const addMaterialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  pricePerUnit: z.coerce.number().positive("Must be positive").optional(),
  priceUnit: z.string().optional(),
  leadTimeDays: z.coerce.number().int().positive("Must be positive").optional(),
  recycledContentPct: z.coerce.number().min(0).max(100).optional(),
  hasEpd: z.boolean().default(false),
  hasHpd: z.boolean().default(false),
  hasFsc: z.boolean().default(false),
  hasC2c: z.boolean().default(false),
  hasGreenguard: z.boolean().default(false),
  hasDeclare: z.boolean().default(false),
});

type AddMaterialFormData = z.infer<typeof addMaterialSchema>;

function AddMaterialDialog({
  open,
  onClose,
  supplierId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  supplierId: number;
  onSuccess: () => void;
}) {
  const submitMaterial = trpc.materialSpec.submit.useMutation({
    onSuccess: () => {
      toast.success("Material submitted for review");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddMaterialFormData>({
    resolver: zodResolver(addMaterialSchema) as any,
    defaultValues: {
      priceUnit: "per unit",
      hasEpd: false,
      hasHpd: false,
      hasFsc: false,
      hasC2c: false,
      hasGreenguard: false,
      hasDeclare: false,
    },
  });

  const category = watch("category");

  const onSubmit = (data: AddMaterialFormData) => {
    // materialSpec.submit requires materialId — use 0 as placeholder for new materials
    // The server will create a pending spec entry
    submitMaterial.mutate({
      materialId: 1, // placeholder — server associates via supplierId
      supplierId,
      pricePerUnit: data.pricePerUnit,
      priceUnit: data.priceUnit,
      leadTimeDays: data.leadTimeDays,
      recycledContentPct: data.recycledContentPct,
      hasEpd: data.hasEpd,
      hasHpd: data.hasHpd,
      hasFsc: data.hasFsc,
      hasC2c: data.hasC2c,
      hasGreenguard: data.hasGreenguard,
      hasDeclare: data.hasDeclare,
      notes: [data.name, data.category, data.description]
        .filter(Boolean)
        .join(" | "),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Material</DialogTitle>
          <DialogDescription>
            Add a new material to your catalog. It will be reviewed before
            appearing in the marketplace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>
              Material Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Low-Carbon Concrete Mix"
              {...register("name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(val) => setValue("category", val)}
            >
              <SelectTrigger
                className={errors.category ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Brief description of the material..."
              {...register("description")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price per Unit</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 45.00"
                {...register("pricePerUnit")}
              />
              {errors.pricePerUnit && (
                <p className="text-sm text-red-500">
                  {errors.pricePerUnit.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Price Unit</Label>
              <Input
                placeholder="e.g. per m3, per tonne"
                {...register("priceUnit")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lead Time (days)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 14"
                {...register("leadTimeDays")}
              />
              {errors.leadTimeDays && (
                <p className="text-sm text-red-500">
                  {errors.leadTimeDays.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Recycled Content %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 30"
                {...register("recycledContentPct")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <div className="grid grid-cols-2 gap-2">
              {CERTIFICATIONS.map((cert) => {
                const val = watch(cert.key as keyof AddMaterialFormData);
                return (
                  <label
                    key={cert.key}
                    className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={val as boolean}
                      onCheckedChange={(checked) =>
                        setValue(
                          cert.key as keyof AddMaterialFormData,
                          !!checked as never,
                        )
                      }
                    />
                    {cert.label}
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#2D6A4F] hover:bg-[#245a42]"
              disabled={submitMaterial.isPending}
            >
              {submitMaterial.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Inline Edit Row ──────────────────────────────────────────────────────────

interface MaterialRow {
  id: number;
  materialId: number;
  supplierId: number;
  notes: string | null;
  pricePerUnit: string | number | null;
  priceUnit: string | null;
  leadTimeDays: number | null;
  hasEpd: boolean | number | null;
  hasHpd: boolean | number | null;
  hasFsc: boolean | number | null;
  hasC2c: boolean | number | null;
  hasGreenguard: boolean | number | null;
  hasDeclare: boolean | number | null;
  recycledContentPct: string | number | null;
  status: string;
  createdAt: string;
}

function parseName(notes: string | null): {
  name: string;
  category: string;
  description: string;
} {
  if (!notes) return { name: "Unnamed Material", category: "—", description: "" };
  const parts = notes.split(" | ");
  return {
    name: parts[0] || "Unnamed Material",
    category: parts[1] || "—",
    description: parts[2] || "",
  };
}

function toBool(val: boolean | number | null | undefined): boolean {
  if (val === null || val === undefined) return false;
  return val === true || val === 1;
}

function InlineEditRow({
  material,
  score,
  onEpdSubmit,
  onUpdated,
}: {
  material: MaterialRow;
  score?: McsScore;
  onEpdSubmit: (name: string, id: number) => void;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseName(material.notes);
  const [editPrice, setEditPrice] = useState(
    material.pricePerUnit?.toString() ?? "",
  );
  const [editPriceUnit, setEditPriceUnit] = useState(
    material.priceUnit ?? "per unit",
  );
  const [editLeadTime, setEditLeadTime] = useState(
    material.leadTimeDays?.toString() ?? "",
  );
  const [editNotes, setEditNotes] = useState(parsed.description);

  const updateSpec = trpc.materialSpec.update.useMutation({
    onSuccess: () => {
      toast.success("Material updated");
      setExpanded(false);
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateSpec.mutate({
      specId: material.id,
      updates: {
        pricePerUnit: editPrice ? parseFloat(editPrice) : undefined,
        priceUnit: editPriceUnit || undefined,
        leadTimeDays: editLeadTime ? parseInt(editLeadTime) : undefined,
      },
    });
  };

  const epdStatus = toBool(material.hasEpd)
    ? "verified"
    : material.status === "pending"
      ? "pending"
      : "none";

  const certBadges = [
    toBool(material.hasEpd) && "EPD",
    toBool(material.hasHpd) && "HPD",
    toBool(material.hasFsc) && "FSC",
    toBool(material.hasC2c) && "C2C",
    toBool(material.hasGreenguard) && "GG",
    toBool(material.hasDeclare) && "Declare",
  ].filter(Boolean);

  return (
    <>
      {/* Main row */}
      <tr
        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-[#2D6A4F]" />
            </div>
            <div>
              <p className="font-medium text-foreground">{parsed.name}</p>
              {parsed.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {parsed.description}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="p-4">
          <Badge variant="outline" className="text-xs font-normal">
            {parsed.category}
          </Badge>
        </td>
        <td className="p-4">
          {material.pricePerUnit ? (
            <span className="text-sm font-mono">
              ${parseFloat(material.pricePerUnit.toString()).toFixed(2)}
              <span className="text-muted-foreground text-xs ml-1">
                {material.priceUnit || "per unit"}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </td>
        <td className="p-4">
          {material.leadTimeDays ? (
            <span className="text-sm flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              {material.leadTimeDays}d
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </td>
        <td className="p-4">
          <Badge
            variant="outline"
            className={
              epdStatus === "verified"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : epdStatus === "pending"
                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  : "bg-gray-100 text-gray-500 border-gray-200"
            }
          >
            {epdStatus === "verified"
              ? "Verified"
              : epdStatus === "pending"
                ? "Pending"
                : "None"}
          </Badge>
          {certBadges.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {certBadges.map((b) => (
                <span
                  key={b as string}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#2D6A4F]/10 text-[#2D6A4F] font-medium"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </td>
        {/* ── Credit Score column ── */}
        <td className="p-4">
          <div className="flex flex-col gap-1">
            <McsScoreBadge score={score} />
            {score?.topTip && score.total < 70 && (
              <p className="text-[10px] text-muted-foreground max-w-[140px] leading-tight">
                {score.topTip}
              </p>
            )}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onEpdSubmit(parsed.name, material.materialId);
              }}
            >
              <ShieldCheck className="w-3 h-3" /> EPD
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Edit
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded edit row */}
      {expanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Price per Unit
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Input
                    value={editPriceUnit}
                    onChange={(e) => setEditPriceUnit(e.target.value)}
                    placeholder="per unit"
                    className="w-28"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Lead Time (days)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={editLeadTime}
                  onChange={(e) => setEditLeadTime(e.target.value)}
                  placeholder="e.g. 14"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(false)}
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#2D6A4F] hover:bg-[#245a42]"
                onClick={handleSave}
                disabled={updateSpec.isPending}
              >
                {updateSpec.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Mobile Card ──────────────────────────────────────────────────────────────

function MaterialCard({
  material,
  score,
  onEpdSubmit,
  onUpdated,
}: {
  material: MaterialRow;
  score?: McsScore;
  onEpdSubmit: (name: string, id: number) => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const parsed = parseName(material.notes);
  const [editPrice, setEditPrice] = useState(
    material.pricePerUnit?.toString() ?? "",
  );
  const [editLeadTime, setEditLeadTime] = useState(
    material.leadTimeDays?.toString() ?? "",
  );

  const updateSpec = trpc.materialSpec.update.useMutation({
    onSuccess: () => {
      toast.success("Material updated");
      setEditing(false);
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const epdStatus = toBool(material.hasEpd)
    ? "verified"
    : material.status === "pending"
      ? "pending"
      : "none";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-[#2D6A4F]" />
          </div>
          <div>
            <p className="font-medium text-foreground">{parsed.name}</p>
            <Badge variant="outline" className="text-xs mt-0.5">
              {parsed.category}
            </Badge>
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            epdStatus === "verified"
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : epdStatus === "pending"
                ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                : "bg-gray-100 text-gray-500 border-gray-200"
          }
        >
          {epdStatus === "verified"
            ? "Verified"
            : epdStatus === "pending"
              ? "Pending"
              : "No EPD"}
        </Badge>
      </div>

      {/* MCS score strip */}
      {score && (
        <div className="flex items-center gap-3 py-2 px-3 my-2 rounded-lg bg-muted/40 border border-border/40">
          <McsScoreBadge score={score} />
          {score.topTip && score.total < 70 ? (
            <p className="text-xs text-muted-foreground leading-snug flex-1">{score.topTip}</p>
          ) : (
            <p className="text-xs text-green-600 font-medium">Good standing</p>
          )}
          <Link href={`/materials/${material.materialId}/score`}>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0">Full report →</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          {material.pricePerUnit ? (
            <span>
              ${parseFloat(material.pricePerUnit.toString()).toFixed(2)}{" "}
              {material.priceUnit || "per unit"}
            </span>
          ) : (
            <span className="text-muted-foreground">No price set</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {material.leadTimeDays ? (
            <span>{material.leadTimeDays} days</span>
          ) : (
            <span className="text-muted-foreground">No lead time</span>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs">Price per Unit</Label>
            <Input
              type="number"
              step="0.01"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lead Time (days)</Label>
            <Input
              type="number"
              min="1"
              value={editLeadTime}
              onChange={(e) => setEditLeadTime(e.target.value)}
              placeholder="14"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-[#2D6A4F] hover:bg-[#245a42]"
              onClick={() =>
                updateSpec.mutate({
                  specId: material.id,
                  updates: {
                    pricePerUnit: editPrice
                      ? parseFloat(editPrice)
                      : undefined,
                    leadTimeDays: editLeadTime
                      ? parseInt(editLeadTime)
                      : undefined,
                  },
                })
              }
              disabled={updateSpec.isPending}
            >
              {updateSpec.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setEditing(true)}
          >
            <Edit3 className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onEpdSubmit(parsed.name, material.materialId)}
          >
            <ShieldCheck className="w-3 h-3 mr-1" /> EPD
          </Button>
        </div>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function SupplierMaterials() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [epdModal, setEpdModal] = useState<{
    open: boolean;
    materialId?: number;
    materialName?: string;
  }>({ open: false });
  const [page, setPage] = useState(0);

  // Fetch supplier profile to get supplierId
  const { data: profile, isLoading: profileLoading } =
    trpc.supplierOnboarding.getMyProfile.useQuery(undefined, {
      enabled: !!user,
    });

  // Fetch supplier's material specs
  const {
    data: specs = [],
    isLoading: specsLoading,
    refetch: refetchSpecs,
  } = trpc.materialSpec.getBySupplier.useQuery(
    { supplierId: profile?.id ?? 0 },
    { enabled: !!profile?.id, staleTime: 60_000 },
  );

  // Fetch supplier EPDs
  const { data: myEpds = [], isLoading: epdsLoading } =
    trpc.epd.listMine.useQuery(undefined, {
      enabled: !!user,
      staleTime: 60_000,
    });

  // Fetch Material Credit Scores for all materials in one batch call
  const { data: scoresRaw = [] } = trpc.materials.getScoresForSupplier.useQuery(
    { supplierId: profile?.id ?? 0 },
    { enabled: !!profile?.id, staleTime: 5 * 60_000 }
  );

  // Index scores by materialId for O(1) lookup in rows
  const scoreMap = useMemo(() => {
    const map = new Map<number, McsScore>();
    for (const s of scoresRaw) map.set(s.materialId, s as McsScore);
    return map;
  }, [scoresRaw]);

  const isLoading = profileLoading || specsLoading || epdsLoading;

  // Combine specs + EPDs into a unified list
  const allMaterials: MaterialRow[] = useMemo(() => {
    return specs.map((s: any) => ({
      id: s.id,
      materialId: s.materialId,
      supplierId: s.supplierId,
      notes: s.notes,
      pricePerUnit: s.pricePerUnit,
      priceUnit: s.priceUnit,
      leadTimeDays: s.leadTimeDays,
      hasEpd: s.hasEpd,
      hasHpd: s.hasHpd,
      hasFsc: s.hasFsc,
      hasC2c: s.hasC2c,
      hasGreenguard: s.hasGreenguard,
      hasDeclare: s.hasDeclare,
      recycledContentPct: s.recycledContentPct,
      status: s.status,
      createdAt: s.createdAt,
    }));
  }, [specs]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return allMaterials;
    const q = search.toLowerCase();
    return allMaterials.filter((m) => {
      const parsed = parseName(m.notes);
      return (
        parsed.name.toLowerCase().includes(q) ||
        parsed.category.toLowerCase().includes(q)
      );
    });
  }, [allMaterials, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats
  const verifiedEpds = myEpds.filter((e: any) => e.status === "approved");
  const pendingEpds = myEpds.filter((e: any) => e.status === "pending");

  const openEpdModal = (materialName?: string, materialId?: number) =>
    setEpdModal({ open: true, materialId, materialName });
  const closeEpdModal = () => {
    setEpdModal({ open: false });
    refetchSpecs();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              My Materials & EPDs
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your material catalog and EPD documentation.
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
              className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#245a42]"
              onClick={() => setAddDialogOpen(true)}
              disabled={!profile?.id}
            >
              <Plus className="w-4 h-4" />
              Add Material
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#2D6A4F]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Materials</p>
                <p className="text-2xl font-bold">{allMaterials.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified EPDs</p>
                <p className="text-2xl font-bold">{verifiedEpds.length}</p>
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
                <p className="text-2xl font-bold">{pendingEpds.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                {(() => {
                  const scores = scoresRaw.map((s) => s.total);
                  const avg = scores.length
                    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                    : null;
                  const color =
                    avg === null ? "text-foreground"
                    : avg >= 70 ? "text-green-600"
                    : avg >= 40 ? "text-amber-600"
                    : "text-red-500";
                  return (
                    <>
                      <p className="text-sm text-muted-foreground">Avg. Credit Score</p>
                      <p className={`text-2xl font-bold ${color}`}>
                        {avg ?? "—"}
                        {avg !== null && <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </Card>
        </div>

        {/* Score Lab alert — surfaces materials that need attention */}
        {(() => {
          const lowScorers = scoresRaw.filter((s) => s.total < 50);
          if (lowScorers.length === 0) return null;
          return (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {lowScorers.length} material{lowScorers.length > 1 ? "s" : ""} with a Credit Score below 50
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Low scores reduce your visibility to architects searching the marketplace. The biggest wins are usually adding a verified EPD and completing your product data.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {lowScorers.slice(0, 5).map((s) => (
                    <Link key={s.materialId} href={`/materials/${s.materialId}/score`}>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 transition-colors cursor-pointer border border-amber-200 dark:border-amber-700">
                        {s.materialName.length > 28 ? s.materialName.slice(0, 25) + "…" : s.materialName}
                        <span className="font-bold">{s.total}</span>
                      </span>
                    </Link>
                  ))}
                  {lowScorers.length > 5 && (
                    <span className="text-xs text-amber-700 dark:text-amber-400 self-center">
                      +{lowScorers.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search materials by name or category..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>

        {/* Loading */}
        {isLoading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#2D6A4F]" />
            <p className="text-sm text-muted-foreground">
              Loading your materials...
            </p>
          </Card>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {search ? "No materials match your search" : "No materials yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {search
                ? "Try adjusting your search terms."
                : "Add your first material to make it visible to architects on the GreenChainz marketplace."}
            </p>
            {!search && (
              <div className="flex justify-center gap-3">
                <Button
                  className="bg-[#2D6A4F] hover:bg-[#245a42]"
                  onClick={() => setAddDialogOpen(true)}
                  disabled={!profile?.id}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Your First Material
                </Button>
                <Link href="/supplier/upload">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        Category
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        Price/Unit
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        Lead Time
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        EPD Status
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        Credit Score
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((mat) => (
                      <InlineEditRow
                        key={mat.id}
                        material={mat}
                        score={scoreMap.get(mat.materialId)}
                        onEpdSubmit={openEpdModal}
                        onUpdated={refetchSpecs}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {paginated.map((mat) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  score={scoreMap.get(mat.materialId)}
                  onEpdSubmit={openEpdModal}
                  onUpdated={refetchSpecs}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length} materials
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Dialogs */}
      {profile?.id && (
        <AddMaterialDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          supplierId={profile.id}
          onSuccess={refetchSpecs}
        />
      )}

      <EpdSubmitModal
        open={epdModal.open}
        onClose={closeEpdModal}
        materialId={epdModal.materialId}
        materialName={epdModal.materialName}
      />
    </div>
  );
}
