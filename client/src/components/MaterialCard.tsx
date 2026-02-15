import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Leaf, Shield, Award, DollarSign, Truck, Heart,
  FileText, ShoppingCart, Scale,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface CcpsBreakdown {
  carbonScore: number;
  complianceScore: number;
  certificationScore: number;
  costScore: number;
  supplyChainScore: number;
  healthScore: number;
  ccpsTotal: number;
  sourcingDifficulty: number;
}

interface MaterialCardProps {
  id: number;
  name: string;
  productName?: string | null;
  category: string;
  manufacturerName?: string | null;
  gwpValue?: string | null;
  pricePerUnit?: string | null;
  priceUnit?: string | null;
  leadTimeDays?: number | null;
  hasEpd?: number | null;
  hasHpd?: number | null;
  hasFsc?: number | null;
  hasC2c?: number | null;
  hasGreenguard?: number | null;
  hasDeclare?: number | null;
  usManufactured?: number | null;
  recycledContentPct?: string | null;
  ccps: CcpsBreakdown;
}

function CcpsGauge({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-600 border-green-500" : score >= 50 ? "text-yellow-600 border-yellow-500" : "text-red-600 border-red-500";
  const bg = score >= 75 ? "bg-green-50" : score >= 50 ? "bg-yellow-50" : "bg-red-50";
  return (
    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-[3px] ${color} ${bg}`}>
      <span className="text-lg font-bold">{score}</span>
    </div>
  );
}

function SourcingDots({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= difficulty ? "bg-orange-500" : "bg-muted"}`} />
      ))}
    </div>
  );
}

function CertBadge({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return (
    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-green-50 border-green-200 text-green-700">{label}</Badge>
  );
}

const METRICS = [
  { key: "carbonScore" as const, icon: Leaf, color: "text-green-600", label: "Carbon" },
  { key: "complianceScore" as const, icon: Shield, color: "text-blue-600", label: "Compliance" },
  { key: "certificationScore" as const, icon: Award, color: "text-purple-600", label: "Certs" },
  { key: "costScore" as const, icon: DollarSign, color: "text-yellow-600", label: "Cost" },
  { key: "supplyChainScore" as const, icon: Truck, color: "text-orange-600", label: "Supply" },
  { key: "healthScore" as const, icon: Heart, color: "text-red-600", label: "Health" },
];

export default function MaterialCard(props: MaterialCardProps) {
  const { id, name, productName, category, manufacturerName, gwpValue, pricePerUnit, priceUnit, leadTimeDays, hasEpd, hasHpd, hasFsc, hasC2c, hasGreenguard, hasDeclare, usManufactured, recycledContentPct, ccps } = props;

  const addToRfq = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("rfq-items") || "[]");
      if (existing.some((item: any) => item.materialId === id)) { toast.info("Already in your RFQ cart"); return; }
      existing.push({ materialId: id, name, manufacturerName, quantity: 1, quantityUnit: priceUnit || "unit" });
      localStorage.setItem("rfq-items", JSON.stringify(existing));
      toast.success("Added to RFQ cart");
    } catch { toast.error("Failed to add to cart"); }
  };

  const addToCompare = () => {
    try {
      const existing = JSON.parse(localStorage.getItem("compare-ids") || "[]");
      if (existing.length >= 4) { toast.error("Max 4 materials for comparison"); return; }
      if (existing.includes(id)) { toast.info("Already in comparison"); return; }
      existing.push(id);
      localStorage.setItem("compare-ids", JSON.stringify(existing));
      toast.success("Added to comparison");
    } catch { toast.error("Failed to add"); }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/60 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between p-4 pb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] shrink-0">{category}</Badge>
              {usManufactured ? <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-200 text-blue-700 bg-blue-50">🇺🇸 US</Badge> : null}
            </div>
            <Link href={`/materials/${id}`}>
              <h3 className="text-sm font-semibold text-foreground hover:text-primary cursor-pointer line-clamp-2 leading-tight">{name}</h3>
            </Link>
            {productName && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{productName}</p>}
            {manufacturerName && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{manufacturerName}</p>}
          </div>
          <div className="flex flex-col items-center ml-3">
            <CcpsGauge score={ccps.ccpsTotal} />
            <span className="text-[9px] text-muted-foreground mt-1">CCPS</span>
          </div>
        </div>

        <div className="px-4 py-2 space-y-1">
          {METRICS.map((m) => (
            <div key={m.key} className="flex items-center gap-1.5">
              <m.icon className={`w-3 h-3 ${m.color} shrink-0`} />
              <span className="text-[9px] text-muted-foreground w-12 shrink-0">{m.label}</span>
              <Progress value={ccps[m.key]} className="flex-1 h-1.5" />
              <span className="text-[9px] font-medium w-5 text-right">{ccps[m.key]}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 grid grid-cols-3 gap-2 border-t border-border/30">
          <div><p className="text-[9px] text-muted-foreground">GWP</p><p className="text-xs font-semibold">{gwpValue ? Number(gwpValue).toFixed(2) : "—"}</p></div>
          <div><p className="text-[9px] text-muted-foreground">Price</p><p className="text-xs font-semibold">{pricePerUnit ? `$${Number(pricePerUnit).toFixed(2)}` : "—"}</p></div>
          <div><p className="text-[9px] text-muted-foreground">Lead</p><p className="text-xs font-semibold">{leadTimeDays ? `${leadTimeDays}d` : "—"}</p></div>
        </div>

        <div className="px-4 py-1.5 flex flex-wrap gap-1 border-t border-border/30">
          <CertBadge label="EPD" active={!!hasEpd} />
          <CertBadge label="HPD" active={!!hasHpd} />
          <CertBadge label="FSC" active={!!hasFsc} />
          <CertBadge label="C2C" active={!!hasC2c} />
          <CertBadge label="GG" active={!!hasGreenguard} />
          <CertBadge label="Declare" active={!!hasDeclare} />
          {recycledContentPct && Number(recycledContentPct) > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-200 text-emerald-700 bg-emerald-50">{Number(recycledContentPct).toFixed(0)}% Recycled</Badge>
          )}
        </div>

        <div className="px-4 py-2 flex items-center justify-between border-t border-border/30 bg-muted/20">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground">Sourcing:</span>
            <SourcingDots difficulty={ccps.sourcingDifficulty} />
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={addToCompare}><Scale className="w-3 h-3 mr-1" />Compare</Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={addToRfq}><ShoppingCart className="w-3 h-3 mr-1" />RFQ</Button>
            <Link href={`/materials/${id}`}><Button variant="default" size="sm" className="h-6 px-2 text-[10px]"><FileText className="w-3 h-3 mr-1" />Details</Button></Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
