import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatWidgetProvider } from "./contexts/ChatWidgetContext";
// CookieConsentBanner removed — CookieYes (index.html) handles consent
// VIDEO CALLING — cut for launch, restore when ACS is implemented
// import { IncomingCallNotification } from "./components/messaging/IncomingCallNotification";
// import { WebRTCVideoCall } from "./components/messaging/WebRTCVideoCall";
import { SupplierLayout } from "./components/SupplierLayout";
import { lazy, Suspense, useEffect, useState } from "react";
import { useWebPubSub } from "./hooks/useWebPubSub";
import { useAuth } from "./contexts/AuthContext";
import { trpc } from "./lib/trpc";
import { initGoogleAnalytics, trackGooglePageView } from "./lib/analytics";
import SEOHead from "./components/SEOHead";

const HUBSPOT_SCRIPT_SRC = "https://js-na2.hs-scripts.com/244354228.js";
const TRAILING_SLASH_REGEX = /\/+$/;
const ROUTE_SEO_FALLBACKS: Record<string, { title: string; description: string; canonicalPath: string }> = {
  "/assemblies": {
    title: "Assemblies Carbon Compare Tool | GreenChainz",
    description:
      "Compare full building assemblies by embodied carbon and compliance readiness. Find lower-carbon, specification-ready alternatives.",
    canonicalPath: "/assemblies",
  },
  "/carbon-compare": {
    title: "Carbon Compare for Building Materials | GreenChainz",
    description:
      "Benchmark assembly and material carbon impact with verified EPD data, then identify practical lower-carbon substitutions.",
    canonicalPath: "/carbon-compare",
  },
  "/compare": {
    title: "Compare Sustainable Materials Side by Side | GreenChainz",
    description:
      "Compare sustainable building materials side by side using EPD-backed data, compliance signals, and procurement-ready metrics.",
    canonicalPath: "/compare",
  },
  "/excel-audit": {
    title: "Excel Audit Tool for EPD Compliance | GreenChainz",
    description:
      "Upload your material schedule and run a fast EPD and compliance audit to find risks, gaps, and better alternatives.",
    canonicalPath: "/excel-audit",
  },
  "/get-started": {
    title: "Get Started with GreenChainz",
    description:
      "Create your GreenChainz account to source verified sustainable materials, run RFQs, and track procurement compliance.",
    canonicalPath: "/get-started",
  },
  "/insider": {
    title: "GreenChainz Insider",
    description:
      "Access GreenChainz Insider for product updates, sustainability insights, and procurement strategies for building teams.",
    canonicalPath: "/insider",
  },
  "/manufacturers": {
    title: "Supplier Spotlight: Emerging Sustainable Manufacturers | GreenChainz",
    description:
      "A curated spotlight on new and emerging sustainable material manufacturers. To source, search materials by carbon, EPD, price and lead time — or start an RFQ.",
    canonicalPath: "/manufacturers",
  },
  "/privacy": {
    title: "Privacy Policy | GreenChainz",
    description:
      "Read how GreenChainz collects, uses, and protects account and project information across our procurement platform.",
    canonicalPath: "/privacy",
  },
  "/supplier/register": {
    title: "Supplier Registration | GreenChainz",
    description:
      "Register your company as a GreenChainz supplier to showcase verified products and receive matched project RFQs.",
    canonicalPath: "/supplier/register",
  },
  "/support": {
    title: "Support | GreenChainz",
    description:
      "Contact GreenChainz support for onboarding, product help, and procurement workflow questions from your team.",
    canonicalPath: "/support",
  },
  "/terms": {
    title: "Terms of Service | GreenChainz",
    description:
      "Review GreenChainz terms of service, platform use requirements, and supplier and buyer responsibilities.",
    canonicalPath: "/terms",
  },
  "/tools": {
    title: "Sustainable Procurement Tools | GreenChainz",
    description:
      "Explore GreenChainz tools for carbon comparison, Excel auditing, submittals, and digital procurement workflows.",
    canonicalPath: "/tools",
  },
  "/tools/extension": {
    title: "Browser Extension for Greenwashing Detection | GreenChainz",
    description:
      "Use the GreenChainz browser extension to surface sustainability claim risks and verify material data in real time.",
    canonicalPath: "/tools/extension",
  },
  "/tools/submittal": {
    title: "Submittal Generator for Sustainable Materials | GreenChainz",
    description:
      "Generate compliance-ready submittal packages with verified material data, EPD context, and documentation links.",
    canonicalPath: "/tools/submittal",
  },
  "/blog": {
    title: "GreenChainz Blog | SEO + AEO for Sustainable Procurement",
    description:
      "Question-first content for architects and suppliers on compliance, sourcing workflows, and sustainable material execution.",
    canonicalPath: "/blog",
  },
};

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const withoutQuery = pathname.split(/[?#]/)[0] || "/";
  return withoutQuery.replace(TRAILING_SLASH_REGEX, "") || "/";
}

// Lazy-loaded page components — each becomes its own async chunk
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const ExcelAudit = lazy(() => import("./pages/ExcelAudit"));
const ExcelAuditWorkingTool = lazy(() => import("./pages/ExcelAuditWorkingTool"));
const BrowserExtension = lazy(() => import("./pages/BrowserExtension"));
const RevitPlugin = lazy(() => import("./pages/RevitPlugin"));
const SubmittalGenerator = lazy(() => import("./pages/SubmittalGenerator"));
const MaterialsCatalog = lazy(() => import("./pages/MaterialsCatalog"));
const MaterialDetail = lazy(() => import("./pages/MaterialDetail"));
const Assemblies = lazy(() => import("./pages/Assemblies"));
const RfqCart = lazy(() => import("./pages/RfqCart"));
const RFQForm = lazy(() => import("./pages/RFQForm"));
const RfqDetail = lazy(() => import("./pages/RfqDetail"));
const Compare = lazy(() => import("./pages/Compare"));
const CarbonCompare = lazy(() => import("./pages/CarbonCompare"));
const CarbonDashboard = lazy(() => import("./pages/CarbonDashboard"));
const BuyerRfqDashboard = lazy(() => import("./pages/BuyerRfqDashboard"));
const RfqDashboard = lazy(() => import("./pages/RfqDashboard"));
const SupplierRegistration = lazy(() =>
  import("./pages/SupplierRegistration").then((m) => ({ default: m.SupplierRegistration }))
);
const SupplierProfileDashboard = lazy(() =>
  import("./pages/SupplierProfileDashboard").then((m) => ({ default: m.SupplierProfileDashboard }))
);
const SupplierRfqDashboard = lazy(() => import("./pages/SupplierRfqDashboard"));
const Tools = lazy(() => import("./pages/Tools"));
const GetStarted = lazy(() => import("./pages/GetStarted"));
const SupplierOnboarding = lazy(() => import("./pages/SupplierOnboarding"));
const ArchitectOnboarding = lazy(() => import("./pages/ArchitectOnboarding"));
const ArchitectDashboard = lazy(() => import("./pages/ArchitectDashboard"));
const ArchitectSpecsUpload = lazy(() => import("./pages/ArchitectSpecsUpload"));
const ArchitectSpecDetail = lazy(() => import("./pages/ArchitectSpecDetail"));
const ArchitectSpecsList = lazy(() => import("./pages/ArchitectSpecsList"));
const MaterialSearchPage = lazy(() => import("./pages/MaterialSearchPage"));
const TCOCalculatorPage = lazy(() => import("./pages/TCOCalculatorPage"));
const RFQNewPage = lazy(() => import("./pages/RFQNewPage"));
const RFQDetailPage = lazy(() => import("./pages/rfq/RFQDetailPage"));
const RFQListPage = lazy(() => import("./pages/rfq/RFQListPage"));
const MaterialCreditScorePage = lazy(() => import("./pages/MaterialCreditScorePage"));
const Messages = lazy(() => import("./pages/Messages"));
const Subscription = lazy(() => import("./pages/Subscription"));
const AdminVerificationQueue = lazy(() => import("./pages/AdminVerificationQueue"));
const AdminSupplierDashboard = lazy(() =>
  import("./pages/AdminSupplierDashboard").then((m) => ({ default: m.AdminSupplierDashboard }))
);
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminManufacturers = lazy(() => import("./pages/AdminManufacturers"));
const CrmDashboard = lazy(() => import("./pages/admin/CrmDashboard"));
const ConciergeDashboard = lazy(() => import("./pages/admin/ConciergeDashboard"));
const AboutVideos = lazy(() => import("./pages/admin/AboutVideos"));
const SupplierSpecSubmission = lazy(() => import("./pages/SupplierSpecSubmission"));
const MaterialSwap = lazy(() => import("./pages/MaterialSwap"));
const CarbonWin = lazy(() => import("./pages/CarbonWin"));
const InsiderPage = lazy(() => import("./pages/InsiderPage"));
const ArcadePage = lazy(() => import("./pages/ArcadePage"));
const ManufacturerDirectory = lazy(() => import("./pages/ManufacturerDirectory"));
const ManufacturerProfile = lazy(() => import("./pages/ManufacturerProfile"));
const SupplierAgentConfig = lazy(() => import("./pages/SupplierAgentConfig"));
const SupplierMaterials = lazy(() => import("./pages/SupplierMaterials"));
const SupplierBulkUpload = lazy(() => import("./pages/SupplierBulkUpload"));
const SupplierAnalytics = lazy(() => import("./pages/SupplierAnalytics"));
const SupplierFilterSetup = lazy(() => import("./pages/SupplierFilterSetup"));
const Terms = lazy(() => import("./pages/Terms").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));
const HowItWorks = lazy(() => import("./pages/HowItWorks").then((m) => ({ default: m.HowItWorks })));
const Support = lazy(() => import("./pages/Support"));
const Login = lazy(() => import("./pages/Login"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ForSuppliers = lazy(() => import("./pages/ForSuppliers"));
const Features = lazy(() => import("./pages/Features"));
const FounderVideoNew = lazy(() => import("./pages/FounderVideoNew"));
const FounderVideoList = lazy(() => import("./pages/FounderVideoList"));
const FounderVideoWatch = lazy(() => import("./pages/FounderVideoWatch"));
const FounderVideoDashboard = lazy(() => import("./pages/FounderVideoDashboard"));
const CreateSourcingRequestPage = lazy(() => import("./pages/CreateSourcingRequestPage"));
const SourcingRequestDetailPage = lazy(() => import("./pages/SourcingRequestDetailPage"));
const BuyerRequestsPage = lazy(() => import("./pages/BuyerRequestsPage"));
const SupplierRespondPage = lazy(() => import("./pages/SupplierRespondPage"));
const SubmittalLogPage = lazy(() => import("./pages/SubmittalLogPage"));
const CADocumentsPage = lazy(() => import("./pages/CADocumentsPage"));
const ClaimProfile = lazy(() => import("./pages/ClaimProfile"));
const IntercomWidget = lazy(() => import("./components/IntercomWidget"));
const ChatWidget = lazy(() => import("./components/ChatWidget").then((m) => ({ default: m.ChatWidget })));
const ArcadeHost = lazy(() => import("./components/arcade/ArcadeHost"));

function RouteSeoFallback() {
  const [location] = useLocation();
  const normalizedPath = normalizePathname(location);
  const isAssemblyDetailPath = normalizedPath.startsWith("/assemblies/");
  const fallback = isAssemblyDetailPath
    ? ROUTE_SEO_FALLBACKS["/assemblies"]
    : ROUTE_SEO_FALLBACKS[normalizedPath];

  if (!fallback) {
    return null;
  }

  return (
    <SEOHead
      title={fallback.title}
      description={fallback.description}
      canonicalPath={isAssemblyDetailPath ? normalizedPath : fallback.canonicalPath}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/get-started"} component={GetStarted} />
      <Route path={"/materials"} component={MaterialsCatalog} />
      <Route path={"/materials/:materialId/score"} component={MaterialCreditScorePage} />
      <Route path={"/materials/:id"} component={MaterialDetail} />
      <Route path={"/assemblies"} component={Assemblies} />
      <Route path={"/assemblies/:id"} component={Assemblies} />
      <Route path={"/rfq"} component={RfqCart} />
      <Route path={"/rfq-form"} component={RFQForm} />
      <Route path="/rfq/new" component={RFQNewPage} />
      <Route path="/rfq/:id" component={RfqDetail} />
      <Route path="/rfqs" component={RFQListPage} />
      <Route path="/rfqs/:rfqId" component={RFQDetailPage} />
      <Route path="/insider" component={InsiderPage} />
      <Route path="/arcade" component={ArcadePage} />
      <Route path="/manufacturers" component={ManufacturerDirectory} />
      <Route path="/manufacturers/:id" component={ManufacturerProfile} />
      <Route path="/compare" component={Compare} />
      <Route path="/carbon-compare" component={CarbonCompare} />
      <Route path="/carbon-dashboard" component={CarbonDashboard} />
      <Route path="/supplier-dashboard">{() => <Redirect to="/supplier/dashboard" />}</Route>
      <Route path="/rfq-dashboard" component={BuyerRfqDashboard} />
      <Route path="/rfq-status" component={RfqDashboard} />
      <Route path="/supplier/onboarding" component={SupplierOnboarding} />
      <Route path="/architect/onboarding" component={ArchitectOnboarding} />
      <Route path="/architect/specs" component={ArchitectSpecsList} />
      <Route path="/architect/specs/upload" component={ArchitectSpecsUpload} />
      <Route path="/architect/specs/:specId" component={ArchitectSpecDetail} />
      <Route path="/search" component={MaterialSearchPage} />
      <Route path="/supplier/register" component={SupplierRegistration} />
      <Route path="/suppliers/claim" component={ClaimProfile} />
      <Route path="/supplier/dashboard">{() => <SupplierLayout><SupplierProfileDashboard /></SupplierLayout>}</Route>
      <Route path="/supplier/rfqs">{() => <SupplierLayout><SupplierRfqDashboard /></SupplierLayout>}</Route>
      <Route path="/supplier/submit-spec">{() => <SupplierLayout><SupplierSpecSubmission /></SupplierLayout>}</Route>
      <Route path="/supplier/agent-config">{() => <SupplierLayout><SupplierAgentConfig /></SupplierLayout>}</Route>
      <Route path="/supplier/materials">{() => <SupplierLayout><SupplierMaterials /></SupplierLayout>}</Route>
      <Route path="/supplier/upload">{() => <SupplierLayout><SupplierBulkUpload /></SupplierLayout>}</Route>
      <Route path="/supplier/analytics">{() => <SupplierLayout><SupplierAnalytics /></SupplierLayout>}</Route>
      <Route path="/supplier/filters">{() => <SupplierLayout><SupplierFilterSetup /></SupplierLayout>}</Route>
      <Route path="/material-swap" component={MaterialSwap} />
      <Route path="/win" component={CarbonWin} />
      <Route path="/messages" component={Messages} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/verification" component={AdminVerificationQueue} />
      <Route path="/admin/verification-queue">{() => <Redirect to="/admin/verification" />}</Route>
      <Route path="/admin/suppliers" component={AdminSupplierDashboard} />
      <Route path="/admin/manufacturers" component={AdminManufacturers} />
      <Route path="/admin/users">{() => <Redirect to="/admin?tab=users" />}</Route>
      <Route path="/admin/crm" component={CrmDashboard} />
      <Route path="/admin/concierge" component={ConciergeDashboard} />
      <Route path="/admin/about-videos" component={AboutVideos} />
      <Route path="/admin/founder-videos" component={FounderVideoList} />
      <Route path="/admin/founder-videos/analytics" component={FounderVideoDashboard} />
      <Route path="/admin/founder-videos/new" component={FounderVideoNew} />
      <Route path="/v/:token" component={FounderVideoWatch} />
      <Route path="/excel-audit" component={ExcelAudit} />
      <Route path="/excel-audit-tool" component={ExcelAuditWorkingTool} />
      <Route path={"/about"} component={About} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={BlogPostPage} />
      <Route path={"/tools"} component={Tools} />
      <Route path={"/tools/extension"} component={BrowserExtension} />
      <Route path={"/tools/revit"} component={RevitPlugin} />
      <Route path={"/tools/submittal"} component={SubmittalGenerator} />
      <Route path={"/tools/assemblies"} component={Assemblies} />
      <Route path={"/tools/assemblies/:id"} component={Assemblies} />
      <Route path={"/tools/tco"} component={TCOCalculatorPage} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/support"} component={Support} />
      <Route path={"/how-it-works"} component={HowItWorks} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/for-suppliers"} component={ForSuppliers} />
      <Route path={"/features"} component={Features} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={ArchitectDashboard} />
      {/* ── Smart RFx Builder ─────────────────────────────────────────── */}
      <Route path="/buyer/new-request" component={CreateSourcingRequestPage} />
      <Route path="/buyer/requests" component={BuyerRequestsPage} />
      <Route path="/buyer/requests/:id" component={SourcingRequestDetailPage} />
      <Route path="/buyer/submittals" component={SubmittalLogPage} />
      <Route path="/architect/submittals" component={SubmittalLogPage} />
      <Route path="/buyer/ca" component={CADocumentsPage} />
      <Route path="/architect/ca" component={CADocumentsPage} />
      <Route path="/supplier/respond/:rfqId" component={SupplierRespondPage} />
      <Route path={"404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Redirect unauthenticated users away from protected routes
const PROTECTED_PREFIXES = [
  "/supplier/",
  "/architect/specs/",
  "/rfq-dashboard",
  "/rfq-status",
  "/rfq-form",
  "/rfq/",
  "/messages",
  "/subscription",
  "/admin/",
  "/dashboard",
  "/rfqs",
  "/buyer/",
];

function AuthGuard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (user) return;
    const path = window.location.pathname;
    const isProtected = PROTECTED_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p));
    if (isProtected) {
      navigate(`/login?returnPath=${encodeURIComponent(path)}`);
    }
  }, [user, isLoading, navigate]);

  return null;
}

