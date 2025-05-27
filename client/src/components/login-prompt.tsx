import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, UserPlus, Shield } from "lucide-react";

interface LoginPromptProps {
  message?: string;
  title?: string;
}

export function LoginPrompt({ 
  message = "Please log in to your account to book an ambulance and access our services.",
  title = "Authentication Required"
}: LoginPromptProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-center">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link href="/auth">
          <Button className="w-full" size="lg">
            <User className="h-4 w-4 mr-2" />
            Login to Existing Account
          </Button>
        </Link>
        <Link href="/auth">
          <Button variant="outline" className="w-full" size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Account
          </Button>
        </Link>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account? Registration is quick and free!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}