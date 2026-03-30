import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatWidgetProvider } from "./contexts/ChatWidgetContext";
import Home from "./pages/Home";
import ApiTest from "./pages/ApiTest";
import ExcelAudit from "./pages/ExcelAudit";
import ExcelAuditWorkingTool from "./pages/ExcelAuditWorkingTool";
import About from "./pages/About";
import BrowserExtension from "./pages/BrowserExtension";
import RevitPlugin from "./pages/RevitPlugin";
import SubmittalGenerator from "./pages/SubmittalGenerator";
import MaterialsCatalog from "./pages/MaterialsCatalog";
import MaterialDetail from "./pages/MaterialDetail";
import Assemblies from "./pages/Assemblies";
import RfqCart from "./pages/RfqCart";
import RFQForm from "./pages/RFQForm";
import RfqDetail from "./pages/RfqDetail";
import Compare from "./pages/Compare";
import CarbonCompare from "./pages/CarbonCompare";
import SupplierDashboard from "./pages/SupplierDashboard";
import BuyerRfqDashboard from "./pages/BuyerRfqDashboard";
import RfqDashboard from "./pages/RfqDashboard";
import { SupplierRegistration } from "./pages/SupplierRegistration";
import { SupplierProfileDashboard } from "./pages/SupplierProfileDashboard";
import SupplierRfqDashboard from "./pages/SupplierRfqDashboard";
import Tools from "./pages/Tools";
import GetStarted from "./pages/GetStarted";
import SupplierOnboarding from "./pages/SupplierOnboarding";
import ArchitectOnboarding from "./pages/ArchitectOnboarding";
import ArchitectDashboard from "./pages/ArchitectDashboard";
import MaterialSearchPage from "./pages/MaterialSearchPage";
import RFQNewPage from "./pages/RFQNewPage";
import RFQDetailPage from "./pages/rfq/RFQDetailPage";
import RFQListPage from "./pages/rfq/RFQListPage";
import MaterialCreditScorePage from "./pages/MaterialCreditScorePage";
import Messages from "./pages/Messages";
import Subscription from "./pages/Subscription";
import { ChainBot } from "./components/ChainBot";
// VIDEO CALLING — cut for launch, restore when ACS is implemented
// import { IncomingCallNotification } from "./components/messaging/IncomingCallNotification";
// import { WebRTCVideoCall } from "./components/messaging/WebRTCVideoCall";
import { UnifiedChatWidget } from "./components/UnifiedChatWidget";
import { ChatWidget } from "./components/ChatWidget";
import AdminVerificationQueue from "./pages/AdminVerificationQueue";
import { AdminSupplierDashboard } from "./pages/AdminSupplierDashboard";
import SupplierSpecSubmission from "./pages/SupplierSpecSubmission";
import MaterialSwap from "./pages/MaterialSwap";
import SupplierAgentConfig from "./pages/SupplierAgentConfig";
import SupplierMaterials from "./pages/SupplierMaterials";
import SupplierBulkUpload from "./pages/SupplierBulkUpload";
import SupplierAnalytics from "./pages/SupplierAnalytics";
import { Terms } from "./pages/Terms";
import { Privacy } from "./pages/Privacy";
import { HowItWorks } from "./pages/HowItWorks";
import Support from "./pages/Support";
import Login from "./pages/Login";
import { Redirect } from "wouter";
import { useState, useEffect } from "react";
import { useWebPubSub } from "./hooks/useWebPubSub";
import { useAuth } from "./contexts/AuthContext";
import { trpc } from "./lib/trpc";

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
      <Route path="/compare" component={Compare} />
      <Route path="/carbon-compare" component={CarbonCompare} />
      <Route path="/supplier-dashboard" component={SupplierDashboard} />
      <Route path="/rfq-dashboard" component={BuyerRfqDashboard} />
      <Route path="/rfq-status" component={RfqDashboard} />
      <Route path="/supplier/onboarding" component={SupplierOnboarding} />
      <Route path="/architect/onboarding" component={ArchitectOnboarding} />
      <Route path="/search" component={MaterialSearchPage} />
      <Route path="/supplier/register" component={SupplierRegistration} />
      <Route path="/supplier/dashboard" component={SupplierProfileDashboard} />
      <Route path="/supplier/rfqs" component={SupplierRfqDashboard} />
      <Route path="/supplier/submit-spec" component={SupplierSpecSubmission} />
      <Route path="/supplier/agent-config" component={SupplierAgentConfig} />
      <Route path="/supplier/materials" component={SupplierMaterials} />
      <Route path="/supplier/upload" component={SupplierBulkUpload} />
      <Route path="/supplier/analytics" component={SupplierAnalytics} />
      <Route path="/material-swap" component={MaterialSwap} />
      <Route path="/messages" component={Messages} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/admin/verification" component={AdminVerificationQueue} />
      <Route path="/admin/suppliers" component={AdminSupplierDashboard} />
      <Route path={"/api-test"} component={ApiTest} />          <Route path="/excel-audit" component={ExcelAudit} />
          <Route path="/excel-audit-tool" component={ExcelAuditWorkingTool} />      <Route path={"/about"} component={About} />
      <Route path={"/tools"} component={Tools} />
      <Route path={"/tools/extension"} component={BrowserExtension} />
      <Route path={"/tools/revit"} component={RevitPlugin} />
      <Route path={"/tools/submittal"} component={SubmittalGenerator} />
       <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/support"} component={Support} />
      <Route path={"/how-it-works"} component={HowItWorks} />
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
  "/rfq-dashboard",
  "/rfq-status",
  "/rfq-form",
  "/rfq/",
  "/messages",
  "/subscription",
  "/admin/",
  "/dashboard",
  "/search",
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
        <Router />
        <ChainBot />
        {/* <IncomingCallNotification onAccept={handleAcceptCall} /> */}
        {/* <WebRTCVideoCall ... /> — restored when ACS signaling is complete */}
        <ChatWidget />
      </TooltipProvider>
    </ChatWidgetProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