function AnalyticsTracker() {
  const [location] = useLocation();

  useEffect(() => {
    let cancelled = false;

    const sendPageView = () => {
      if (cancelled) return;
      initGoogleAnalytics();
      trackGooglePageView(location);
    };

    const timer = globalThis.setTimeout(sendPageView, 800);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [location]);

  return null;
}

function HubSpotLoader() {
  useEffect(() => {
    // Use requestIdleCallback to defer HubSpot until the browser is idle,
    // preventing it from competing with initial render and hydration.
    const load = () => {
      const existingScript = document.getElementById("hs-script-loader");
      if (existingScript) return;

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.id = "hs-script-loader";
      script.async = true;
      script.defer = true;
      script.src = HUBSPOT_SCRIPT_SRC;
      document.head.appendChild(script);
    };

    let handle: number | undefined;
    if ("requestIdleCallback" in globalThis) {
      handle = globalThis.requestIdleCallback(load, { timeout: 5000 });
    } else {
      // Fallback for Safari (no rIC): use 4s timeout past LCP window
      handle = globalThis.setTimeout(load, 4000) as unknown as number;
    }

    return () => {
      if ("cancelIdleCallback" in globalThis && handle !== undefined) {
        globalThis.cancelIdleCallback(handle);
      } else {
        globalThis.clearTimeout(handle);
      }
    };
  }, []);

  return null;
}

// Redirect supplier users who haven't completed onboarding
function SupplierOnboardingGuard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isSupplierUser = user?.role === "supplier";

  const { data: profile, isLoading } = trpc.supplierOnboarding.getMyProfile.useQuery(undefined, {
    enabled: !!isSupplierUser,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isSupplierUser || isLoading) return;
    if (profile === null) {
      const path = window.location.pathname;
      if (!path.startsWith("/supplier/onboarding")) {
        navigate("/supplier/onboarding");
      }
    }
  }, [isSupplierUser, isLoading, profile, navigate]);

  return null;
}

