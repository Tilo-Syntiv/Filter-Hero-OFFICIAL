import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { BRAND_NAME } from "@/const";
import { useSeo } from "@/hooks/useSeo";

export default function NotFound() {
  const [, setLocation] = useLocation();
  useSeo({
    title: `Page not found | ${BRAND_NAME}`,
    description:
      `That page does not exist. Return to ${BRAND_NAME} to find your HVAC filter size.`,
    path: "/404",
    noindex: true,
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <img
          src="/logo.png"
          alt={BRAND_NAME}
          className="h-12 w-auto mx-auto mb-8"
        />
        <div className="flex justify-center mb-6">
          <AlertCircle className="h-14 w-14 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Page not found
        </h2>
        <p className="text-muted-foreground mb-8">
          That page doesn't exist. Head back to the storefront to find your filter.
        </p>
        <Button className="w-full sm:w-auto" onClick={() => setLocation("/")} size="lg">
          <Home className="w-4 h-4 mr-2" />
          Go home
        </Button>
      </div>
    </div>
  );
}
