import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Clock, CheckCircle, XCircle, Package, LogIn } from "lucide-react";
import { getLoginUrl } from "@/const";

// ── Form schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  materialType: z.string().min(1, "Material type is required"),
  quantity: z.coerce.number().positive("Enter a positive quantity"),
  specs: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Pending",   icon: Clock,         class: "bg-yellow-100 text-yellow-800" },
  accepted:  { label: "Accepted",  icon: CheckCircle,   class: "bg-green-100 text-green-800"  },
  declined:  { label: "Declined",  icon: XCircle,       class: "bg-red-100 text-red-800"      },
  fulfilled: { label: "Fulfilled", icon: CheckCircle,   class: "bg-blue-100 text-blue-800"    },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const { label, icon: Icon, class: cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge className={`flex items-center gap-1 ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RFQForm() {
  const { user, isLoading: authLoading } = useAuth();
  const [supplierSearch, setSupplierSearch] = useState("");

  // Load verified suppliers for dropdown
  const { data: suppliersData = [] } = trpc.rfqRequests.listSuppliers.useQuery(
    { search: supplierSearch || undefined },
    { staleTime: 60_000 }
  );

  // Load this architect's submitted RFQs
  const {
    data: myRfqs = [],
    refetch: refetchMine,
    isLoading: rfqsLoading,
  } = trpc.rfqRequests.listMine.useQuery(undefined, {
    enabled: !!user,
  });

  const createRfq = trpc.rfqRequests.create.useMutation({
    onSuccess: ({ id, supplierName }) => {
      toast.success(`RFQ #${id} sent to ${supplierName}`);
      reset();
      refetchMine();
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  const onSubmit = (data: FormData) => createRfq.mutate(data);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <Package className="w-12 h-12 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold">Sign in to send RFQs</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Log in to request quotes from verified sustainable suppliers.
          </p>
          <a href={getLoginUrl("/rfq-form")}>
            <Button className="bg-green-600 hover:bg-green-700">
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-4xl py-8 flex-1 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold">Request for Quotation</h1>
          <p className="text-muted-foreground mt-1">
            Send a material request directly to a verified supplier.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Submission form ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Request</CardTitle>
              <CardDescription>
                Fill in the details and submit — the supplier will be notified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Supplier */}
                <div className="space-y-1.5">
                  <Label htmlFor="supplier-search">Supplier *</Label>
                  <Input
                    id="supplier-search"
                    placeholder="Search suppliers…"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="mb-1"
                  />
                  <Select onValueChange={(val) => setValue("supplierId", Number(val))}>
                    <SelectTrigger className={errors.supplierId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliersData.length === 0 ? (
                        <SelectItem value="0" disabled>
                          No verified suppliers found
                        </SelectItem>
                      ) : (
                        suppliersData.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.companyName}
                            {s.city && s.state ? ` — ${s.city}, ${s.state}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.supplierId && (
                    <p className="text-sm text-red-500">{errors.supplierId.message}</p>
                  )}
                </div>

                {/* Material type */}
                <div className="space-y-1.5">
                  <Label htmlFor="materialType">Material Type *</Label>
                  <Input
                    id="materialType"
                    placeholder="e.g. Low-carbon concrete, Recycled steel"
                    {...register("materialType")}
                    className={errors.materialType ? "border-red-500" : ""}
                  />
                  {errors.materialType && (
                    <p className="text-sm text-red-500">{errors.materialType.message}</p>
                  )}
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 500"
                    {...register("quantity")}
                    className={errors.quantity ? "border-red-500" : ""}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-500">{errors.quantity.message}</p>
                  )}
                </div>

                {/* Specs */}
                <div className="space-y-1.5">
                  <Label htmlFor="specs">Specifications</Label>
                  <Textarea
                    id="specs"
                    placeholder="Describe performance requirements, certifications needed, delivery timeline, etc."
                    rows={4}
                    {...register("specs")}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || createRfq.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {createRfq.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Send RFQ
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ── My submitted RFQs ───────────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">My Requests</h2>

            {rfqsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading…
              </div>
            ) : myRfqs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No requests yet. Send your first RFQ above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myRfqs.map((rfq) => (
                  <Card key={rfq.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{rfq.materialType}</p>
                          <p className="text-sm text-muted-foreground">
                            {rfq.supplierName ?? `Supplier #${rfq.supplierId}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Qty: {rfq.quantity} ·{" "}
                            {new Date(rfq.createdAt).toLocaleDateString()}
                          </p>
                          {rfq.specs && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {rfq.specs}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={rfq.status as keyof typeof STATUS_CONFIG} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
