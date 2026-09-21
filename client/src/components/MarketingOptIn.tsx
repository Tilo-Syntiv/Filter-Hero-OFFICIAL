import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type MarketingOptInProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export default function MarketingOptIn({
  id,
  checked,
  onCheckedChange,
}: MarketingOptInProps) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="text-sm font-normal leading-snug text-muted-foreground">
        Email me tips and restock offers. Quote replies and order confirmations still go out
        either way. Replacement reminders only start after you buy.
      </Label>
    </div>
  );
}
