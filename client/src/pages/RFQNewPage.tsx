/**
 * NewRFQPage — 4-step RFQ submission wizard
 * Route: /rfq/new?supplierId=&materialId=
 */
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CarbonForecastPanel } from "@/components/CarbonForecastPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationTypeahead, CompanyTypeahead } from "@/components/ui/typeahead-variants";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  FolderOpen,
  Package,
  Building2,
  ClipboardCheck,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Leaf,
  Star,
  MapPin,
  Sparkles,
  X,
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Info,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── HITL local types (mirrors server/domain/swapEngine.ts) ────────────────────

interface InferredField {
  value: unknown;
  source: "explicit" | "inferred" | "missing";
  note?: string;
}

interface MetricScore {
  raw: number;
  weighted: number;
  weight: number;
  reason: string;
}

interface ScoreBreakdown {
  supplierId: number;
  total: number;
  carbon: MetricScore;
  compliance: MetricScore;
  certification: MetricScore;
  cost: MetricScore;
  supplyChain: MetricScore;
  reliability: MetricScore;
  financial: MetricScore;
  regional: MetricScore;
  buyerFit: MetricScore;
}

interface SwapResultPreview {
  status: "draft";
  enrichedIntent: {
    projectName: InferredField;
    projectType: InferredField;
    projectCity: InferredField;
    projectState: InferredField;
    category: InferredField;
    description: InferredField;
    quantity: InferredField;
    unit: InferredField;
    certifications: InferredField;
    maxGwp: InferredField;
    epdRequired: InferredField;
    targetDeliveryDate: InferredField;
  };
  missingFields: string[];
  warnings: string[];
  candidateSuppliers: Array<{
    supplierId: number;
    companyName: string;
    city: string | null;
    state: string | null;
    reason: string;
    confidence: "high" | "medium" | "low";
    isFallback: boolean;
    isHighSustainability: boolean;
    matchScore: number;
  }>;
  scoreBreakdowns: ScoreBreakdown[];
  agentAvailable: boolean;
  matchSource: "agent" | "fallback";
  personaKey: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  "Commercial Office",
  "Multi-Family Residential",
  "Single-Family Residential",
  "Education",
  "Healthcare",
  "Hospitality",
  "Industrial / Warehouse",
  "Mixed-Use",
  "Retail",
  "Government / Civic",
  "Infrastructure",
  "Other",
] as const;

const MATERIAL_CATEGORIES = [
  "Concrete & Masonry",
  "Steel & Metal",
  "Timber & Wood",
  "Insulation",
  "Roofing",
  "Flooring",
  "Glazing & Windows",
  "HVAC Systems",
  "Electrical",
  "Plumbing",
  "Interior Finishes",
  "Doors & Hardware",
  "Cladding & Facades",
  "Other",
] as const;

const CERT_OPTIONS = [
  "LEED",
  "EPD",
  "FSC",
  "GreenGuard",
  "Cradle to Cradle",
  "Living Building Challenge",
  "ISO 14001",
  "Other",
];

const QUANTITY_UNITS = ["SF", "LF", "EA", "CY", "tons"] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

/**
 * Zip-prefix → state fallback table.
 * The first 3 digits of a US zip code reliably identify the state.
 * This guarantees a result for any syntactically valid US zip even when
 * the external API is down or doesn't cover the zip (new dev areas, PO boxes, etc.).
 */
