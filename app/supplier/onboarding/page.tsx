'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Building2, User, Package, Award, ClipboardCheck, CheckCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';

const MATERIAL_CATEGORIES = ['Concrete', 'Steel', 'Timber', 'Glass', 'Insulation', 'Roofing', 'Flooring', 'Cladding', 'MEP', 'Other'];
const CERTIFICATIONS = ['LEED', 'EPD', 'FSC', 'GreenGuard', 'Cradle to Cradle', 'Living Building Challenge', 'Other'];

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  materialCategories: z.array(z.string()).min(1, 'Select at least one category'),
  certifications: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { label: 'Company Info', icon: Building2 },
  { label: 'Contact', icon: User },
  { label: 'Materials', icon: Package },
  { label: 'Certifications', icon: Award },
  { label: 'Review', icon: ClipboardCheck },
];

const STEP_FIELDS: (keyof FormData)[][] = [
  ['companyName', 'website', 'description'],
  ['contactName', 'email', 'phone'],
  ['materialCategories'],
  ['certifications'],
  [],
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-10 overflow-x-auto">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-semibold transition-all ${
                  done
                    ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                    : active
                    ? 'border-[#2D6A4F] bg-white text-[#2D6A4F]'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${active ? 'text-[#2D6A4F]' : done ? 'text-[#2D6A4F]' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-4 sm:w-10 mx-0.5 transition-all ${i < current ? 'bg-[#2D6A4F]' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function CheckboxGroup({ options, value, onChange, error }: { options: string[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const toggle = (item: string) => onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item]);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <label key={opt} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${value.includes(opt) ? 'border-[#2D6A4F] bg-[#2D6A4F]/5' : 'border-gray-200'}`}>
            <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default function SupplierOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const submitMutation = trpc.supplierOnboarding.submitOnboarding.useMutation({
    onSuccess: () => {
      toast.success('Profile created! Welcome to GreenChainz.');
      router.push('/supplier/dashboard');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit profile');
    },
  });

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      description: '',
      materialCategories: [],
      certifications: [],
    },
  });

  const materialCategories = watch('materialCategories') ?? [];
  const certifications = watch('certifications') ?? [];
  const allValues = watch();

  const nextStep = async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length > 0) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Supplier Onboarding</h1>
            <p className="text-gray-600 mt-2">Join GreenChainz as a verified sustainable materials supplier.</p>
            <p className="text-xs text-gray-500 mt-1">Step {step + 1} of {STEPS.length}</p>
          </div>

          <StepIndicator current={step} />

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Company Info */}
            {step === 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <CardTitle>Company Information</CardTitle>
                      <CardDescription>Tell architects about your company.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" placeholder="Acme Green Materials" {...register('companyName')} />
                    {errors.companyName && <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" type="url" placeholder="https://example.com" {...register('website')} />
                    {errors.website && <p className="text-sm text-red-500 mt-1">{errors.website.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea id="description" placeholder="Describe your company and sustainability mission." rows={4} {...register('description')} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Contact */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <CardTitle>Contact Details</CardTitle>
                      <CardDescription>How architects can reach you.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input id="contactName" placeholder="Jane Smith" {...register('contactName')} />
                    {errors.contactName && <p className="text-sm text-red-500 mt-1">{errors.contactName.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" placeholder="jane@company.com" {...register('email')} />
                      {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" {...register('phone')} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Materials */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <CardTitle>Material Categories</CardTitle>
                      <CardDescription>Which sustainable materials do you supply? Select at least one.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CheckboxGroup options={MATERIAL_CATEGORIES} value={materialCategories} onChange={(v) => setValue('materialCategories', v, { shouldValidate: true })} error={errors.materialCategories?.message as string | undefined} />
                </CardContent>
              </Card>
            )}

            {/* Step 4: Certifications */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <CardTitle>Certifications</CardTitle>
                      <CardDescription>Select sustainability certifications your products hold.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CheckboxGroup options={CERTIFICATIONS} value={certifications} onChange={(v) => setValue('certifications', v)} />
                  <p className="text-sm text-gray-600 mt-3">Certifications are optional — you can add them later.</p>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2D6A4F]/10 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <CardTitle>Review Your Profile</CardTitle>
                      <CardDescription>Check everything looks good before submitting.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Company Name</p>
                      <p className="text-gray-600">{allValues.companyName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Contact Name</p>
                      <p className="text-gray-600">{allValues.contactName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Email</p>
                      <p className="text-gray-600">{allValues.email}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Phone</p>
                      <p className="text-gray-600">{allValues.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Website</p>
                      <p className="text-gray-600">{allValues.website || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Materials</p>
                      <p className="text-gray-600">{allValues.materialCategories.join(', ')}</p>
                    </div>
                  </div>
                  <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-lg p-4 text-sm">
                    <p className="font-medium text-[#2D6A4F]">✓ Free Trial</p>
                    <p className="text-gray-600 mt-1">You'll get 30 days free access to list your company. After that, a small monthly fee applies.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 gap-4">
              <Button variant="outline" onClick={prevStep} disabled={step === 0 || submitMutation.isPending}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep} disabled={submitMutation.isPending}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit(onSubmit)} disabled={submitMutation.isPending} className="bg-[#2D6A4F] hover:bg-[#1d4a39]">
                  {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Profile
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
