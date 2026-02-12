import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
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
import { ChainBot } from "./components/ChainBot";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/materials"} component={MaterialsCatalog} />
      <Route path={"/materials/:id"} component={MaterialDetail} />
      <Route path={"/assemblies"} component={Assemblies} />
      <Route path={"/assemblies/:id"} component={Assemblies} />
      <Route path={"/rfq"} component={RfqCart} />
       <Route path="/compare" component={Compare} />
      <Route path="/supplier-dashboard" component={SupplierDashboard} />
      <Route path="/rfq-dashboard" component={BuyerRfqDashboard} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <ChainBot />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
