import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatWidgetProvider } from "./contexts/ChatWidgetContext";
import IntercomWidget from "./components/IntercomWidget";
// CookieConsentBanner removed — CookieYes (index.html) handles consent
// VIDEO CALLING — cut for launch, restore when ACS is implemented
// import { IncomingCallNotification } from "./components/messaging/IncomingCallNotification";
// import { WebRTCVideoCall } from "./components/messaging/WebRTCVideoCall";
import { ChatWidget } from "./components/ChatWidget";
import { SupplierLayout } from "./components/SupplierLayout";
import { lazy, Suspense, useEffect } from "react";
import { useWebPubSub } from "./hooks/useWebPubSub";
import { useAuth } from "./contexts/AuthContext";
import { trpc } from "./lib/trpc";
import { initGoogleAnalytics, trackGooglePageView } from "./lib/analytics";

// Lazy-loaded page components — each becomes its own async chunk
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const ExcelAudit = lazy(() => import("./pages/ExcelAudit"));
const ExcelAuditWorkingTool = lazy(() => import("./pages/ExcelAuditWorkingTool"));
const About = lazy(() => import("./pages/About"));
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
// TODO: verify no external links to /supplier-dashboard, then remove this import and SupplierDashboard.tsx
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
const CrmDashboard = lazy(() => import("./pages/admin/CrmDashboard"));
const ConciergeDashboard = lazy(() => import("./pages/admin/ConciergeDashboard"));
const SupplierSpecSubmission = lazy(() => import("./pages/SupplierSpecSubmission"));
const MaterialSwap = lazy(() => import("./pages/MaterialSwap"));
const InsiderPage = lazy(() => import("./pages/InsiderPage"));
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
const Features = lazy(() => import("./pages/Features"));
const FounderVideoNew = lazy(() => import("./pages/FounderVideoNew"));
const FounderVideoList = lazy(() => import("./pages/FounderVideoList"));
const FounderVideoWatch = lazy(() => import("./pages/FounderVideoWatch"));
const FounderVideoDashboard = lazy(() => import("./pages/FounderVideoDashboard"));

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
      <Route path="/supplier/dashboard">{() => <SupplierLayout><SupplierProfileDashboard /></SupplierLayout>}</Route>
      <Route path="/supplier/rfqs">{() => <SupplierLayout><SupplierRfqDashboard /></SupplierLayout>}</Route>
      <Route path="/supplier/submit-spec">{() => <SupplierLayout><SupplierSpecSubmission /></SupplierLayout>}</Route>
      <Route path="/supplier/agent-config">{() => <SupplierLayout><SupplierAgentConfig /></SupplierLayout>}</Route>
      <Route path="/supplier/materials">{() => <SupplierLayout><SupplierMaterials /></SupplierLayout>}</Route>
      <Route path="/supplier/upload">{() => <SupplierLayout><SupplierBulkUpload /></SupplierLayout>}</Route>
      <Route path="/supplier/analytics">{() => <SupplierLayout><SupplierAnalytics /></SupplierLayout>}</Route>
      <Route path="/supplier/filters">{() => <SupplierLayout><SupplierFilterSetup /></SupplierLayout>}</Route>
      <Route path="/material-swap" component={MaterialSwap} />
      <Route path="/messages" component={Messages} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/verification" component={AdminVerificationQueue} />
      <Route path="/admin/suppliers" component={AdminSupplierDashboard} />
      <Route path="/admin/crm" component={CrmDashboard} />
      <Route path="/admin/concierge" component={ConciergeDashboard} />
      <Route path="/admin/founder-videos" component={FounderVideoList} />
      <Route path="/admin/founder-videos/analytics" component={FounderVideoDashboard} />
      <Route path="/admin/founder-videos/new" component={FounderVideoNew} />
      <Route path="/v/:token" component={FounderVideoWatch} />
      <Route path="/excel-audit" component={ExcelAudit} />
      <Route path="/excel-audit-tool" component={ExcelAuditWorkingTool} />
      <Route path={"/about"} component={About} />
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
      <Route path={"/features"} component={Features} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={ArchitectDashboard} />
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
    initGoogleAnalytics();
    trackGooglePageView(location);
  }, [location]);

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
        path === "/get-started"
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
  // Initialize WebPubSub connection for real-time notifications
  // This hook calls useAuth() so it MUST be inside AuthProvider
  useWebPubSub();

  // VIDEO CALLING — cut for launch, restore when ACS is implemented
  // const [activeCall, setActiveCall] = useState<{...} | null>(null);
  // const handleAcceptCall = (callData: any) => { ... };

  return (
    <ChatWidgetProvider>
      <TooltipProvider>
        <Toaster />
        <AuthGuard />
        <SupplierOnboardingGuard />
        <ArchitectOnboardingGuard />
        <AnalyticsTracker />
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><span className="text-muted-foreground text-sm">Loading…</span></div>}>
          <Router />
        </Suspense>
        {/* Intercom support widget */}
        <IntercomWidget />
        {/* <IncomingCallNotification onAccept={handleAcceptCall} /> */}
        {/* <WebRTCVideoCall ... /> — restored when ACS signaling is complete */}
        <ChatWidget />
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
