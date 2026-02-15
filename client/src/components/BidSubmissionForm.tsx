import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BidSubmissionFormProps {
  rfqId: number;
  onSuccess?: () => void;
  existingBid?: {
    id: number;
    bidPrice: string;
    leadDays: number;
    notes?: string;
  };
}

export function BidSubmissionForm({
  rfqId,
  onSuccess,
  existingBid,
}: BidSubmissionFormProps) {
  const [bidPrice, setBidPrice] = useState<string>(existingBid?.bidPrice || "");
  const [leadDays, setLeadDays] = useState<string>(
    existingBid?.leadDays?.toString() || ""
  );
  const [notes, setNotes] = useState<string>(existingBid?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const submitBidMutation = trpc.supplierRfq.submitBid.useMutation();
  const updateBidMutation = trpc.supplierRfq.updateBid.useMutation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!bidPrice || bidPrice.trim() === "") {
      newErrors.bidPrice = "Bid price is required";
    } else if (isNaN(Number(bidPrice)) || Number(bidPrice) <= 0) {
      newErrors.bidPrice = "Bid price must be a positive number";
    }

    if (!leadDays || leadDays.trim() === "") {
      newErrors.leadDays = "Lead days is required";
    } else if (isNaN(Number(leadDays)) || Number(leadDays) <= 0) {
      newErrors.leadDays = "Lead days must be a positive number";
    } else if (Number(leadDays) > 365) {
      newErrors.leadDays = "Lead days cannot exceed 365 days";
    }

    if (notes && notes.length > 1000) {
      newErrors.notes = "Notes cannot exceed 1000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      if (existingBid) {
        // Update existing bid
        await updateBidMutation.mutateAsync({
          bidId: existingBid.id,
          bidPrice: Number(bidPrice),
          leadDays: Number(leadDays),
          notes: notes || undefined,
        });
        toast.success("Bid updated successfully!");
      } else {
        // Submit new bid
        await submitBidMutation.mutateAsync({
          rfqId,
          bidPrice: Number(bidPrice),
          leadDays: Number(leadDays),
          notes: notes || undefined,
        });
        toast.success("Bid submitted successfully!");
      }

      setSubmitSuccess(true);
      setIsSubmitting(false);

      // Reset form after success
      setTimeout(() => {
        setBidPrice("");
        setLeadDays("");
        setNotes("");
        setSubmitSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      setIsSubmitting(false);
      const errorMessage =
        error?.message || "Failed to submit bid. Please try again.";
      toast.error(errorMessage);
      setErrors({ submit: errorMessage });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {existingBid ? "Update Your Bid" : "Submit Your Bid"}
        </CardTitle>
        <CardDescription>
          {existingBid
            ? "Modify your bid price, lead time, or notes"
            : "Enter your competitive bid for this RFQ"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bid Price */}
          <div className="space-y-2">
            <Label htmlFor="bidPrice" className="text-sm font-medium">
              Bid Price ($) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="bidPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={bidPrice}
                onChange={(e) => {
                  setBidPrice(e.target.value);
                  if (errors.bidPrice) {
                    setErrors({ ...errors, bidPrice: "" });
                  }
                }}
                className={`pl-8 ${
                  errors.bidPrice ? "border-red-500 focus:ring-red-500" : ""
                }`}
              />
            </div>
            {errors.bidPrice && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {errors.bidPrice}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Enter your total bid price for this RFQ
            </p>
          </div>

          {/* Lead Days */}
          <div className="space-y-2">
            <Label htmlFor="leadDays" className="text-sm font-medium">
              Lead Time (Days) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="leadDays"
              type="number"
              min="1"
              max="365"
              placeholder="14"
              value={leadDays}
              onChange={(e) => {
                setLeadDays(e.target.value);
                if (errors.leadDays) {
                  setErrors({ ...errors, leadDays: "" });
                }
              }}
              className={`${
                errors.leadDays ? "border-red-500 focus:ring-red-500" : ""
              }`}
            />
            {errors.leadDays && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {errors.leadDays}
              </div>
            )}
            <p className="text-xs text-gray-500">
              How many days until you can deliver?
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about your bid, delivery options, certifications, or special conditions..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (errors.notes) {
                  setErrors({ ...errors, notes: "" });
                }
              }}
              maxLength={1000}
              rows={4}
              className={`resize-none ${
                errors.notes ? "border-red-500 focus:ring-red-500" : ""
              }`}
            />
            <div className="flex justify-between items-center">
              {errors.notes && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {errors.notes}
                </div>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {notes.length}/1000 characters
              </p>
            </div>
          </div>

          {/* Error Summary */}
          {errors.submit && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Success Message */}
          {submitSuccess && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-600">
                {existingBid ? "Bid updated successfully!" : "Bid submitted successfully!"}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || submitSuccess}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {existingBid ? "Updating Bid..." : "Submitting Bid..."}
              </>
            ) : submitSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {existingBid ? "Bid Updated" : "Bid Submitted"}
              </>
            ) : (
              <>
                {existingBid ? "Update Bid" : "Submit Bid"}
              </>
            )}
          </Button>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              <strong>Tip:</strong> Make sure your bid price and lead time are competitive. Buyers can see all bids and will select the best value for their project.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