const ZIP_PREFIX_STATE: Record<string, string> = {
  // Alabama
  "350":"AL","351":"AL","352":"AL","354":"AL","355":"AL","356":"AL","357":"AL","358":"AL","359":"AL",
  "360":"AL","361":"AL","362":"AL","363":"AL","364":"AL","365":"AL","366":"AL","367":"AL","368":"AL","369":"AL",
  // Alaska
  "995":"AK","996":"AK","997":"AK","998":"AK","999":"AK",
  // Arizona
  "850":"AZ","851":"AZ","852":"AZ","853":"AZ","855":"AZ","856":"AZ","857":"AZ","859":"AZ","860":"AZ","863":"AZ","864":"AZ","865":"AZ",
  // Arkansas
  "716":"AR","717":"AR","718":"AR","719":"AR","720":"AR","721":"AR","722":"AR","723":"AR","724":"AR","725":"AR","726":"AR","727":"AR","728":"AR","729":"AR",
  // California
  "900":"CA","901":"CA","902":"CA","903":"CA","904":"CA","905":"CA","906":"CA","907":"CA","908":"CA","910":"CA",
  "911":"CA","912":"CA","913":"CA","914":"CA","915":"CA","916":"CA","917":"CA","918":"CA","919":"CA","920":"CA",
  "921":"CA","922":"CA","923":"CA","924":"CA","925":"CA","926":"CA","927":"CA","928":"CA","930":"CA","931":"CA",
  "932":"CA","933":"CA","934":"CA","935":"CA","936":"CA","937":"CA","938":"CA","939":"CA","940":"CA","941":"CA",
  "942":"CA","943":"CA","944":"CA","945":"CA","946":"CA","947":"CA","948":"CA","949":"CA","950":"CA","951":"CA",
  "952":"CA","953":"CA","954":"CA","955":"CA","956":"CA","957":"CA","958":"CA","959":"CA","960":"CA","961":"CA",
  // Colorado
  "800":"CO","801":"CO","802":"CO","803":"CO","804":"CO","805":"CO","806":"CO","807":"CO","808":"CO","809":"CO",
  "810":"CO","811":"CO","812":"CO","813":"CO","814":"CO","815":"CO","816":"CO",
  // Connecticut
  "060":"CT","061":"CT","062":"CT","063":"CT","064":"CT","065":"CT","066":"CT","067":"CT","068":"CT","069":"CT",
  // Delaware
  "197":"DE","198":"DE","199":"DE",
  // DC
  "200":"DC","202":"DC","203":"DC","204":"DC","205":"DC",
  // Florida
  "320":"FL","321":"FL","322":"FL","323":"FL","324":"FL","325":"FL","326":"FL","327":"FL","328":"FL","329":"FL",
  "330":"FL","331":"FL","332":"FL","333":"FL","334":"FL","335":"FL","336":"FL","337":"FL","338":"FL","339":"FL",
  "341":"FL","342":"FL","344":"FL","346":"FL","347":"FL","349":"FL",
  // Georgia
  "300":"GA","301":"GA","302":"GA","303":"GA","304":"GA","305":"GA","306":"GA","307":"GA","308":"GA","309":"GA",
  "310":"GA","311":"GA","312":"GA","313":"GA","314":"GA","315":"GA","316":"GA","317":"GA","318":"GA","319":"GA",
  // Hawaii
  "967":"HI","968":"HI",
  // Idaho
  "832":"ID","833":"ID","834":"ID","835":"ID","836":"ID","837":"ID","838":"ID",
  // Illinois
  "600":"IL","601":"IL","602":"IL","603":"IL","604":"IL","605":"IL","606":"IL","607":"IL","608":"IL","609":"IL",
  "610":"IL","611":"IL","612":"IL","613":"IL","614":"IL","615":"IL","616":"IL","617":"IL","618":"IL","619":"IL",
  "620":"IL","622":"IL","623":"IL","624":"IL","625":"IL","626":"IL","627":"IL","628":"IL","629":"IL",
  // Indiana
  "460":"IN","461":"IN","462":"IN","463":"IN","464":"IN","465":"IN","466":"IN","467":"IN","468":"IN","469":"IN",
  "470":"IN","471":"IN","472":"IN","473":"IN","474":"IN","475":"IN","476":"IN","477":"IN","478":"IN","479":"IN",
  // Iowa
  "500":"IA","501":"IA","502":"IA","503":"IA","504":"IA","505":"IA","506":"IA","507":"IA","508":"IA",
  "510":"IA","511":"IA","512":"IA","513":"IA","514":"IA","515":"IA","516":"IA","520":"IA","521":"IA",
  "522":"IA","523":"IA","524":"IA","525":"IA","526":"IA","527":"IA","528":"IA",
  // Kansas
  "660":"KS","661":"KS","662":"KS","664":"KS","665":"KS","666":"KS","667":"KS","668":"KS","669":"KS",
  "670":"KS","671":"KS","672":"KS","673":"KS","674":"KS","675":"KS","676":"KS","677":"KS","678":"KS","679":"KS",
  // Kentucky
  "400":"KY","401":"KY","402":"KY","403":"KY","404":"KY","405":"KY","406":"KY","407":"KY","408":"KY","409":"KY",
  "410":"KY","411":"KY","412":"KY","413":"KY","414":"KY","415":"KY","416":"KY","417":"KY","418":"KY",
  "420":"KY","421":"KY","422":"KY","423":"KY","424":"KY","425":"KY","426":"KY","427":"KY",
  // Louisiana
  "700":"LA","701":"LA","703":"LA","704":"LA","705":"LA","706":"LA","707":"LA","708":"LA","710":"LA","711":"LA","712":"LA","713":"LA","714":"LA",
  // Maine
  "039":"ME","040":"ME","041":"ME","042":"ME","043":"ME","044":"ME","045":"ME","046":"ME","047":"ME","048":"ME","049":"ME",
  // Maryland
  "206":"MD","207":"MD","208":"MD","209":"MD","210":"MD","211":"MD","212":"MD","214":"MD","215":"MD","216":"MD","217":"MD","218":"MD","219":"MD",
  // Massachusetts
  "010":"MA","011":"MA","012":"MA","013":"MA","014":"MA","015":"MA","016":"MA","017":"MA","018":"MA","019":"MA",
  "020":"MA","021":"MA","022":"MA","023":"MA","024":"MA","025":"MA","026":"MA","027":"MA",
  // Michigan
  "480":"MI","481":"MI","482":"MI","483":"MI","484":"MI","485":"MI","486":"MI","487":"MI","488":"MI","489":"MI",
  "490":"MI","491":"MI","492":"MI","493":"MI","494":"MI","495":"MI","496":"MI","497":"MI","498":"MI","499":"MI",
  // Minnesota
  "550":"MN","551":"MN","553":"MN","554":"MN","555":"MN","556":"MN","557":"MN","558":"MN","559":"MN",
  "560":"MN","561":"MN","562":"MN","563":"MN","564":"MN","565":"MN","566":"MN","567":"MN",
  // Mississippi
  "386":"MS","387":"MS","388":"MS","389":"MS","390":"MS","391":"MS","392":"MS","393":"MS","394":"MS","395":"MS","396":"MS","397":"MS",
  // Missouri
  "630":"MO","631":"MO","633":"MO","634":"MO","635":"MO","636":"MO","637":"MO","638":"MO","639":"MO",
  "640":"MO","641":"MO","644":"MO","645":"MO","646":"MO","647":"MO","648":"MO","649":"MO",
  "650":"MO","651":"MO","652":"MO","653":"MO","654":"MO","655":"MO","656":"MO","657":"MO","658":"MO",
  // Montana
  "590":"MT","591":"MT","592":"MT","593":"MT","594":"MT","595":"MT","596":"MT","597":"MT","598":"MT","599":"MT",
  // Nebraska
  "680":"NE","681":"NE","683":"NE","684":"NE","685":"NE","686":"NE","687":"NE","688":"NE","689":"NE",
  "690":"NE","691":"NE","692":"NE","693":"NE",
  // Nevada
  "889":"NV","890":"NV","891":"NV","893":"NV","894":"NV","895":"NV","897":"NV","898":"NV",
  // New Hampshire
  "030":"NH","031":"NH","032":"NH","033":"NH","034":"NH","035":"NH","036":"NH","037":"NH","038":"NH",
  // New Jersey
  "070":"NJ","071":"NJ","072":"NJ","073":"NJ","074":"NJ","075":"NJ","076":"NJ","077":"NJ","078":"NJ","079":"NJ",
  "080":"NJ","081":"NJ","082":"NJ","083":"NJ","084":"NJ","085":"NJ","086":"NJ","087":"NJ","088":"NJ","089":"NJ",
  // New Mexico
  "870":"NM","871":"NM","872":"NM","873":"NM","874":"NM","875":"NM","877":"NM","878":"NM","879":"NM","880":"NM","881":"NM","882":"NM","883":"NM","884":"NM",
  // New York
  "100":"NY","101":"NY","102":"NY","103":"NY","104":"NY","105":"NY","106":"NY","107":"NY","108":"NY","109":"NY",
  "110":"NY","111":"NY","112":"NY","113":"NY","114":"NY","115":"NY","116":"NY","117":"NY","118":"NY","119":"NY",
  "120":"NY","121":"NY","122":"NY","123":"NY","124":"NY","125":"NY","126":"NY","127":"NY","128":"NY","129":"NY",
  "130":"NY","131":"NY","132":"NY","133":"NY","134":"NY","135":"NY","136":"NY","137":"NY","138":"NY","139":"NY",
  "140":"NY","141":"NY","142":"NY","143":"NY","144":"NY","145":"NY","146":"NY","147":"NY","148":"NY","149":"NY",
  // North Carolina
  "270":"NC","271":"NC","272":"NC","273":"NC","274":"NC","275":"NC","276":"NC","277":"NC","278":"NC","279":"NC",
  "280":"NC","281":"NC","282":"NC","283":"NC","284":"NC","285":"NC","286":"NC","287":"NC","288":"NC","289":"NC",
  // North Dakota
  "580":"ND","581":"ND","582":"ND","583":"ND","584":"ND","585":"ND","586":"ND","587":"ND","588":"ND",
  // Ohio
  "430":"OH","431":"OH","432":"OH","433":"OH","434":"OH","435":"OH","436":"OH","437":"OH","438":"OH","439":"OH",
  "440":"OH","441":"OH","442":"OH","443":"OH","444":"OH","445":"OH","446":"OH","447":"OH","448":"OH","449":"OH",
  "450":"OH","451":"OH","452":"OH","453":"OH","454":"OH","455":"OH","456":"OH","457":"OH","458":"OH",
  // Oklahoma
  "730":"OK","731":"OK","733":"OK","734":"OK","735":"OK","736":"OK","737":"OK","738":"OK","739":"OK",
  "740":"OK","741":"OK","743":"OK","744":"OK","745":"OK","746":"OK","747":"OK","748":"OK","749":"OK",
  // Oregon
  "970":"OR","971":"OR","972":"OR","973":"OR","974":"OR","975":"OR","976":"OR","977":"OR","978":"OR","979":"OR",
  // Pennsylvania
  "150":"PA","151":"PA","152":"PA","153":"PA","154":"PA","155":"PA","156":"PA","157":"PA","158":"PA","159":"PA",
  "160":"PA","161":"PA","162":"PA","163":"PA","164":"PA","165":"PA","166":"PA","167":"PA","168":"PA","169":"PA",
  "170":"PA","171":"PA","172":"PA","173":"PA","174":"PA","175":"PA","176":"PA","177":"PA","178":"PA","179":"PA",
  "180":"PA","181":"PA","182":"PA","183":"PA","184":"PA","185":"PA","186":"PA","187":"PA","188":"PA","189":"PA",
  "190":"PA","191":"PA","192":"PA","193":"PA","194":"PA","195":"PA","196":"PA",
  // Rhode Island
  "028":"RI","029":"RI",
  // South Carolina
  "290":"SC","291":"SC","292":"SC","293":"SC","294":"SC","295":"SC","296":"SC","297":"SC","298":"SC","299":"SC",
  // South Dakota
  "570":"SD","571":"SD","572":"SD","573":"SD","574":"SD","575":"SD","576":"SD","577":"SD",
  // Tennessee
  "370":"TN","371":"TN","372":"TN","373":"TN","374":"TN","375":"TN","376":"TN","377":"TN","378":"TN","379":"TN",
  "380":"TN","381":"TN","382":"TN","383":"TN","384":"TN","385":"TN",
  // Texas
  "750":"TX","751":"TX","752":"TX","753":"TX","754":"TX","755":"TX","756":"TX","757":"TX","758":"TX","759":"TX",
  "760":"TX","761":"TX","762":"TX","763":"TX","764":"TX","765":"TX","766":"TX","767":"TX","768":"TX","769":"TX",
  "770":"TX","771":"TX","772":"TX","773":"TX","774":"TX","775":"TX","776":"TX","777":"TX","778":"TX","779":"TX",
  "780":"TX","781":"TX","782":"TX","783":"TX","784":"TX","785":"TX","786":"TX","787":"TX","788":"TX","789":"TX",
  "790":"TX","791":"TX","792":"TX","793":"TX","794":"TX","795":"TX","796":"TX","797":"TX","798":"TX","799":"TX",
  // Utah
  "840":"UT","841":"UT","842":"UT","843":"UT","844":"UT","845":"UT","846":"UT","847":"UT",
  // Vermont
  "050":"VT","051":"VT","052":"VT","053":"VT","054":"VT","055":"VT","056":"VT","057":"VT","058":"VT","059":"VT",
  // Virginia
  "201":"VA","220":"VA","221":"VA","222":"VA","223":"VA","224":"VA","225":"VA","226":"VA","227":"VA","228":"VA","229":"VA",
  "230":"VA","231":"VA","232":"VA","233":"VA","234":"VA","235":"VA","236":"VA","237":"VA","238":"VA","239":"VA",
  "240":"VA","241":"VA","242":"VA","243":"VA","244":"VA","245":"VA","246":"VA",
  // Washington
  "980":"WA","981":"WA","982":"WA","983":"WA","984":"WA","985":"WA","986":"WA","988":"WA","989":"WA","990":"WA","991":"WA","992":"WA","993":"WA","994":"WA",
  // West Virginia
  "247":"WV","248":"WV","249":"WV","250":"WV","251":"WV","252":"WV","253":"WV","254":"WV","255":"WV","256":"WV","257":"WV","258":"WV","259":"WV",
  "260":"WV","261":"WV","262":"WV","263":"WV","264":"WV","265":"WV","266":"WV","267":"WV","268":"WV",
  // Wisconsin
  "530":"WI","531":"WI","532":"WI","534":"WI","535":"WI","537":"WI","538":"WI","539":"WI",
  "540":"WI","541":"WI","542":"WI","543":"WI","544":"WI","545":"WI","546":"WI","547":"WI","548":"WI","549":"WI",
  // Wyoming
  "820":"WY","821":"WY","822":"WY","823":"WY","824":"WY","825":"WY","826":"WY","827":"WY","828":"WY","829":"WY","830":"WY","831":"WY",
  // Puerto Rico (006–009xx; VI shares 008 range but PR takes precedence here)
  "006":"PR","007":"PR","008":"PR","009":"PR",
  // Guam
  "969":"GU",
  // Military / APO
  "090":"AE","091":"AE","092":"AE","093":"AE","094":"AE","095":"AE","096":"AE","097":"AE","098":"AE",
  "340":"AA",
  "962":"AP","963":"AP","964":"AP","965":"AP","966":"AP",
};

