import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

  const { data: materials } = trpc.materials.list.useQuery({ search: "", category: "" });
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

      alert(`RFQ #${result.rfqId} has been created and suppliers have been matched.`);

      reset();
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to create RFQ"}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={() => setIsOpen(true)} className="w-full">
        Create New RFQ
      </Button>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Request for Quotation</DialogTitle>
          <DialogDescription>Add project details and materials to get supplier quotes</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                {errors.projectName && <p className="text-sm text-red-500 mt-1">{errors.projectName.message}</p>}
              </div>

              <div>
                <Label htmlFor="projectLocation">Project Location *</Label>
                <Input
                  id="projectLocation"
                  placeholder="e.g., San Francisco, CA"
                  {...register("projectLocation")}
                  className={errors.projectLocation ? "border-red-500" : ""}
                />
                {errors.projectLocation && <p className="text-sm text-red-500 mt-1">{errors.projectLocation.message}</p>}
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" {...register("dueDate", { valueAsDate: true })} />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requirements or notes for suppliers..."
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
                <div key={field.id} className="flex gap-3 items-end pb-3 border-b last:border-b-0">
                  <div className="flex-1">
                    <Label>Material</Label>
                    <Select defaultValue={String(field.materialId)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials?.items?.map((mat: any) => (
                          <SelectItem key={mat.id} value={String(mat.id)}>
                            {mat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      {...register(`materials.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="w-28">
                    <Label>Unit</Label>
                    <Select defaultValue="units">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="tons">Tons</SelectItem>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="m3">m³</SelectItem>
                        <SelectItem value="lf">LF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700"
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
                setIsOpen(false);
                onCancel?.();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                "Create RFQ"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
