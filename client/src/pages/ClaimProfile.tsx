/**
 * ClaimProfile — the landing page for supplier claim emails.
 *
 * URL: /suppliers/claim?token=<uuid>
 *
 * The token comes from a CRM outreach email. This page:
 *  1. Verifies the token and shows the FOMO preview (company name, EPD status)
 *  2. Lets the supplier submit their name + email to "claim" the profile
 *  3. Advances the CRM contact to "engaged" so an admin follows up with account setup
 */

import { useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { trackGoogleEvent } from "@/lib/analytics";
import { trackEvent as trackAiEvent } from "@/lib/appInsights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle2,
  ShieldCheck,
  Eye,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function ClaimProfile() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // UTM attribution carried on the claim link from the outreach email.
  const readUtm = () => ({
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_content: params.get("utm_content") ?? "",
  });

  const { data, isLoading, error } = trpc.crm.claim.verify.useQuery(
    { token },
    { enabled: token.length > 0, retry: false }
  );

  // Fire a funnel "viewed" event once, when a valid token resolves a profile,
  // so claim-rate (claimed / viewed) is measurable in GA + App Insights.
  const viewTracked = useRef(false);
  useEffect(() => {
    if (data && !viewTracked.current) {
      viewTracked.current = true;
      const payload = { ...readUtm(), has_epd: Boolean(data.hasEpd) };
      trackGoogleEvent("claim_profile_viewed", payload);
      trackAiEvent("ClaimProfileViewed", payload);
    }
    // readUtm only reads stable query params; keyed on data intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const claim = trpc.crm.claim.complete.useMutation({
    onSuccess: (result) => {
      setSubmitted(true);
      // The money moment: a supplier claimed their profile. Track it as a
      // conversion so it can be measured against the viewed event above.
      const payload = { ...readUtm(), company: result.companyName };
      trackGoogleEvent("supplier_profile_claimed", payload);
      trackAiEvent("SupplierProfileClaimed", payload);
      toast.success(`Profile claimed for ${result.companyName}! We'll be in touch shortly.`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    claim.mutate({ token, contactName: name, email });
  };

  if (!token) {
    return <InvalidLink message="No claim token found in this link." />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return <InvalidLink message={error.message} />;
  }

  if (submitted) {
    return <SuccessScreen companyName={data?.companyName ?? "your company"} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-lg">GreenChainz</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Your profile is ready to claim</h1>
        <p className="text-gray-500 mt-1 text-sm">
          We've built a listing for <strong>{data?.companyName}</strong> from publicly available data.
          Claim it to control how you appear to specifying architects.
        </p>
      </div>

      {/* Preview card */}
      <Card className="w-full max-w-lg mb-6 border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base flex items-center gap-2 text-gray-800">
            <Eye className="h-4 w-4 text-green-600" />
            Your unclaimed profile preview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Company</span>
            <span className="text-sm font-medium text-gray-900">{data?.companyName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Category</span>
            <span className="text-sm font-medium text-gray-900">{data?.category ?? "Sustainable Materials"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">EPD on file</span>
            {data?.hasEpd ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <Lock className="h-3 w-3" /> Not uploaded
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Architect visibility</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <Lock className="h-3 w-3" /> Locked until claimed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Claim form */}
      <Card className="w-full max-w-lg border border-green-200 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Your name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={data?.prefillEmail ?? "you@yourcompany.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
              disabled={claim.isPending}
            >
              {claim.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Claim {data?.companyName} on GreenChainz
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Free to claim. Our team will reach out within one business day to complete setup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InvalidLink({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Link expired or invalid</h2>
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
      <p className="text-sm text-gray-400 mt-4">
        Contact <a href="mailto:hello@greenchainz.com" className="underline">hello@greenchainz.com</a> if you need a new link.
      </p>
    </div>
  );
}

function SuccessScreen({ companyName }: { companyName: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Claim received!</h2>
      <p className="text-gray-600 max-w-sm">
        We've received your claim for <strong>{companyName}</strong>. Check your email for a
        confirmation with next steps. Our team will review and verify your credentials — once
        approved, your profile will go live in the catalog.
      </p>
      <p className="text-xs text-gray-400 mt-6">
        Questions? Email <a href="mailto:hello@greenchainz.com" className="underline">hello@greenchainz.com</a>
      </p>
    </div>
  );
}