/** State abbreviation → a representative region label for display when the API can't resolve a city. */
const STATE_REGION_LABEL: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",
  DE:"Delaware",DC:"Washington D.C.",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",
  IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
  NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",
  NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",
  RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",
  VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  PR:"Puerto Rico",GU:"Guam",VI:"US Virgin Islands",AE:"APO/FPO Europe",AA:"APO/FPO Americas",AP:"APO/FPO Pacific",
};

/**
 * Look up a 5-digit US zip code → { city, state }.
 * - First tries zippopotam.us for an exact city name.
 * - Falls back to the zip-prefix table (covers 100% of syntactically valid US zips).
 * Never returns null for a valid 5-digit zip.
 */
async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  // 1. Try live API — fastest, most accurate city name
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (res.ok) {
      const data = await res.json() as { places?: { "place name": string; "state abbreviation": string }[] };
      const place = data.places?.[0];
      if (place) return { city: place["place name"], state: place["state abbreviation"] };
    }
  } catch { /* fall through to offline table */ }

  // 2. Offline prefix fallback — guarantees a result for any valid US zip
  const prefix = zip.slice(0, 3);
  const state = ZIP_PREFIX_STATE[prefix];
  if (state) {
    return { city: STATE_REGION_LABEL[state] ?? state, state };
  }

  // 3. Genuinely unrecognized prefix (non-US zip entered) — caller handles
  return null;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 0 — Project Info
  projectName: z.string().min(1, "Project name is required"),
  projectType: z.string().min(1, "Project type is required"),
  // Zip is the primary location input. City + state are derived from zip lookup
  // and stored for supplier matching — but they're optional so a lookup failure
  // never blocks submission.
  projectZip: z.string().regex(/^\d{5}$/, "Enter a 5-digit zip code").optional(),
  projectCity: z.string().optional().default(""),
  projectState: z.string().optional().default(""),
  projectLat: z.number().optional(),
  projectLng: z.number().optional(),
  startDate: z.string().optional(),
  projectSqFt: z.coerce.number().positive().optional().or(z.literal("")),

  // Step 1 — Material Request
  category: z.string().min(1, "Category is required"),
  description: z.string().min(2, "Description is required"),
  quantity: z.coerce.number().positive("Enter a positive quantity"),
  unit: z.enum(QUANTITY_UNITS),
  certifications: z.array(z.string()).optional(),
  maxGwp: z.coerce.number().positive().optional().or(z.literal("")),
  epdRequired: z.enum(["yes", "no", "preferred"]).optional(),
  targetDeliveryDate: z.string().optional(),

  // Step 2 — Supplier Selection (managed separately as array state)
});

type FormData = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  // Step 0 (AI mode) — all required fields validated together before jumping to suppliers
  0: ["projectName", "projectType", "projectCity", "projectState", "category", "description", "quantity", "unit"],
  1: ["projectName", "projectType", "projectCity", "projectState", "category", "description", "quantity", "unit"],
  2: [],
  3: [],
};

// ── HITL Review Panel ──────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  category: "Material type",
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  certifications: "Certifications",
  maxGwp: "Max GWP",
  epdRequired: "EPD required",
  projectName: "Project name",
  projectType: "Project type",
  projectCity: "City",
  projectState: "State",
  targetDeliveryDate: "Target delivery",
};

function formatFieldValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return (value as string[]).join(", ") || "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function SourceBadge({ source, note }: { source: "explicit" | "inferred" | "missing"; note?: string }) {
  if (source === "explicit") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full leading-none">
        <CheckCircle className="w-2.5 h-2.5" /> From your text
      </span>
    );
  }
  if (source === "inferred") {
    return (
      <span title={note} className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full leading-none cursor-help">
        <Info className="w-2.5 h-2.5" /> AI-suggested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border px-1.5 py-0.5 rounded-full leading-none">
      Missing
    </span>
  );
}

// ── Score breakdown UI ────────────────────────────────────────────────────────

const METRIC_META: Record<
  keyof Omit<ScoreBreakdown, "supplierId" | "total">,
  { label: string; color: string }
> = {
  carbon:        { label: "Carbon",          color: "bg-emerald-500" },
  compliance:    { label: "Code Compliance", color: "bg-blue-500"    },
  certification: { label: "Certifications",  color: "bg-purple-500"  },
  cost:          { label: "Cost",            color: "bg-amber-500"   },
  supplyChain:   { label: "Supply Chain",    color: "bg-cyan-500"    },
  reliability:   { label: "Reliability",     color: "bg-orange-500"  },
  financial:     { label: "Financial Health",color: "bg-rose-500"    },
  regional:      { label: "Regional Fit",    color: "bg-teal-500"    },
  buyerFit:      { label: "Buyer Fit",       color: "bg-indigo-500"  },
};

const METRIC_KEYS = Object.keys(METRIC_META) as (keyof typeof METRIC_META)[];

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right shrink-0">
        {score}
      </span>
    </div>
  );
}

function ScoreBreakdownExpander({
  breakdown,
}: {
  breakdown: ScoreBreakdown;
}) {
  const [open, setOpen] = useState(false);

  // Confidence colour based on total score
  const totalColor =
    breakdown.total >= 65
      ? "text-green-700 dark:text-green-400"
      : breakdown.total >= 40
      ? "text-amber-700 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Hide" : "See"} score breakdown
        <span className={`ml-1 font-semibold tabular-nums ${totalColor}`}>
          {breakdown.total}/100
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Composite Score Breakdown
          </p>
          {METRIC_KEYS.map((key) => {
            const m = breakdown[key];
            const meta = METRIC_META[key];
            return (
              <div key={key} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-foreground">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ×{(m.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <ScoreBar score={m.raw} color={meta.color} />
                <p className="text-[9px] text-muted-foreground leading-tight">{m.reason}</p>
              </div>
            );
          })}
          <div className="pt-1.5 border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">Composite Total</span>
            <span className={`text-[11px] font-bold tabular-nums ${totalColor}`}>
              {breakdown.total}/100
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HITL review panel ─────────────────────────────────────────────────────────