// Redirect architect users who haven't completed onboarding.
// Architects are the default role — virtually all new SSO users land here.
// Skips the check if the user selected "supplier" as their pending role (sessionStorage),
// since they'll be handled by SupplierOnboardingGuard instead.
function ArchitectOnboardingGuard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isArchitectUser = user?.role === "architect";

  const { data: profile, isLoading } = trpc.architect.getMyProfile.useQuery(undefined, {
    enabled: !!isArchitectUser,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isArchitectUser || isLoading) return;
    if (profile === null) {
      const path = window.location.pathname;
      // Don't redirect if already on an onboarding page or login/public pages
      if (
        path.startsWith("/architect/onboarding") ||
        path.startsWith("/supplier/") ||
        path === "/login" ||
        path === "/" ||
        path === "/get-started" ||
        path === "/pricing" ||
        path === "/for-suppliers" ||
        path === "/features" ||
        path === "/about" ||
        path === "/terms" ||
        path === "/privacy" ||
        path === "/support" ||
        path === "/how-it-works" ||
        path === "/blog" ||
        path.startsWith("/blog/") ||
        path === "/manufacturers" ||
        path.startsWith("/manufacturers/") ||
        path === "/insider" ||
        path === "/win"
      ) {
        return;
      }
      navigate("/architect/onboarding");
    }
  }, [isArchitectUser, isLoading, profile, navigate]);

  return null;
}

