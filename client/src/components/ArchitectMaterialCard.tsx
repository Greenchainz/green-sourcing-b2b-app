import { useState } from 'react';
import { Link } from 'wouter';
import {
  Leaf,
  Award,
  Zap,
  CheckCircle2,
  ShoppingCart,
  Star,
  Clock,
  Recycle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const LEED_CREDIT_MAP = {
  hasEpd: { credit: 'MR Credit: EPD', points: 1 },
  hasHpd: { credit: 'MR Credit: Material Ingredients', points: 1 },
  hasFsc: { credit: 'MR Credit: Certified Wood', points: 1 },
  hasC2c: { credit: 'MR Credit: C2C', points: 1 },
  hasGreenguard: { credit: 'EQ Credit: Low-Emitting Materials', points: 1 },
  usManufactured: { credit: 'MR Credit: Building Product Disclosure', points: 1 },
  recycledContentPct: { credit: 'MR Credit: Recycled Content', points: 1 },
} as const;

function getScoreConfig(score: number) {
  if (score >= 90) return { label: 'Excellent', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' };
  if (score >= 75) return { label: 'Good', color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/25', text: 'text-green-400' };
  if (score >= 60) return { label: 'Fair', color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-400' };
  return { label: 'Poor', color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400' };
}

function CarbonBar({
  gwpValue,
  categoryBaseline,
  unit,
}: {
  gwpValue: number;
  categoryBaseline?: number;
  unit?: string;
}) {
  const baseline = categoryBaseline ?? Math.abs(gwpValue) * 1.5;
  const isNegative = gwpValue < 0;
  const pct = isNegative ? 100 : Math.min(100, Math.round((gwpValue / baseline) * 100));
  const savingsPct = Math.round((1 - gwpValue / baseline) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-500 flex items-center gap-1">
          <Zap className="w-2.5 h-2.5" /> Embodied carbon vs. category avg
        </span>
        <span className={`font-bold ${isNegative || savingsPct > 0 ? 'text-green-400' : 'text-orange-400'}`}>
          {isNegative ? 'Carbon negative' : savingsPct > 0 ? `${savingsPct}% lower` : `${Math.abs(savingsPct)}% higher`}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isNegative ? 'bg-emerald-400' : savingsPct > 0 ? 'bg-green-400' : 'bg-orange-400'}`}
          style={{ width: `${isNegative ? 100 : pct}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-600 font-mono">
        {gwpValue} {unit ?? 'kgCO₂e'}
      </div>
    </div>
  );
}

function LeedCredits({ material }: { material: ArchitectMaterial }) {
  const earned: { credit: string; points: number }[] = [];

  if (material.hasEpd) earned.push(LEED_CREDIT_MAP.hasEpd);
  if (material.hasHpd) earned.push(LEED_CREDIT_MAP.hasHpd);
  if (material.hasFsc) earned.push(LEED_CREDIT_MAP.hasFsc);
  if (material.hasC2c) earned.push(LEED_CREDIT_MAP.hasC2c);
  if (material.hasGreenguard) earned.push(LEED_CREDIT_MAP.hasGreenguard);
  if (material.usManufactured) earned.push(LEED_CREDIT_MAP.usManufactured);
  if (material.recycledContentPct && Number(material.recycledContentPct) > 0) {
    earned.push(LEED_CREDIT_MAP.recycledContentPct);
  }

  if (earned.length === 0) return null;

  const totalPoints = earned.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium flex items-center gap-1">
          <Award className="w-2.5 h-2.5 text-blue-400" /> LEED v4.1 Credits
        </span>
        <span className="text-[10px] font-bold text-blue-400">{totalPoints} pt{totalPoints > 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {earned.slice(0, 3).map((c) => (
          <span
            key={c.credit}
            className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium"
          >
            {c.credit}
          </span>
        ))}
        {earned.length > 3 && (
          <span className="text-[9px] text-gray-600">+{earned.length - 3} more</span>
        )}
      </div>
    </div>
  );
}

export interface ArchitectMaterial {
  id: string | number;
  name: string;
  productName?: string | null;
  manufacturer?: string | null;
  manufacturerName?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sustainabilityScore?: number;
  ccps?: { ccpsTotal: number; [key: string]: number };
  gwpValue?: number | string | null;
  gwpUnit?: string | null;
  categoryBaselineGwp?: number | null;
  hasEpd?: boolean | null;
  hasHpd?: boolean | null;
  hasFsc?: boolean | null;
  hasC2c?: boolean | null;
  hasGreenguard?: boolean | null;
  usManufactured?: boolean | null;
  recycledContentPct?: number | string | null;
  leadTimeDays?: number | null;
  verified?: boolean;
  isFeatured?: boolean;
}

interface ArchitectMaterialCardProps {
  material: ArchitectMaterial;
  inBasket: boolean;
  onAddToQuote: (m: ArchitectMaterial) => void;
  onRemoveFromQuote: (id: string | number) => void;
}

export function ArchitectMaterialCard({
  material,
  inBasket,
  onAddToQuote,
  onRemoveFromQuote,
}: ArchitectMaterialCardProps) {
  const [imgError, setImgError] = useState(false);
  const score = material.sustainabilityScore ?? material.ccps?.ccpsTotal ?? 0;
  const scoreConfig = getScoreConfig(score);
  const gwp = material.gwpValue != null ? Number(material.gwpValue) : null;
  const manufacturerName = material.manufacturerName ?? material.manufacturer ?? null;

  return (
    <article className={`group relative flex flex-col bg-[#111] rounded-xl overflow-hidden border transition-all duration-200
      ${inBasket
        ? 'border-green-500/50 shadow-md shadow-green-500/10'
        : 'border-[#1f1f1f] hover:border-green-500/25 hover:shadow-md hover:shadow-green-500/5'
      }`}
    >
      {material.isFeatured && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          <Star className="w-2 h-2 fill-yellow-300" /> FEATURED
        </div>
      )}

      {inBasket && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow">
          <CheckCircle2 className="w-3 h-3 text-black" />
        </div>
      )}

      <div className="relative h-44 bg-[#0d0d0d] overflow-hidden flex-shrink-0">
        {material.imageUrl && !imgError ? (
          <img
            src={material.imageUrl}
            alt={material.productName ?? material.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0d1a0d] to-[#0a0a0a]">
            <Leaf className="w-10 h-10 text-green-900" />
            <span className="text-green-900 text-xs font-medium">{material.category}</span>
          </div>
        )}

        <div className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg border backdrop-blur-sm ${scoreConfig.bg} ${scoreConfig.border}`}>
          <span className={`text-lg font-black leading-none ${scoreConfig.text}`}>{score}</span>
          <div>
            <div className="text-[8px] text-gray-400 leading-none">GCS</div>
            <div className={`text-[9px] font-bold leading-none ${scoreConfig.text}`}>{scoreConfig.label}</div>
          </div>
        </div>

        {material.verified && (
          <div className="absolute bottom-2 right-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            ✓ Verified
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            {material.category}
          </span>
          {material.subcategory && (
            <>
              <span className="text-gray-700">·</span>
              <span className="text-[10px] text-gray-600">{material.subcategory}</span>
            </>
          )}
        </div>

        <div>
          <Link href={`/materials/${material.id}`}>
            <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 hover:text-green-400 transition-colors cursor-pointer">
              {material.productName ?? material.name}
            </h3>
          </Link>
          {manufacturerName && (
            <p className="text-gray-500 text-xs mt-0.5">{manufacturerName}</p>
          )}
        </div>

        {gwp !== null && (
          <CarbonBar
            gwpValue={gwp}
            categoryBaseline={material.categoryBaselineGwp ?? undefined}
            unit={material.gwpUnit ?? undefined}
          />
        )}

        <LeedCredits material={material} />

        <div className="flex flex-wrap gap-1">
          {material.hasEpd && (
            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-medium">EPD</span>
          )}
          {material.hasGreenguard && (
            <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded font-medium">GreenGuard</span>
          )}
          {material.hasFsc && (
            <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-medium">FSC</span>
          )}
          {material.hasC2c && (
            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-medium">C2C</span>
          )}
          {material.usManufactured && (
            <span className="text-[9px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium">🇺🇸 US Made</span>
          )}
          {material.recycledContentPct && Number(material.recycledContentPct) > 0 && (
            <span className="text-[9px] bg-white/5 text-gray-400 border border-white/10 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
              <Recycle className="w-2 h-2" /> {Number(material.recycledContentPct)}% recycled
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a] gap-2">
          {material.leadTimeDays != null && (
            <div className="flex items-center gap-1 text-gray-600 text-xs">
              <Clock className="w-3 h-3" />
              <span>{material.leadTimeDays >= 7 ? `${Math.round(material.leadTimeDays / 7)}wk` : `${material.leadTimeDays}d`} lead</span>
            </div>
          )}

          {inBasket ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemoveFromQuote(material.id)}
              className="ml-auto text-green-400 hover:text-red-400 hover:bg-red-500/10 text-xs h-7 px-2 gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> In Basket
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onAddToQuote(material)}
              className="ml-auto bg-green-500 hover:bg-green-400 text-black font-bold text-xs h-7 px-3 gap-1"
            >
              <ShoppingCart className="w-3 h-3" /> Get Quote
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
