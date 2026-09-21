import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { saveAccountFilter } from "@/lib/account-api";
import type { Product } from "@shared/products";

export default function SaveFilterButton({
  product,
  className,
}: {
  product: Product | null | undefined;
  className?: string;
}) {
  const { session } = useAccount();
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  const onClick = async () => {
    if (!session) {
      setLocation(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSaving(true);
    try {
      await saveAccountFilter(product.id);
      toast.success(`Saved ${product.size} MERV ${product.merv} to your account.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that filter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className}
      onClick={() => void onClick()}
      disabled={saving}
    >
      <BookmarkPlus className="h-4 w-4" />
      {session ? (saving ? "Saving…" : "Save to my filters") : "Sign in to save"}
    </Button>
  );
}
