import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatWidgetProvider } from "./contexts/ChatWidgetContext";
import Home from "./pages/Home";
import ApiTest from "./pages/ApiTest";
import ExcelAudit from "./pages/ExcelAudit";
import About from "./pages/About";
import BrowserExtension from "./pages/BrowserExtension";
import RevitPlugin from "./pages/RevitPlugin";
import SubmittalGenerator from "./pages/SubmittalGenerator";
import MaterialsCatalog from "./pages/MaterialsCatalog";
import MaterialDetail from "./pages/MaterialDetail";
import Assemblies from "./pages/Assemblies";
import RfqCart from "./pages/RfqCart";
import Compare from "./pages/Compare";
import SupplierDashboard from "./pages/SupplierDashboard";
import BuyerRfqDashboard from "./pages/BuyerRfqDashboard";
import RfqDashboard from "./pages/RfqDashboard";
import { SupplierRegistration } from "./pages/SupplierRegistration";
import { SupplierProfileDashboard } from "./pages/SupplierProfileDashboard";
import SupplierRfqDashboard from "./pages/SupplierRfqDashboard";
import GetStarted from "./pages/GetStarted";
import Messages from "./pages/Messages";
import Subscription from "./pages/Subscription";
import { ChainBot } from "./components/ChainBot";
import { IncomingCallNotification } from "./components/messaging/IncomingCallNotification";
import { WebRTCVideoCall } from "./components/messaging/WebRTCVideoCall";
import { UnifiedChatWidget } from "./components/UnifiedChatWidget";
import AdminVerificationQueue from "./pages/AdminVerificationQueue";
import { useState } from "react";
import { useWebPubSub } from "./hooks/useWebPubSub";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/get-started"} component={GetStarted} />
      <Route path={"/materials"} component={MaterialsCatalog} />
      <Route path={"/materials/:id"} component={MaterialDetail} />
      <Route path={"/assemblies"} component={Assemblies} />
      <Route path={"/assemblies/:id"} component={Assemblies} />
      <Route path={"/rfq"} component={RfqCart} />
       <Route path="/compare" component={Compare} />
      <Route path="/supplier-dashboard" component={SupplierDashboard} />
      <Route path="/rfq-dashboard" component={BuyerRfqDashboard} />
      <Route path="/rfq-status" component={RfqDashboard} />
      <Route path="/supplier/register" component={SupplierRegistration} />
      <Route path="/supplier/dashboard" component={SupplierProfileDashboard} />
      <Route path="/supplier/rfqs" component={SupplierRfqDashboard} />
      <Route path="/messages" component={Messages} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/admin/verification" component={AdminVerificationQueue} />
      <Route path={"/api-test"} component={ApiTest} />
      <Route path={"/tools/excel"} component={ExcelAudit} />
      <Route path={"/about"} component={About} />
      <Route path={"/tools/extension"} component={BrowserExtension} />
      <Route path={"/tools/revit"} component={RevitPlugin} />
      <Route path={"/tools/submittal"} component={SubmittalGenerator} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize WebPubSub connection for real-time notifications
  useWebPubSub();

  const [activeCall, setActiveCall] = useState<{
    conversationId: number;
    calleeId: number;
    calleeName: string;
  } | null>(null);

  const handleAcceptCall = (callData: any) => {
    setActiveCall({
      conversationId: callData.conversationId,
      calleeId: callData.callerId,
      calleeName: callData.callerName,
    });
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <ChatWidgetProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
              <UnifiedChatWidget />
              <IncomingCallNotification onAccept={handleAcceptCall} />
            {activeCall && (
              <WebRTCVideoCall
                conversationId={activeCall.conversationId}
                calleeId={activeCall.calleeId}
                calleeName={activeCall.calleeName}
                onCallEnd={() => setActiveCall(null)}
              />
            )}
          </TooltipProvider>
          </ChatWidgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
