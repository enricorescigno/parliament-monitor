import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import ParliamentarianProfile from "./pages/ParliamentarianProfile";
import GhostEmployees from "./pages/GhostEmployees";
import AssetAnalysis from "./pages/AssetAnalysis";
import ContractAnalysis from "./pages/ContractAnalysis";
import AuditReport from "./pages/AuditReport";
import SyncAdmin from "./pages/SyncAdmin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchResults} />
      <Route path="/parlamentar/:id" component={ParliamentarianProfile} />
      <Route path="/parlamentar/:id/funcionarios" component={GhostEmployees} />
      <Route path="/parlamentar/:id/patrimonio" component={AssetAnalysis} />
      <Route path="/parlamentar/:id/contratos" component={ContractAnalysis} />
      <Route path="/parlamentar/:id/relatorio" component={AuditReport} />
      <Route path="/admin/sync" component={SyncAdmin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
