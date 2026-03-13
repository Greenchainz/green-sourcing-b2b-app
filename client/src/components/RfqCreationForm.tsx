import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const rfqFormSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  projectLocation: z.string().min(1, "Project location is required"),
  projectType: z.string().optional(),
  materials: z
    .array(
      z.object({
        materialId: z.number().min(1, "Material is required"),
        quantity: z.number().positive("Quantity must be positive"),
        quantityUnit: z.string().min(1, "Unit is required"),
      })
    )
    .min(1, "At least one material is required"),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  buyerPersona: z.string().optional(),
});

type RfqFormData = z.infer<typeof rfqFormSchema>;

interface RfqCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RfqCreationForm({ onSuccess, onCancel }: RfqCreationFormProps) {
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch materials list — returns { items: [], total: number }
  const { data: materialsData } = trpc.materials.list.useQuery({
    search: "",
    category: "",
    limit: 100,
  });
  const materialsList = materialsData?.items ?? [];

  const submitRfq = trpc.rfqMarketplace.submit.useMutation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RfqFormData>({
    resolver: zodResolver(rfqFormSchema),
    defaultValues: {
      materials: [{ materialId: 0, quantity: 1, quantityUnit: "units" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  });

  const onSubmit = async (data: RfqFormData) => {
    setSubmitStatus(null);
    try {
      const result = await submitRfq.mutateAsync({
        projectName: data.projectName,
        projectLocation: data.projectLocation,
        projectType: data.projectType,
        materials: data.materials,
        dueDate: data.dueDate,
        notes: data.notes,
        buyerPersona: data.buyerPersona,
      });

      setSubmitStatus({
        type: "success",
        message: `RFQ #${result.rfqId} created. ${result.matchedSuppliers?.length ?? 0} suppliers matched.`,
      });

      reset();
      setTimeout(() => {
        setSubmitStatus(null);
        onSuccess?.();
      }, 2000);
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create RFQ",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Status message */}
      {submitStatus && (
        <div
          className={`flex items-center gap-2 p-3 rounded-md ${
            submitStatus.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {submitStatus.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm">{submitStatus.message}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              placeholder="e.g., Downtown Office Building"
              {...register("projectName")}
              className={errors.projectName ? "border-red-500" : ""}
            />
            {errors.projectName && (
              <p className="text-sm text-red-500 mt-1">{errors.projectName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="projectLocation">Project Location *</Label>
            <Input
              id="projectLocation"
              placeholder="e.g., San Francisco, CA"
              {...register("projectLocation")}
              className={errors.projectLocation ? "border-red-500" : ""}
            />
            {errors.projectLocation && (
              <p className="text-sm text-red-500 mt-1">{errors.projectLocation.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="projectType">Project Type</Label>
            <Controller
              name="projectType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="dueDate">Response Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate", { valueAsDate: true })}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements, certifications needed, or notes for suppliers..."
              {...register("notes")}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Materials *</CardTitle>
          <CardDescription>Add materials you need quotes for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex gap-3 items-end pb-3 border-b last:border-b-0"
            >
              <div className="flex-1">
                <Label>Material</Label>
                <Controller
                  name={`materials.${index}.materialId`}
                  control={control}
                  render={({ field: f }) => (
                    <Select
                      onValueChange={(val) => f.onChange(Number(val))}
                      value={f.value ? String(f.value) : ""}
                    >
                      <SelectTrigger
                        className={
                          errors.materials?.[index]?.materialId ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialsList.map((mat: any) => (
                          <SelectItem key={mat.id} value={String(mat.id)}>
                            {mat.name || mat.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="w-24">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="1"
                  min={0.01}
                  step="any"
                  {...register(`materials.${index}.quantity`, { valueAsNumber: true })}
                  className={
                    errors.materials?.[index]?.quantity ? "border-red-500" : ""
                  }
                />
              </div>

              <div className="w-28">
                <Label>Unit</Label>
                <Controller
                  name={`materials.${index}.quantityUnit`}
                  control={control}
                  render={({ field: f }) => (
                    <Select onValueChange={f.onChange} value={f.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="tons">Tons</SelectItem>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="m3">m³</SelectItem>
                        <SelectItem value="lf">LF</SelectItem>
                        <SelectItem value="sf">SF</SelectItem>
                        <SelectItem value="cy">CY</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="text-red-500 hover:text-red-700 disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ materialId: 0, quantity: 1, quantityUnit: "units" })}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Material
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onCancel?.();
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating RFQ...
            </>
          ) : (
            "Create RFQ"
          )}
        </Button>
      </div>
    </form>
  );
}