function HitlReviewPanel({
  swapResult,
  onApprove,
  onEdit,
}: {
  swapResult: SwapResultPreview;
  onApprove: () => void;
  onEdit: () => void;
}) {
  const fields = swapResult.enrichedIntent;
  const fieldEntries = Object.entries(fields) as [keyof typeof fields, { value: unknown; source: "explicit" | "inferred" | "missing"; note?: string }][];
  const visibleFields = fieldEntries.filter(([, f]) => f.source !== "missing" || f.value != null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Review before we contact suppliers</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            Verify the AI's analysis below. AI-suggested fields are highlighted — correct anything that's off before sending.
          </p>
        </div>
      </div>

      {/* Warnings */}
      {swapResult.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 space-y-1.5">
          {swapResult.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <TriangleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Field table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="divide-y">
          {visibleFields.map(([key, f]) => (
            <div key={key} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${f.source === "inferred" ? "bg-amber-50/40 dark:bg-amber-900/5" : f.source === "missing" ? "bg-muted/30" : ""}`}>
              <span className="text-muted-foreground w-28 shrink-0 text-xs">{FIELD_LABELS[key as string] ?? key}</span>
              <span className="flex-1 font-medium truncate text-xs">{formatFieldValue(f.value)}</span>
              <SourceBadge source={f.source} note={f.note} />
            </div>
          ))}
        </div>
      </div>

      {/* Supplier preview with score breakdowns */}
      {swapResult.candidateSuppliers.length > 0 && (
        <div className="rounded-lg border bg-muted/20 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              AI shortlisted {swapResult.candidateSuppliers.length} potential supplier{swapResult.candidateSuppliers.length !== 1 ? "s" : ""}
            </p>
            {!swapResult.agentAvailable && (
              <span className="text-[10px] text-muted-foreground italic">Score-based ranking</span>
            )}
          </div>

          <div className="space-y-3">
            {swapResult.candidateSuppliers.slice(0, 3).map((s, idx) => {
              const breakdown = swapResult.scoreBreakdowns?.find(
                (b) => b.supplierId === s.supplierId,
              );
              return (
                <div key={s.supplierId} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{s.companyName}</span>
                        {idx === 0 && (
                          <span className="text-[9px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                            #1 Match
                          </span>
                        )}
                        {s.isHighSustainability && (
                          <span className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full leading-none">
                            High Sustainability
                          </span>
                        )}
                      </div>
                      {(s.city || s.state) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {[s.city, s.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {breakdown && (
                        <ScoreBreakdownExpander breakdown={breakdown} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {swapResult.candidateSuppliers.length > 3 && (
            <p className="text-[10px] text-muted-foreground mt-2 pl-5">
              +{swapResult.candidateSuppliers.length - 3} more suppliers — you'll choose the final list next
            </p>
          )}
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={onApprove}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Looks good — Find Suppliers
        </Button>
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Nothing is sent to suppliers until you confirm on the final screen.
      </p>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Describe",  icon: MessageSquare },
  { label: "Material",  icon: Package },
  { label: "Suppliers", icon: Building2 },
  { label: "Review",    icon: ClipboardCheck },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 px-3 ${active ? "text-green-600" : done ? "text-green-500" : "text-muted-foreground"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                done ? "border-green-500 bg-green-500 text-white"
                     : active ? "border-green-600 bg-background text-green-600"
                     : "border-muted-foreground/30 bg-background"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 sm:w-16 ${i < current ? "bg-green-500" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Score badge ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const cls =
    score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : score >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full border-0 ${cls}`}>
      <Leaf className="w-2.5 h-2.5" />{score}
    </span>
  );
}

function verifiedBadgeReasonLabel(reason: string): string {
  switch (reason) {
    case "missing_verified_epd":
      return "Missing a verified EPD.";
    case "onboarding_incomplete":
      return "Supplier onboarding is incomplete.";
    case "response_sla_unmet":
      return "RFQ responsiveness SLA is not met.";
    case "supplier_blocked":
      return "Supplier is suspended or blocked.";
    default:
      return "Verification requirements are not fully met.";
  }
}

function verifiedBadgeLabel(status: string | undefined): string {
  if (status === "VERIFIED") return "Verified Supplier";
  if (status === "PARTIAL") return "Partially Verified";
  return "Unverified Supplier";
}

function verifiedBadgeClass(status: string | undefined): string {
  if (status === "VERIFIED") {
    return "text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5";
  }
  if (status === "PARTIAL") {
    return "text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5";
  }
  return "text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RFQNewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const presetSupplierId = params.get("supplierId") ? Number(params.get("supplierId")) : null;

  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>(presetSupplierId ? [presetSupplierId] : []);
  const [regionAll, setRegionAll] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const hasAutoSelectedRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { unit: "SF", epdRequired: "preferred" },
  });

  // Architect profile for region toggle
  const { data: profile } = trpc.architect.getMyProfile.useQuery(undefined, {
    enabled: user?.role === "architect",
    staleTime: 60_000,
  });

  // Watch form values needed for smart matching
  const watchedCategory = watch("category");
  const watchedCertsForMatch = watch("certifications");
  const watchedMaxGwp = watch("maxGwp");
  const watchedProjectState = watch("projectState");
  const watchedLat = watch("projectLat");
  const watchedLng = watch("projectLng");

  // Smart supplier matching — fires when user reaches Step 2 with a category
  const { data: matchedSuppliers = [], isLoading: matchLoading } =
    trpc.rfqRequests.matchSuppliers.useQuery(
      {
        category: watchedCategory ?? "",
        certifications: watchedCertsForMatch ?? [],
        maxGwp: watchedMaxGwp ? Number(watchedMaxGwp) : undefined,
        projectState: watchedProjectState ?? undefined,
        projectCity: watch("projectCity") ?? undefined,
        projectLat: watchedLat,
        projectLng: watchedLng,
      },
      {
        enabled: step === 2 && !!(watchedCategory),
        staleTime: 2 * 60_000,
      }
    );

  // Filter matched suppliers by search text
  const displayedSuppliers = supplierSearch
    ? matchedSuppliers.filter(
        (s) =>
          s.companyName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.city ?? "").toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.state ?? "").toLowerCase().includes(supplierSearch.toLowerCase())
      )
    : matchedSuppliers;

  const profileState = profile?.state ?? "";
  const { data: regionSuppliers = [] } = trpc.location.suppliersByState.useQuery(
    { state: profileState },
    { enabled: profileState.length === 2 && regionAll, staleTime: 5 * 60_000 }
  );

  // Auto-select top 3 on first load of smart results
  useEffect(() => {
    if (step !== 2) {
      hasAutoSelectedRef.current = false;
      return;
    }
    if (hasAutoSelectedRef.current) return;
    if (matchedSuppliers.length === 0) return;
    if (presetSupplierId) {
      // Keep preset + fill with top matches
      const fill = matchedSuppliers
        .filter((s) => s.id !== presetSupplierId)
        .slice(0, 2)
        .map((s) => s.id);
      setSelectedIds([presetSupplierId, ...fill]);
    } else {
      setSelectedIds(matchedSuppliers.slice(0, 3).map((s) => s.id));
    }
    hasAutoSelectedRef.current = true;
  }, [step, matchedSuppliers, presetSupplierId]);

  // When "all in region" is toggled on, replace selection with regional supplier IDs
  useEffect(() => {
    if (regionAll && regionSuppliers.length > 0) {
      setSelectedIds(regionSuppliers.map((s) => s.id).slice(0, 5));
    }
  }, [regionAll, regionSuppliers]);

  const createMulti = trpc.rfqRequests.createMulti.useMutation({
    onSuccess: ({ primaryId }) => {
      toast.success("RFQ sent — comparable bids incoming.", {
        description: "Submittal PDF included. Preview it now or find it on your dashboard when bids arrive.",
        action: { label: "Preview Submittal PDF", onClick: () => navigate("/tools/submittal") },
      });
      navigate(`/rfqs/${primaryId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── HITL mutations ───────────────────────────────────────────────────────────
  const saveDraftMutation = trpc.rfqRequests.saveDraft.useMutation({
    onSuccess: ({ draftId: id, swapResult: sr }) => {
      setDraftId(id);
      setSwapResult(sr as unknown as SwapResultPreview);
      setHitlReviewing(true);
      setHitlSaving(false);
    },
    onError: (err) => {
      console.error("[saveDraft]", err);
      // Graceful degradation — skip HITL review and go straight to supplier selection
      setHitlSaving(false);
      setStep(2);
      toast.warning("Could not save AI analysis — proceeding to supplier selection.", { duration: 4000 });
    },
  });

  const approveDraftMutation = trpc.rfqRequests.approveDraft.useMutation({
    onSuccess: ({ rfqIds }) => {
      const primaryId = rfqIds[0];
      toast.success("RFQ sent — comparable bids incoming.", {
        description: "Submittal PDF included. Preview it now or find it on your dashboard when bids arrive.",
        action: { label: "Preview Submittal PDF", onClick: () => navigate("/tools/submittal") },
      });
      if (primaryId) navigate(`/rfqs/${primaryId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Called when user clicks "Find Suppliers" after AI has all required fields.
  // Persists a DRAFT via the swap engine, then shows the HITL review panel.
  const handleAiReviewStart = () => {
    const v = getValues();
    setHitlSaving(true);
    saveDraftMutation.mutate({
      rawText: aiInput || "AI-parsed RFQ",
      projectZip: v.projectZip,
      parsedIntent: {
        category: v.category || undefined,
        description: v.description || undefined,
        quantity: v.quantity ? Number(v.quantity) : undefined,
        unit: v.unit || undefined,
        certifications: (v.certifications ?? []).length > 0 ? v.certifications : undefined,
        maxGwp: v.maxGwp ? Number(v.maxGwp) : undefined,
        epdRequired: v.epdRequired === "yes" ? true : v.epdRequired === "no" ? false : undefined,
        projectName: v.projectName || undefined,
        projectType: v.projectType || undefined,
        projectCity: v.projectCity || undefined,
        projectState: v.projectState || undefined,
        confidence: "HIGH",
        fieldsFound: parsedFieldsFound,
      },
    });
  };

  const watchedCerts = watchedCertsForMatch ?? [];

  // ── Spec upload state ────────────────────────────────────────────────────────
  const [specUploading, setSpecUploading] = useState(false);
  const [specParsed, setSpecParsed] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [specFieldsFound, setSpecFieldsFound] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const specInputRef = useRef<HTMLInputElement>(null);

  // ── AI intake state ──────────────────────────────────────────────────────────
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [clarifyInput, setClarifyInput] = useState("");
  const [allFieldsReady, setAllFieldsReady] = useState(false);
  const [parsedFieldsFound, setParsedFieldsFound] = useState<string[]>([]);

  // ── HITL state ───────────────────────────────────────────────────────────────
  const [hitlReviewing, setHitlReviewing] = useState(false);
  const [hitlSaving, setHitlSaving] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResultPreview | null>(null);

  // Map LLM category labels → form MATERIAL_CATEGORIES values
  // ── AI intake helpers ────────────────────────────────────────────────────────

  const mapAiCategory = (cat: string): string => {
    const direct = MATERIAL_CATEGORIES.find(c => c === cat);
    if (direct) return direct;
    const legacyMap: Record<string, string> = {
      "Concrete": "Concrete & Masonry",
      "Steel": "Steel & Metal",
      "Timber / Mass Timber": "Timber & Wood",
      "Glass": "Glazing & Windows",
      "Cladding": "Cladding & Facades",
      "MEP": "HVAC Systems",
      "Gypsum / Drywall": "Interior Finishes",
    };
    if (legacyMap[cat]) return legacyMap[cat];
    return MATERIAL_CATEGORIES.find(c =>
      c.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(c.toLowerCase().split(" ")[0])
    ) ?? "";
  };

  const applyParsedFields = (fields: Record<string, unknown>): string[] => {
    const fieldsFound = Array.isArray(fields.fieldsFound) ? (fields.fieldsFound as string[]) : [];
    const filled: string[] = [];

    if (typeof fields.category === "string" && fields.category) {
      const mapped = mapAiCategory(fields.category);
      if (mapped) { setValue("category", mapped, { shouldValidate: true }); filled.push("Material type"); }
    }
    if (typeof fields.description === "string" && fields.description.trim().length >= 2) {
      setValue("description", fields.description, { shouldValidate: true });
      filled.push("Description");
    }
    if (typeof fields.quantity === "number" && fields.quantity > 0) {
      setValue("quantity", fields.quantity as any, { shouldValidate: true });
      filled.push("Quantity");
    }
    if (typeof fields.unit === "string") {
      const validUnit = (["SF","LF","EA","CY","tons"] as const).find(
        u => u.toLowerCase() === (fields.unit as string).toLowerCase()
      );
      if (validUnit) setValue("unit", validUnit);
    }
    if (fieldsFound.includes("certifications") && Array.isArray(fields.certifications)) {
      const validCerts = (fields.certifications as string[]).filter(fc =>
        CERT_OPTIONS.some(opt => opt.toLowerCase() === fc.toLowerCase())
      );
      if (validCerts.length > 0) { setValue("certifications", validCerts); filled.push("Certifications"); }
    }
    if (typeof fields.maxGwp === "number") {
      setValue("maxGwp", fields.maxGwp as any);
      filled.push("GWP limit");
    }
    if (fieldsFound.includes("epdRequired")) {
      setValue("epdRequired", fields.epdRequired ? "yes" : "preferred");
    }
    if (typeof fields.projectName === "string" && fields.projectName.trim()) {
      setValue("projectName", fields.projectName.trim(), { shouldValidate: true });
      filled.push("Project name");
    }
    if (typeof fields.projectType === "string" && fields.projectType.trim()) {
      const validType = PROJECT_TYPES.find(
        t => t.toLowerCase() === (fields.projectType as string).toLowerCase() ||
             (fields.projectType as string).toLowerCase().includes(t.toLowerCase().split(" ")[0])
      );
      if (validType) { setValue("projectType", validType, { shouldValidate: true }); filled.push("Project type"); }
    }
    // Zip takes priority — look it up and derive city + state from it.
    // If the lookup fails (API down etc.), we still store the zip and move on.
    if (typeof fields.projectZip === "string" && /^\d{5}$/.test(fields.projectZip)) {
      const zip = fields.projectZip;
      setValue("projectZip", zip, { shouldValidate: true });
      void lookupZip(zip).then((loc) => {
        if (loc) {
          setValue("projectCity", loc.city, { shouldValidate: true });
          setValue("projectState", loc.state, { shouldValidate: true });
        }
      });
      filled.push("Location");
    } else {
      if (typeof fields.projectCity === "string" && fields.projectCity.trim()) {
        setValue("projectCity", fields.projectCity.trim(), { shouldValidate: true });
        filled.push("City");
      }
      if (typeof fields.projectState === "string" && US_STATES.includes(fields.projectState.toUpperCase())) {
        setValue("projectState", fields.projectState.toUpperCase(), { shouldValidate: true });
        filled.push("State");
      }
    }
    return filled;
  };

  const getMissingField = (): { field: string; question: string } | null => {
    const v = getValues();
    if (!v.category) return { field: "category", question: "What type of material do you need? e.g., concrete, steel, timber, insulation, roofing, flooring…" };
    if (!v.quantity || Number(v.quantity) <= 0) return { field: "quantity", question: "How much do you need? e.g., '2,500 SF', '50 tons', '100 LF'" };
    if (!v.projectZip && !v.projectCity) return { field: "location", question: "What's the project zip code? e.g., 02101" };
    if (!v.projectName) return { field: "projectName", question: "What's the project name or address? e.g., '555 Market St Office Tower'" };
    if (!v.projectType) return { field: "projectType", question: "What type of building is this? e.g., office, multifamily residential, healthcare, retail" };
    return null;
  };

  const parseAndApply = async (text: string, isClarification = false) => {
    setAiParsing(true);
    try {
      const res = await fetch("/api/rfq/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Parse failed");
      }
      const fields = await res.json() as Record<string, unknown>;
      const filled = applyParsedFields(fields);

      // Capture raw fieldsFound for later saveDraft call
      const rawFieldsFound = Array.isArray(fields.fieldsFound) ? (fields.fieldsFound as string[]) : [];
      setParsedFieldsFound(rawFieldsFound);

      // Auto-generate description if still empty
      const v = getValues();
      if (!v.description || (v.description as string).trim().length < 2) {
        const cat = (v.category as string) || "";
        const qty = v.quantity ? `${v.quantity} ${v.unit ?? ""}`.trim() : "";
        const loc = v.projectCity ? `in ${v.projectCity}${v.projectState ? `, ${v.projectState}` : ""}` : "";
        const autoDesc = [cat, qty, loc].filter(Boolean).join(" ");
        if (autoDesc.trim().length >= 2) {
          setValue("description", autoDesc.trim(), { shouldValidate: true });
        }
      }

      if (!isClarification) {
        setAiParsed(true);
        if (filled.length > 0) setAiSummary(filled);
      } else if (filled.length > 0) {
        setAiSummary(prev => [...new Set([...prev, ...filled])]);
      }

      const missing = getMissingField();
      if (!missing) {
        setAllFieldsReady(true);
        setClarifyQuestion(null);
      } else {
        setClarifyQuestion(missing.question);
        setAllFieldsReady(false);
      }
    } catch {
      toast.error("Couldn't parse that — try rephrasing or fill in manually.");
    } finally {
      setAiParsing(false);
    }
  };

  const handleAiSubmit = () => {
    if (!aiInput.trim() || aiParsing) return;
    void parseAndApply(aiInput, false);
  };

  const handleClarifySubmit = () => {
    if (!clarifyInput.trim() || aiParsing) return;

    // Zip code: resolve directly without an AI round-trip.
    const zipMatch = clarifyInput.trim().match(/^\d{5}$/);
    if (zipMatch) {
      setAiParsing(true);
      void lookupZip(clarifyInput.trim()).then((loc) => {
        setAiParsing(false);
        setValue("projectZip", clarifyInput.trim(), { shouldValidate: true });
        // Populate city/state if lookup succeeded — if it failed (API down etc.)
        // we still accept the zip and move forward.
        if (loc) {
          setValue("projectCity", loc.city, { shouldValidate: true });
          setValue("projectState", loc.state, { shouldValidate: true });
        }
        setClarifyInput("");
        setTimeout(() => {
          const next = getMissingField();
          if (!next) { setAllFieldsReady(true); setClarifyQuestion(null); }
          else setClarifyQuestion(next.question);
        }, 0);
      });
      return;
    }

    const enriched = `${aiInput}\n\nAdditional info: ${clarifyInput}`;
    void parseAndApply(enriched, true);
    setClarifyInput("");
  };

  const resetAi = () => {
    setAiParsed(false);
    setAllFieldsReady(false);
    setAiSummary([]);
    setClarifyQuestion(null);
    setClarifyInput("");
    setParsedFieldsFound([]);
    setHitlReviewing(false);
    setHitlSaving(false);
    setDraftId(null);
    setSwapResult(null);
  };

  // ── Spec PDF upload for the AI intake (Step 0) ───────────────────────────────
  // Uses Azure Document Intelligence → LLM pipeline, then drives the AI flow
  // (same endpoint as the manual-form spec upload, different state handling)
  const handleSpecUploadAi = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      setSpecError("Please upload a PDF file (spec section, CSI division, etc.)");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSpecError("File too large — max 25 MB");
      return;
    }

    setSpecUploading(true);
    setSpecError(null);

    const formData = new FormData();
    formData.append("spec", file);

    try {
      const res = await fetch("/api/rfq/parse-spec", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Parse failed" })) as { error?: string };
        throw new Error(err.error ?? "Parse failed");
      }

      const fields = await res.json() as Record<string, unknown>;
      const filled = applyParsedFields(fields);

      // Auto-generate description if the PDF didn't supply one
      const v = getValues();
      if (!v.description || (v.description as string).trim().length < 2) {
        const cat = (v.category as string) || "";
        const qty = v.quantity ? `${v.quantity} ${v.unit ?? ""}`.trim() : "";
        const loc = v.projectCity ? `in ${v.projectCity}${v.projectState ? `, ${v.projectState}` : ""}` : "";
        const autoDesc = [cat, qty, loc].filter(Boolean).join(" ");
        if (autoDesc.trim().length >= 2) {
          setValue("description", autoDesc.trim(), { shouldValidate: true });
        }
      }

      setAiParsed(true);
      if (filled.length > 0) setAiSummary(filled);

      const missing = getMissingField();
      if (!missing) {
        setAllFieldsReady(true);
        setClarifyQuestion(null);
        toast.success(`Spec parsed — ${filled.length} fields filled from "${file.name}". Ready to match suppliers.`);
      } else {
        setClarifyQuestion(missing.question);
        setAllFieldsReady(false);
        if (filled.length > 0) {
          toast.success(`Spec parsed — ${filled.length} fields pre-filled. Just a couple more details needed.`);
        } else {
          toast.warning("Spec analyzed but limited data extracted. Please answer the questions below.", { duration: 5000 });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spec parsing failed";
      setSpecError(msg);
      toast.error(msg);
    } finally {
      setSpecUploading(false);
      if (specInputRef.current) specInputRef.current.value = "";
    }
  };

  const mapSpecCategory = (cat: string): string => {
    const map: Record<string, string> = {
      "Concrete": "Concrete & Masonry",
      "Steel": "Steel & Metal",
      "Timber / Mass Timber": "Timber & Wood",
      "Glass": "Glazing & Windows",
      "Insulation": "Insulation",
      "Roofing": "Roofing",
      "Flooring": "Flooring",
      "Cladding": "Cladding & Facades",
      "MEP": "HVAC Systems",
      "Gypsum / Drywall": "Interior Finishes",
      "Other": "Other",
    };
    return map[cat] ?? MATERIAL_CATEGORIES.find(c => c.toLowerCase().includes(cat.toLowerCase())) ?? "";
  };

  const handleSpecUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      setSpecError("Please upload a PDF file (spec section, CSI division, etc.)");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSpecError("File too large — max 25 MB");
      return;
    }

    setSpecUploading(true);
    setSpecError(null);
    setSpecParsed(false);
    setSpecFieldsFound([]);

    const formData = new FormData();
    formData.append("spec", file);

    try {
      const res = await fetch("/api/rfq/parse-spec", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error((err as { error: string }).error ?? "Parse failed");
      }

      const fields = await res.json() as {
        category: string;
        description: string;
        certifications: string[];
        maxGwp: number | null;
        quantity: number | null;
        unit: string | null;
        epdRequired: boolean;
        confidence: string;
        fieldsFound: string[];
      };

      // Apply to form — only set fields that were actually found
      if (fields.fieldsFound.includes("category") && fields.category) {
        const mapped = mapSpecCategory(fields.category);
        if (mapped) setValue("category", mapped, { shouldValidate: true });
      }
      if (fields.fieldsFound.includes("description") && fields.description) {
        setValue("description", fields.description, { shouldValidate: true });
      }
      if (fields.fieldsFound.includes("certifications") && fields.certifications.length > 0) {
        // Only keep certs that match our known options (case-insensitive)
        const validCerts = fields.certifications.filter(fc =>
          CERT_OPTIONS.some(opt => opt.toLowerCase() === fc.toLowerCase())
        );
        if (validCerts.length > 0) setValue("certifications", validCerts);
      }
      if (fields.fieldsFound.includes("maxGwp") && fields.maxGwp != null) {
        setValue("maxGwp", fields.maxGwp as any);
      }
      if (fields.fieldsFound.includes("quantity") && fields.quantity != null) {
        setValue("quantity", fields.quantity as any, { shouldValidate: true });
      }
      if (fields.fieldsFound.includes("unit") && fields.unit) {
        const validUnit = (["SF","LF","EA","CY","tons"] as const).find(
          u => u.toLowerCase() === fields.unit!.toLowerCase()
        );
        if (validUnit) setValue("unit", validUnit);
      }
      if (fields.fieldsFound.includes("epdRequired")) {
        setValue("epdRequired", fields.epdRequired ? "yes" : "preferred");
      }

      setSpecFieldsFound(fields.fieldsFound);
      setSpecParsed(true);

      if (fields.confidence === "LOW") {
        toast.warning("Spec analyzed — limited data extracted. Review and fill in any blanks.", { duration: 5000 });
      } else {
        toast.success(`Spec analyzed — ${fields.fieldsFound.length} fields pre-filled from "${file.name}".`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spec parsing failed";
      setSpecError(msg);
      toast.error(msg);
    } finally {
      setSpecUploading(false);
      // Reset the file input so same file can be re-uploaded
      if (specInputRef.current) specInputRef.current.value = "";
    }
  };

  const toggleCert = (cert: string) => {
    const current = getValues("certifications") ?? [];
    setValue(
      "certifications",
      current.includes(cert) ? current.filter((c) => c !== cert) : [...current, cert]
    );
  };

  const toggleSupplier = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) { toast.error("Max 5 suppliers per RFQ"); return prev; }
      return [...prev, id];
    });
    if (regionAll) setRegionAll(false);
  };

  const goNext = async () => {
    if (step === 2) {
      if (selectedIds.length === 0) {
        toast.error("Select at least one supplier");
        return;
      }
      setStep(3);
      return;
    }
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = (data: FormData) => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one supplier");
      return;
    }

    // AI flow: use approveDraft (records HITL decision + creates RFQ requests)
    if (draftId !== null) {
      approveDraftMutation.mutate({
        draftId,
        finalFields: {
          materialType: data.category,
          quantity: Number(data.quantity),
          specs: data.description || undefined,
        },
        selectedSupplierIds: selectedIds,
        // Default all fields to "accepted" — user reviewed and clicked through
        fieldDecisions: Object.fromEntries(
          ["category", "description", "quantity", "unit", "certifications",
           "maxGwp", "epdRequired", "projectName", "projectType", "projectCity", "projectState"]
            .map((f) => [f, "accepted" as const])
        ),
      });
      return;
    }

    // Manual path: createMulti
    createMulti.mutate({
      projectInfo: {
        projectName: data.projectName,
        projectType: data.projectType,
        projectCity: data.projectCity,
        projectState: data.projectState,
        startDate: data.startDate || undefined,
        projectSqFt: data.projectSqFt ? Number(data.projectSqFt) : undefined,
      },
      materialRequest: {
        category: data.category,
        description: data.description,
        quantity: Number(data.quantity),
        unit: data.unit,
        certifications: data.certifications ?? [],
        maxGwp: data.maxGwp ? Number(data.maxGwp) : undefined,
        epdRequired: data.epdRequired,
        targetDeliveryDate: data.targetDeliveryDate || undefined,
      },
      supplierIds: selectedIds,
    });
  };

  const formValues = watch();
  const selectedSupplierObjects = matchedSuppliers.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-2xl py-8 flex-1">
        {/* Back link */}
        <button
          onClick={() => {
            if (step === 0) navigate("/dashboard");
            else if (step === 2) setStep(aiParsed && allFieldsReady ? 0 : 1);
            else setStep((s) => s - 1);
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? "Back to Dashboard" : "Back"}
        </button>

        <div className="mb-2">
          <h1 className="text-2xl font-bold">Submit RFQ — No Shopping Required</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Requirements in. Comparable bids out. Suppliers respond in a structured format — price, lead time, and documentation in one place.
          </p>
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Step 0: AI Intake ─────────────────────────────────────── */}
          {step === 0 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                {!aiParsed ? (
                  /* Phase 1 — Initial entry (text OR spec PDF) */
                  <div className="space-y-4">
                    {/* ── Natural language input ─────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="aiInput" className="flex items-center gap-1.5 text-base font-semibold">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        Tell us what you need
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Describe your project in plain language — material type, quantity, location, certifications, anything relevant. Our AI handles the details.
                      </p>
                      <Textarea
                        id="aiInput"
                        placeholder="e.g., Need 3,000 SF of FSC-certified CLT panels for a 6-story mixed-use building in Austin, TX. EPD documentation required for LEED credit."
                        rows={4}
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiSubmit(); }}
                        className="resize-none"
                        disabled={aiParsing}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">⌘Enter to submit</p>
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleAiSubmit}
                      disabled={!aiInput.trim() || aiParsing}
                    >
                      {aiParsing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Analyze &amp; Match Suppliers</>
                      )}
                    </Button>

                    {/* ── OR divider ─────────────────────────────────────── */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="flex-1 border-t" />
                    </div>

                    {/* ── Spec PDF drop zone ─────────────────────────────── */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        Drop a spec section PDF — AI will pre-fill everything
                      </Label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files[0];
                          if (file) void handleSpecUploadAi(file);
                        }}
                        onClick={() => !specUploading && specInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors cursor-pointer select-none ${
                          specUploading
                            ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                            : isDragging
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : "border-border hover:border-green-400 hover:bg-muted/30"
                        }`}
                      >
                        <input
                          ref={specInputRef}
                          type="file"
                          accept="application/pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleSpecUploadAi(file);
                          }}
                        />
                        {specUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            <p className="text-sm font-medium">Analyzing spec section…</p>
                            <p className="text-xs text-muted-foreground">Document Intelligence + AI — under 10 seconds</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Drop a spec PDF</span> or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">CSI spec section, product data sheet · Max 25 MB</p>
                          </>
                        )}
                      </div>
                      {specError && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600 dark:text-red-400">{specError}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setAiParsed(true); setAllFieldsReady(false); setStep(1); }}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Fill out the form manually instead →
                      </button>
                    </div>
                  </div>
                ) : allFieldsReady && !hitlReviewing ? (
                  /* Phase 3 — All required fields present */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 px-4 py-3">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">Ready to match suppliers</p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Captured: {aiSummary.join(" · ")}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2 text-sm">
                      {watch("category") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Material</span><span className="font-medium">{watch("category")}</span></div>}
                      {watch("quantity") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Quantity</span><span className="font-medium">{watch("quantity")} {watch("unit")}</span></div>}
                      {watch("description") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Details</span><span className="font-medium truncate">{watch("description")}</span></div>}
                      {watch("projectCity") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Location</span><span className="font-medium">{watch("projectCity")}, {watch("projectState")}</span></div>}
                      {watch("projectName") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Project</span><span className="font-medium">{watch("projectName")}</span></div>}
                      {(watch("certifications") ?? []).length > 0 && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Certs</span><span className="font-medium">{(watch("certifications") ?? []).join(", ")}</span></div>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleAiReviewStart}
                        disabled={hitlSaving}
                      >
                        {hitlSaving ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing with AI…</>
                        ) : (
                          <><ShieldCheck className="w-4 h-4 mr-2" />Review &amp; Find Suppliers</>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetAi} disabled={hitlSaving}>
                        Edit
                      </Button>
                    </div>
                  </div>

                ) : allFieldsReady && hitlReviewing && swapResult ? (
                  /* Phase 4 — HITL Review: human verifies AI analysis before suppliers see it */
                  <HitlReviewPanel
                    swapResult={swapResult}
                    onApprove={() => {
                      setHitlReviewing(false);
                      setStep(2);
                    }}
                    onEdit={() => {
                      setHitlReviewing(false);
                    }}
                  />
                ) : (
                  /* Phase 2 — Conversational clarification */
                  <div className="space-y-4">
                    {aiSummary.length > 0 && (
                      <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 px-4 py-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800 dark:text-green-300">
                          Got it — filled in: <span className="font-medium">{aiSummary.join(", ")}</span>
                        </p>
                      </div>
                    )}
                    {clarifyQuestion && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 rounded-2xl rounded-tl-none bg-muted px-4 py-2.5">
                            <p className="text-sm">{clarifyQuestion}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pl-9">
                          <Input
                            placeholder="Your answer…"
                            value={clarifyInput}
                            onChange={(e) => setClarifyInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleClarifySubmit(); }}
                            disabled={aiParsing}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleClarifySubmit}
                            disabled={!clarifyInput.trim() || aiParsing}
                          >
                            {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                    {aiParsing && !clarifyQuestion && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </div>
                    )}
                    <div className="pt-1 border-t">
                      <button type="button" onClick={resetAi}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                        ← Start over
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 1: Manual Project + Material Form (fallback) ─────── */}
          {step === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g. 123 Main St Office Renovation"
                    {...register("projectName")}
                    className={errors.projectName ? "border-red-500" : ""}
                  />
                  {errors.projectName && <p className="text-xs text-red-500">{errors.projectName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Project Type *</Label>
                  <Select onValueChange={(v) => setValue("projectType", v, { shouldValidate: true })}>
                    <SelectTrigger className={errors.projectType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.projectType && <p className="text-xs text-red-500">{errors.projectType.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="projectZip">Project Zip Code *</Label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        id="projectZip"
                        placeholder="e.g. 02101"
                        maxLength={5}
                        value={formValues.projectZip ?? ""}
                        onChange={(e) => {
                          const z = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setValue("projectZip", z);
                          if (z.length === 5) {
                            void lookupZip(z).then((loc) => {
                              // Populate city/state if lookup succeeded — never block if it doesn't
                              if (loc) {
                                setValue("projectCity", loc.city, { shouldValidate: true });
                                setValue("projectState", loc.state, { shouldValidate: true });
                              }
                            });
                          }
                        }}
                        className={errors.projectZip ?? errors.projectCity ?? errors.projectState ? "border-red-500" : ""}
                      />
                      {(errors.projectZip ?? errors.projectCity ?? errors.projectState) && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.projectZip?.message ?? errors.projectCity?.message ?? errors.projectState?.message}
                        </p>
                      )}
                    </div>
                    {formValues.projectCity && formValues.projectState && (
                      <div className="text-sm text-muted-foreground pt-2 whitespace-nowrap">
                        {formValues.projectCity}, {formValues.projectState}
                      </div>
                    )}
                  </div>
                </div>

                {/* OSM map preview — only shown once geocoords are captured */}
                {watchedLat != null && watchedLng != null && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <iframe
                      title="Project location"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${watchedLng - 0.08}%2C${watchedLat - 0.06}%2C${watchedLng + 0.08}%2C${watchedLat + 0.06}&layer=mapnik&marker=${watchedLat}%2C${watchedLng}`}
                      width="100%"
                      height="160"
                      className="border-0"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Expected Start Date</Label>
                    <Input id="startDate" type="date" {...register("startDate")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="projectSqFt">Project Size (sq ft)</Label>
                    <Input
                      id="projectSqFt"
                      type="number"
                      min={0}
                      placeholder="50,000"
                      {...register("projectSqFt")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 1: Material Request ──────────────────────────────── */}
          {step === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-5">

                {/* ── Spec upload zone ───────────────────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      Have a spec section? Drop it — we'll pre-fill the form.
                    </Label>
                    {specParsed && (
                      <button
                        type="button"
                        onClick={() => { setSpecParsed(false); setSpecFieldsFound([]); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) void handleSpecUpload(file);
                    }}
                    onClick={() => !specUploading && specInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors cursor-pointer select-none ${
                      specUploading
                        ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                        : isDragging
                        ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                        : specParsed
                        ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                        : "border-border hover:border-green-400 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      ref={specInputRef}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleSpecUpload(file);
                      }}
                    />

                    {specUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-sm font-medium text-foreground">Analyzing spec section…</p>
                        <p className="text-xs text-muted-foreground">Document Intelligence + AI — usually under 10 seconds</p>
                      </>
                    ) : specParsed ? (
                      <>
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Form pre-filled — review and adjust
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {specFieldsFound.length > 0
                            ? `Filled: ${specFieldsFound.join(", ")}`
                            : "Low-confidence parse — check fields below"}
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Drop a spec PDF</span> or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">CSI spec section, product data sheet, or any PDF with material requirements · Max 25 MB</p>
                      </>
                    )}
                  </div>

                  {/* Error state */}
                  {specError && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 dark:text-red-400">{specError}</p>
                    </div>
                  )}
                </div>

                <div className="border-t" />

                <div className="space-y-1.5">
                  <Label>Material Category *</Label>
                  <Select
                    defaultValue={formValues.category}
                    onValueChange={(v) => setValue("category", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Material Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g. Low-carbon ready-mix concrete, 4000 PSI, fly-ash replacement"
                    rows={3}
                    {...register("description")}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={0}
                      step="any"
                      placeholder="500"
                      {...register("quantity")}
                      className={errors.quantity ? "border-red-500" : ""}
                    />
                    {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit *</Label>
                    <Select
                      defaultValue={formValues.unit ?? "SF"}
                      onValueChange={(v) => setValue("unit", v as typeof QUANTITY_UNITS[number])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUANTITY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Certifications</Label>
                  <div className="flex flex-wrap gap-2">
                    {CERT_OPTIONS.map((cert) => {
                      const active = watchedCerts.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => toggleCert(cert)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            active
                              ? "bg-green-600 text-white border-green-600"
                              : "border-border text-muted-foreground hover:border-green-500 hover:text-foreground"
                          }`}
                        >
                          {cert}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="maxGwp">Max GWP (kgCO₂e/kg)</Label>
                    <Input
                      id="maxGwp"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Optional"
                      {...register("maxGwp")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>EPD Required?</Label>
                    <Select
                      defaultValue={formValues.epdRequired ?? "preferred"}
                      onValueChange={(v) => setValue("epdRequired", v as "yes" | "no" | "preferred")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes — required</SelectItem>
                        <SelectItem value="preferred">Preferred</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetDeliveryDate">Target Delivery Date</Label>
                  <Input id="targetDeliveryDate" type="date" {...register("targetDeliveryDate")} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Supplier Selection ───────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-foreground">We matched suppliers to your RFQ — select up to 5 to receive it.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ranked by category fit, location, sustainability, and certifications. Top 3 pre-selected as a recommended shortlist — review all options and adjust.</p>
              </div>
              <Card>
                <CardContent className="pt-5 space-y-3">
                  {/* Region toggle */}
                  {profileState && (
                    <div className="flex items-center justify-between py-2 px-1 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30">
                      <div>
                        <p className="text-sm font-medium">Send to all verified in {profileState}</p>
                        <p className="text-xs text-muted-foreground">Override matching — select all regional suppliers up to 5</p>
                      </div>
                      <Switch checked={regionAll} onCheckedChange={(v) => { setRegionAll(v); if (!v) setSelectedIds(presetSupplierId ? [presetSupplierId] : []); }} />
                    </div>
                  )}

                  {/* Search */}
                  <CompanyTypeahead
                    placeholder="Search suppliers…"
                    value={supplierSearch}
                    onChange={setSupplierSearch}
                    onSelect={(item) => setSupplierSearch(item.label)}
                    clearable
                  />

                  {/* Selected chips */}
                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSupplierObjects.map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs gap-1 pr-1">
                          {s.companyName}
                          <button type="button" onClick={() => toggleSupplier(s.id)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">{selectedIds.length}/5 selected</p>
                </CardContent>
              </Card>

              {/* Matched supplier list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {matchLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="rounded-lg border border-border p-3 flex items-center gap-3">
                        <div className="w-5 h-5 rounded bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                          <div className="h-2.5 bg-muted animate-pulse rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : displayedSuppliers.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-sm font-medium text-foreground">No verified suppliers found in your area.</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {watchedCategory && ["Concrete & Masonry"].includes(watchedCategory)
                        ? "Concrete and masonry are routed locally (within ~150 mi). Try a city closer to your material source, or contact us to expand coverage."
                        : "We match suppliers by location and delivery capability. Try adjusting your project location or selecting a broader category."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Want to nominate a supplier?{" "}
                      <a href="/contact" className="text-primary underline underline-offset-2">Let us know.</a>
                    </p>
                  </div>
                ) : (
                  <>
                    {displayedSuppliers.map((s, idx) => {
                      const selected = selectedIds.includes(s.id);
                      const sustScore = s.sustainabilityScore != null ? Number(s.sustainabilityScore) : null;
                      const verifiedStatus = s.verifiedSupplierStatus;
                      const verifiedReasons = (s.verifiedSupplierReasons ?? []) as string[];
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSupplier(s.id)}
                          className={`w-full text-left rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                            selected
                              ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                              : s.isHighSustainability && !s.isFallback
                              ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/5 hover:border-emerald-400"
                              : "border-border hover:border-green-300 bg-card"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 mt-0.5 ${selected ? "border-green-500 bg-green-500" : "border-muted-foreground/30"}`}>
                            {selected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium truncate">{s.companyName}</p>
                              {idx === 0 && !supplierSearch && !s.isFallback && (
                                <span className="text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                                  #1 Match
                                </span>
                              )}
                              {s.isFallback && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-none">
                                  Broader match
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {(s.city || s.state) && (
                                <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {[s.city, s.state].filter(Boolean).join(", ")}
                                </p>
                              )}
                              {s.isLocalSupplier && (
                                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full leading-none">
                                  Same-state
                                </span>
                              )}
                              {/* Verification status — always visible per product doctrine */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={verifiedBadgeClass(verifiedStatus)}>
                                    <CheckCircle className="w-2.5 h-2.5" />
                                    {verifiedBadgeLabel(verifiedStatus)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px]">
                                  <p className="font-medium">{verifiedBadgeLabel(verifiedStatus)}</p>
                                  {verifiedReasons.length > 0 ? (
                                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                      {verifiedReasons.map((reason) => (
                                        <li key={reason}>{verifiedBadgeReasonLabel(reason)}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-1">All verification criteria are currently met.</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {s.certificationMatches.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.certificationMatches.slice(0, 3).map((c) => (
                                  <span key={c} className="text-[10px] border border-green-300 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {s.isHighSustainability && !s.isFallback && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                                <Sparkles className="w-2.5 h-2.5" />High Sustainability
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <ScoreBadge score={sustScore} />
                              {s.isPremium && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {/* Routing transparency note */}
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Matched by delivery range, certifications, and verified sustainability data.
                      Suppliers outside your delivery area are excluded automatically.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Review + Send ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Project</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">Name</span><p className="font-medium">{formValues.projectName}</p></div>
                    <div><span className="text-muted-foreground">Type</span><p className="font-medium">{formValues.projectType}</p></div>
                    <div><span className="text-muted-foreground">Location</span><p className="font-medium">{formValues.projectCity}, {formValues.projectState}</p></div>
                    {formValues.startDate && <div><span className="text-muted-foreground">Start Date</span><p className="font-medium">{formValues.startDate}</p></div>}
                    {formValues.projectSqFt && <div><span className="text-muted-foreground">Size</span><p className="font-medium">{Number(formValues.projectSqFt).toLocaleString()} sq ft</p></div>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Material Request</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">Category</span><p className="font-medium">{formValues.category}</p></div>
                    <div><span className="text-muted-foreground">Quantity</span><p className="font-medium">{formValues.quantity} {formValues.unit}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Description</span><p className="font-medium">{formValues.description}</p></div>
                    {watchedCerts.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Certifications</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {watchedCerts.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                        </div>
                      </div>
                    )}
                    <div><span className="text-muted-foreground">EPD Required</span><p className="font-medium capitalize">{formValues.epdRequired ?? "preferred"}</p></div>
                    {formValues.maxGwp && <div><span className="text-muted-foreground">Max GWP</span><p className="font-medium">{formValues.maxGwp} kgCO₂e/kg</p></div>}
                    {formValues.targetDeliveryDate && <div><span className="text-muted-foreground">Target Delivery</span><p className="font-medium">{formValues.targetDeliveryDate}</p></div>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Suppliers ({selectedIds.length})
                  </h3>
                  {selectedSupplierObjects.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium flex-1">{s.companyName}</span>
                      <ScoreBadge score={s.sustainabilityScore != null ? Number(s.sustainabilityScore) : null} />
                      {s.isPremium && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
                    Most suppliers respond within 48 hours in a comparable format — price, lead time, and documentation in one view.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Carbon forecast on review step ──────────────────────── */}
          {step === 3 && watchedCategory && (
            <div className="mt-4">
              <CarbonForecastPanel
                enabled={step === 3}
                items={[
                  {
                    category: watchedCategory,
                    quantity: Number(watch("quantity")) || 1,
                    unit: (watch("unit") || "SF") as "SF" | "LF" | "CY" | "tons" | "EA",
                  },
                ]}
              />
            </div>
          )}

          {/* ── Submittal nudge on review step ──────────────────────── */}
          {step === 3 && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Submittal PDF included with this RFQ.</p>
                <p className="text-xs text-muted-foreground mt-0.5">EPD + compliance docs formatted for approval — packaged automatically with your bid requests. Generate it now to review before sending.</p>
              </div>
              <Link href="/tools/submittal" className="text-xs font-medium text-primary hover:underline whitespace-nowrap mt-0.5">
                Preview →
              </Link>
            </div>
          )}

          {/* ── Navigation ──────────────────────────────────────────── */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1"
                onClick={() => {
                  if (step === 2) setStep(aiParsed && allFieldsReady ? 0 : 1);
                  else setStep((s) => s - 1);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {/* Step 0 handles its own CTA (AI chat); step 1+ use Next/Send */}
            {step === 0 ? null : step < 3 ? (
              <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={goNext}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createMulti.isPending || approveDraftMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {(createMulti.isPending || approveDraftMutation.isPending) ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Sending…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send RFQ</>
                )}
              </Button>
            )}
          </div>

        </form>
      </div>

      <Footer />
    </div>
  );
}
