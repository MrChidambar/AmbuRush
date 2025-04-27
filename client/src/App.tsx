import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TrackingPage from "@/pages/tracking-page";
import BookingHistoryPage from "@/pages/booking-history-page";
import AmbulanceDetectionPage from "@/pages/ambulance-detection-page";
import ServicesPage from "@/pages/services-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/services" component={ServicesPage} />
      <ProtectedRoute path="/tracking" component={TrackingPage} />
      <ProtectedRoute path="/tracking/:bookingId" component={TrackingPage} />
      <ProtectedRoute path="/history" component={BookingHistoryPage} />
      <Route path="/ambulance-detection" component={AmbulanceDetectionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
