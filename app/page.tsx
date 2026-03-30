'use client'

// app/supplier/onboarding/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  Boxes,
  Award,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'

// ── Zod schema (mirrors supplierOnboardingRouter input) ──────────────────────
const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Valid email required'),
  website: z.string().url('Enter a valid URL (include https://)').optional().or(z.literal('')),
  phone: z.string().optional(),
  description: z.string().min(20, 'Please write at least 20 characters').max(500),
  materialCategories: z.array(z.string()).min(1, 'Select at least one category'),
  certifications: z.array(z.string()),
  sustainabilityGoals: z.string().optional(),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

const MATERIAL_CATEGORIES = [
  { id: 'concrete', label: 'Concrete & Masonry' },
  { id: 'steel', label: 'Steel & Metal' },
  { id: 'timber', label: 'Timber & Wood' },
  { id: 'glass', label: 'Glass & Glazing' },
  { id: 'insulation', label: 'Insulation' },
  { id: 'roofing', label: 'Roofing' },
  { id: 'flooring', label: 'Flooring' },
  { id: 'cladding', label: 'Cladding & Facades' },
  { id: 'mep', label: 'MEP Systems' },
  { id: 'finishes', label: 'Interior Finishes' },
  { id: 'landscaping', label: 'Landscaping & Sitework' },
  { id: 'other', label: 'Other' },
]

const CERTIFICATION_OPTIONS = [
  { id: 'epd', label: 'EPD (Environmental Product Declaration)' },
  { id: 'leed', label: 'LEED Compliant' },
  { id: 'fsc', label: 'FSC Certified' },
  { id: 'greenguard', label: 'GREENGUARD' },
  { id: 'cradle_to_cradle', label: 'Cradle to Cradle' },
  { id: 'declare', label: 'Declare Label' },
  { id: 'living_product', label: 'Living Product Challenge' },
  { id: 'health_product', label: 'Health Product Declaration (HPD)' },
]

const STEPS = [
  { label: 'Company Info', icon: Building2 },
  { label: 'Materials', icon: Boxes },
  { label: 'Certifications', icon: Award },
]

const STEP_FIELDS: (keyof OnboardingForm)[][] = [
  ['companyName', 'contactName', 'email', 'description'],
  ['materialCategories'],
  [],
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const done = idx < current
        const active = idx === current
        return (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : done
                  ? 'bg-green-900/30 text-green-600 border border-green-900/40'
                  : 'bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-8 h-px ${done ? 'bg-green-700' : 'bg-[#2a2a2a]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SupplierOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  const submitOnboarding = trpc.supplierOnboarding.submitOnboarding.useMutation({
    onSuccess: () => setCompleted(true),
    onError: (err) => toast.error(err.message ?? 'Something went wrong. Please try again.'),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      email: '',
      website: '',
      phone: '',
      description: '',
      materialCategories: [],
      certifications: [],
      sustainabilityGoals: '',
    },
  })

  const materialCategories = watch('materialCategories')
  const certifications = watch('certifications')

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step])
    if (valid) setStep((s) => s + 1)
  }

  function toggleArray(field: 'materialCategories' | 'certifications', value: string) {
    const current = getValues(field)
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setValue(field, next, { shouldValidate: true })
  }

  function onSubmit(data: OnboardingForm) {
    submitOnboarding.mutate({
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      website: data.website || null,
      phone: data.phone || null,
      description: data.description,
      materialCategories: data.materialCategories,
      certifications: data.certifications,
      sustainabilityGoals: data.sustainabilityGoals || null,
    })
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">You're on the map.</h1>
          <p className="text-gray-400 mb-2">
            Your profile is submitted and under review. Verification typically takes{' '}
            <span className="text-white font-medium">24–48 hours</span>.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Once verified, architects sourcing on GreenChainz will be able to find and specify your materials.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push('/supplier')}
              className="bg-green-600 hover:bg-green-500 text-white w-full"
            >
              Go to Supplier Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/supplier/products')}
              className="text-gray-400 hover:text-white w-full"
            >
              Add Your Products Now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 mb-4">
            Supplier Setup
          </span>
          <h1 className="text-2xl font-bold text-white mb-2">Tell architects who you are</h1>
          <p className="text-gray-400 text-sm">
            Takes about 5 minutes. Your profile is what architects see when sourcing sustainable
            materials for LEED, WELL, and green building specs.
          </p>
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 mb-6">

            {/* Step 0 — Company Info */}
            {step === 0 && (
              <div className="flex flex-col gap-5">
                <h2 className="text-white font-semibold text-lg">Company Information</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm mb-1.5 block">Company Name *</Label>
                    <Input
                      {...register('companyName')}
                      placeholder="Acme Green Materials"
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500"
                    />
                    {errors.companyName && (
                      <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.companyName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm mb-1.5 block">Your Name *</Label>
                    <Input
                      {...register('contactName')}
                      placeholder="Jane Smith"
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500"
                    />
                    {errors.contactName && (
                      <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.contactName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm mb-1.5 block">Business Email *</Label>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="jane@acmematerials.com"
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm mb-1.5 block">Phone</Label>
                    <Input
                      {...register('phone')}
                      placeholder="(555) 000-0000"
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">Website</Label>
                  <Input
                    {...register('website')}
                    placeholder="https://acmematerials.com"
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500"
                  />
                  {errors.website && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.website.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">
                    Company Description *{' '}
                    <span className="text-gray-600 font-normal">(what architects see)</span>
                  </Label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    placeholder="Describe your company, what makes your materials sustainable, and who you typically work with..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500 rounded-md px-3 py-2 text-sm resize-none outline-none"
                  />
                  {errors.description && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1 — Material Categories */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-white font-semibold text-lg">Material Categories</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Select every category you supply. These help architects filter and trust your materials.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MATERIAL_CATEGORIES.map((cat) => {
                    const checked = materialCategories.includes(cat.id)
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          checked
                            ? 'border-green-500/50 bg-green-500/10 text-white'
                            : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:border-[#3a3a3a]'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleArray('materialCategories', cat.id)}
                          className="border-[#444] data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        <span className="text-sm">{cat.label}</span>
                      </label>
                    )
                  })}
                </div>
                {errors.materialCategories && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.materialCategories.message}
                  </p>
                )}
              </div>
            )}

            {/* Step 2 — Certifications */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-white font-semibold text-lg">Certifications & Standards</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Select any that apply. You can add documentation and more certifications later.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {CERTIFICATION_OPTIONS.map((cert) => {
                    const checked = certifications.includes(cert.id)
                    return (
                      <label
                        key={cert.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          checked
                            ? 'border-green-500/50 bg-green-500/10 text-white'
                            : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:border-[#3a3a3a]'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleArray('certifications', cert.id)}
                          className="border-[#444] data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        <span className="text-sm">{cert.label}</span>
                      </label>
                    )
                  })}
                </div>
                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">
                    Sustainability Goals{' '}
                    <span className="text-gray-600 font-normal">(optional)</span>
                  </Label>
                  <textarea
                    {...register('sustainabilityGoals')}
                    rows={3}
                    placeholder="e.g., Reduce embodied carbon 30% by 2030, achieve net-zero manufacturing..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-green-500 rounded-md px-3 py-2 text-sm resize-none outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="text-gray-400 hover:text-white disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {step < 2 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitOnboarding.isPending}
                className="bg-green-600 hover:bg-green-500 text-white min-w-[140px]"
              >
                {submitOnboarding.isPending ? 'Submitting…' : 'Submit Profile'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
