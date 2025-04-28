import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: string[];
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check for role-based access
  if (requiredRole && !requiredRole.includes(user.role)) {
    toast({
      title: "Access Denied",
      description: "You don't have permission to access this page.",
      variant: "destructive",
    });
    
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">You don't have permission to access this page.</p>
          <Redirect to="/" />
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