// Inner component that uses hooks requiring AuthProvider context
function AppInner() {
  // VIDEO CALLING — cut for launch, restore when ACS is implemented
  // const [activeCall, setActiveCall] = useState<{...} | null>(null);
  // const handleAcceptCall = (callData: any) => { ... };

  const { user } = useAuth();
  const [showDeferredWidgets, setShowDeferredWidgets] = useState(false);

  useEffect(() => {
    let fired = false;
    const activate = () => {
      if (fired) return;
      fired = true;
      cleanup(); // eslint-disable-line @typescript-eslint/no-use-before-define
      setShowDeferredWidgets(true);
    };

    // Load Intercom/ChatWidget only on first user interaction.
    // This keeps them completely off the main thread during Lighthouse
    // measurement (no interaction → no Intercom JS → no TBT contribution).
    // Real users trigger this within milliseconds of engaging the page.
    const events = ["mousemove", "touchstart", "keydown", "scroll", "click"] as const;
    events.forEach((e) => window.addEventListener(e, activate, { once: true, passive: true }));

    const cleanup = () => events.forEach((e) => window.removeEventListener(e, activate));
    return cleanup;
  }, []);

  useWebPubSub();

  return (
    <ChatWidgetProvider>
      <TooltipProvider>
        <Toaster />
        <AuthGuard />
        <SupplierOnboardingGuard />
        <ArchitectOnboardingGuard />
        <AnalyticsTracker />
        <RouteSeoFallback />
        <HubSpotLoader />
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><span className="text-muted-foreground text-sm">Loading…</span></div>}>
          <Router />
        </Suspense>
        {/* Intercom support widget */}
        {showDeferredWidgets ? (
          <Suspense fallback={null}>
            <IntercomWidget />
          </Suspense>
        ) : null}
        {/* <IncomingCallNotification onAccept={handleAcceptCall} /> */}
        {/* <WebRTCVideoCall ... /> — restored when ACS signaling is complete */}
        {showDeferredWidgets && user ? (
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
        ) : null}
        {/* GreenChainz Arcade — hidden easter egg (Konami code + launcher). Client-only. */}
        <Suspense fallback={null}>
          <ArcadeHost />
        </Suspense>
        {/* CookieYes in index.html handles cookie consent */}
      </TooltipProvider>
    </ChatWidgetProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
