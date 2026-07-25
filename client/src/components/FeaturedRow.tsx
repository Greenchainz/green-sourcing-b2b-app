import { Link } from 'wouter';
import { Star, Leaf, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeaturedMaterial {
  id: number;
  name: string;
  productName?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  gwpValue?: string | null;
  gwpUnit?: string | null;
  hasEpd?: boolean | null;
  imageUrl?: string | null;
  sustainabilityScore?: number;
  manufacturer?: string;
}

interface FeaturedRowProps {
  materials: FeaturedMaterial[];
  onAddToQuote: (material: FeaturedMaterial) => void;
  basketIds: Set<number>;
}

function FeaturedCard({
  material,
  onAddToQuote,
  inBasket,
}: {
  material: FeaturedMaterial;
  onAddToQuote: (m: FeaturedMaterial) => void;
  inBasket: boolean;
}) {
  return (
    <div className="relative flex-shrink-0 w-72 bg-gradient-to-br from-[#141414] to-[#0f1a0f] border border-green-500/20 rounded-xl overflow-hidden group hover:border-green-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <Star className="w-2.5 h-2.5 fill-yellow-400" />
        FEATURED
      </div>

      <div className="h-36 bg-[#0a0a0a] overflow-hidden">
        {material.imageUrl ? (
          <img
            src={material.imageUrl}
            alt={material.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Leaf className="w-10 h-10 text-green-900" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
            {material.category}
          </span>
          {material.hasEpd && (
            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] px-1 py-0">
              EPD
            </Badge>
          )}
        </div>

        <Link href={`/materials/${material.id}`}>
          <h3 className="text-white font-semibold text-sm leading-snug mb-1 line-clamp-2 hover:text-green-400 transition-colors cursor-pointer">
            {material.productName || material.name}
          </h3>
        </Link>

        {material.manufacturer && (
          <p className="text-gray-500 text-xs mb-2">{material.manufacturer}</p>
        )}

        {material.gwpValue && (
          <div className="flex items-center gap-1 mb-3">
            <Zap className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs font-mono">
              {material.gwpValue} {material.gwpUnit}
            </span>
          </div>
        )}

        <Button
          size="sm"
          onClick={() => onAddToQuote(material)}
          className={`w-full text-xs h-7 font-semibold ${
            inBasket
              ? 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
              : 'bg-green-500 hover:bg-green-400 text-black'
          }`}
        >
          {inBasket ? '✓ Added to Basket' : 'Get Quote'}
        </Button>
      </div>
    </div>
  );
}

export function FeaturedRow({ materials, onAddToQuote, basketIds }: FeaturedRowProps) {
  if (materials.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-white font-semibold text-sm">Featured Suppliers</span>
          <span className="text-gray-600 text-xs">· Verified & sponsored</span>
        </div>
        <Link
          href="/materials?featured=true"
          className="text-gray-500 text-xs hover:text-green-400 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {materials.map((material) => (
          <FeaturedCard
            key={material.id}
            material={material}
            onAddToQuote={onAddToQuote}
            inBasket={basketIds.has(material.id)}
          />
        ))}
      </div>
    </div>
  );
}
