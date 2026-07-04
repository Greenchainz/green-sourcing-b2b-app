/**
 * SupplierResponseForm
 *
 * Dynamically renders a response form from the buyer's responseFieldSchema.
 * Each field type maps to the appropriate input control.
 * Submitted values are keyed by field.key for structured storage in fieldValues JSON.
 */

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, AlertCircle, CheckCircle2, PackageCheck, Upload, Link as LinkIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { SupplierResponseField } from "./SmartRfxRecommendationCard";

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "💰 Commercial",
  sustainability: "🌿 Sustainability",
  logistics: "🚚 Logistics",
  qualification: "🏅 Qualification",
  documentation: "📄 Documentation",
  technical: "⚙️ Technical",
};

interface Props {
  rfqId: number;
  projectName: string;
  fieldSchema: SupplierResponseField[];
  existingResponse?: Record<string, unknown>;
  onSubmitted?: (bidId: number, score: number) => void;
}

export function SupplierResponseForm({
  rfqId,
  projectName,
  fieldSchema,
  existingResponse,
  onSubmitted,
}: Props) {
  const [canFulfill, setCanFulfill] = useState<boolean>(true);

  // Initialize boolean fields to their explicit defaults so required-field validation
  // never blocks on "untouched" boolean fields (undefined ≠ false in the validator).
  // can_fulfill starts true to match the top-level toggle default.
  const [values, setValues] = useState<Record<string, string | boolean | number>>(() => {
    if (existingResponse) return existingResponse as Record<string, string | boolean | number>;
    const init: Record<string, string | boolean | number> = {};
    fieldSchema.forEach((f) => {
      if (f.fieldType === "boolean") {
        init[f.key] = f.key === "can_fulfill" ? true : false;
      }
    });
    return init;
  });
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.supplierResponse.submitStructured.useMutation({
    onSuccess: (data) => {
      toast.success(`Response submitted! Score: ${data.score}/100`);
      setSubmitted(true);
      onSubmitted?.(data.bidId, data.score);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to submit response");
    },
  });

  const setValue = (key: string, val: string | boolean | number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  // Group fields by category, excluding can_fulfill (handled by the top-level toggle).
  const byCategory = fieldSchema
    .filter((f) => f.key !== "can_fulfill")
    .reduce<Record<string, SupplierResponseField[]>>((acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missing = fieldSchema
      .filter((f) => f.required && !values[f.key] && values[f.key] !== false && values[f.key] !== 0)
      .map((f) => f.label);

    if (missing.length > 0) {
      toast.error(`Please fill in required fields: ${missing.join(", ")}`);
      return;
    }

    const bidPrice = values["unit_price"] ? Number(values["unit_price"]) : undefined;
    const leadDays = values["lead_time_days"] ? Number(values["lead_time_days"]) : undefined;
    const gwpValue = values["gwp_value"] ? Number(values["gwp_value"]) : undefined;
    const epdReference = values["epd_reference"] ? String(values["epd_reference"]) : undefined;

    await submitMutation.mutateAsync({
      rfqId,
      canFulfill,
      bidPrice,
      leadDays,
      gwpValue,
      epdReference,
      notes: additionalNotes.trim() || undefined,
      fieldValues: values as Record<string, unknown>,
    });
  };

  if (submitted) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
            Response submitted!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-400">
            The buyer will review your response. You can update your submission anytime.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Can fulfill? */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Can you fulfill this request?</p>
              <p className="text-sm text-muted-foreground">
                For: <span className="font-medium">{projectName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${canFulfill ? "text-green-600" : "text-red-500"}`}>
                {canFulfill ? "Yes" : "No"}
              </span>
              <Switch
                checked={canFulfill}
                onCheckedChange={(v) => {
                  setCanFulfill(v);
                  setValue("can_fulfill", v); // keep values in sync for validation
                }}
              />
            </div>
          </div>
          {!canFulfill && (
            <Alert className="mt-3 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                You can still submit to let the buyer know and provide notes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dynamic fields by category */}
      {Object.entries(byCategory).map(([cat, catFields]) => (
        <Card key={cat}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABELS[cat] ?? cat}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {catFields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={(v) => setValue(f.key, v)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Notes */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <Label htmlFor="notes">Additional notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Anything else the buyer should know..."
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={submitMutation.isPending}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base"
      >
        {submitMutation.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Send className="w-5 h-5 mr-2" />
        )}
        Submit response
      </Button>
    </form>
  );
}

// ─── Individual field renderer ────────────────────────────────────────────────

interface FieldInputProps {
  field: SupplierResponseField;
  value: string | boolean | number | undefined;
  onChange: (v: string | boolean | number) => void;
}

async function uploadSupplierResponseFile(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Upload failed";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      // Preserve fallback message when response body is not JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { url?: string; filename?: string };
  if (!payload.url) {
    throw new Error("Upload completed but no file URL was returned");
  }

  return {
    url: payload.url,
    filename: payload.filename ?? file.name,
  };
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const id = `field-${field.key}`;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string>("");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
        </Label>
        {field.required && (
          <Badge variant="outline" className="text-xs text-red-500 border-red-200 py-0">
            required
          </Badge>
        )}
      </div>

      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}

      {field.fieldType === "boolean" ? (
        <div className="flex items-center gap-2">
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(v) => onChange(v)}
          />
          <Label htmlFor={id} className="text-sm cursor-pointer">
            {Boolean(value) ? "Yes" : "No"}
          </Label>
        </div>
      ) : field.fieldType === "number" || field.fieldType === "currency" ? (
        <div className="relative">
          {field.fieldType === "currency" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
          )}
          <Input
            id={id}
            type="number"
            min={0}
            step={field.fieldType === "currency" ? "0.01" : "1"}
            value={value == null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            className={field.fieldType === "currency" ? "pl-7" : ""}
            placeholder={field.fieldType === "currency" ? "0.00" : "0"}
          />
        </div>
      ) : field.fieldType === "date" ? (
        <Input
          id={id}
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.fieldType === "file" ? (
        <div className="border border-dashed border-border rounded-lg p-4 text-center">
          <PackageCheck className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-3">
            Upload a supporting document (EPD, submittal, datasheet) or paste a URL.
          </p>
          <input
            ref={fileInputRef}
            id={id}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be 10MB or less");
                e.target.value = "";
                return;
              }

              setIsUploadingFile(true);
              try {
                const uploaded = await uploadSupplierResponseFile(file);
                setUploadedFilename(uploaded.filename);
                onChange(uploaded.url);
                toast.success("File uploaded");
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to upload file";
                toast.error(message);
              } finally {
                setIsUploadingFile(false);
                e.target.value = "";
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="mb-3"
            disabled={isUploadingFile}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingFile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload file
              </>
            )}
          </Button>
          {typeof value === "string" && value.trim().length > 0 && (
            <div className="mb-3 text-xs text-muted-foreground break-all flex items-center justify-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
              <a href={value} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {uploadedFilename || value}
              </a>
            </div>
          )}
          <Input
            type="url"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... or EPD registration number"
            className="text-sm"
          />
        </div>
      ) : field.fieldType === "url" ? (
        <Input
          id={id}
          type="url"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      ) : (
        /* text / select */
        <Input
          id={id}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.helpText ?? `Enter ${field.label.toLowerCase()}`}
        />
      )}
    </div>
  );
}
