import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MERV_TYPES, mervTypesForDisplay } from "@shared/products";
import { parseSizeSlug } from "@/lib/filter-size";
import MarketingOptIn from "@/components/MarketingOptIn";
import { identifyShopper } from "@/lib/klaviyo";
import TurnstileField from "@/components/TurnstileField";

const dimField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => Number.isFinite(Number(v)), `Enter a valid ${label.toLowerCase()}`)
    .refine((v) => Number(v) > 0, `${label} must be greater than 0`)
    .refine((v) => Number(v) <= 48, `${label} max is 48 inches`)
    .transform(Number);

const formSchema = z.object({
  width: dimField("Width"),
  length: dimField("Length"),
  depth: dimField("Depth"),
  merv: z.enum(["unsure", "8", "11", "13", "carbon"]),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "Enter a whole number")
    .refine((v) => Number(v) <= 999, "Max 999")
    .transform(Number),
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required").max(200),
  phone: z.string().max(40).optional(),
  notes: z.string().max(4000).optional(),
  marketingConsent: z.boolean().optional(),
  website: z.string().max(200).optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function formatDim(n: number) {
  return String(Number(n.toFixed(3)));
}

function sizeDefaults(size: string) {
  const parsed = parseSizeSlug(size);
  return {
    width: parsed?.width ?? "",
    length: parsed?.length ?? "",
    depth: parsed?.depth ?? "",
  };
}

type CustomQuoteFormProps = {
  cartSummary?: string;
  defaultSize?: string;
};

export default function CustomQuoteForm({
  cartSummary = "",
  defaultSize = "",
}: CustomQuoteFormProps) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...sizeDefaults(defaultSize),
      merv: "unsure",
      quantity: "6",
      name: "",
      email: "",
      phone: "",
      notes: "",
      marketingConsent: false,
      website: "",
    },
  });

  useEffect(() => {
    const parsed = parseSizeSlug(defaultSize);
    if (!parsed) return;
    setValue("width", parsed.width);
    setValue("length", parsed.length);
    setValue("depth", parsed.depth);
  }, [defaultSize, setValue]);

  const onSubmit = async (values: FormValues) => {
    const size = `${formatDim(values.width)}x${formatDim(values.length)}x${formatDim(values.depth)}`;
    const mervLabel =
      values.merv === "unsure"
        ? "Not sure"
        : MERV_TYPES.find((t) => t.key === values.merv)?.name || values.merv;
    const message = [
      `Custom size quote: ${formatDim(values.width)} × ${formatDim(values.length)} × ${formatDim(values.depth)}`,
      `MERV: ${mervLabel}`,
      `Quantity: ${values.quantity}`,
      values.notes?.trim() ? `Notes: ${values.notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      identifyShopper({ email: values.email, firstName: values.name.split(/\s+/)[0] });
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone || "",
          filterSize: size,
          message,
          intent: "quote",
          marketingConsent: values.marketingConsent,
          cartSummary: cartSummary || undefined,
          turnstileToken: turnstileToken || undefined,
          website: values.website || undefined,
        }),
      });
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = (await res.json()) as { ok?: boolean; error?: string };
      } catch {
        throw new Error("Failed to send");
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send");
      }
      toast.success("Quote request sent — we'll follow up with pricing and lead time.");
      reset({
        ...sizeDefaults(""),
        merv: "unsure",
        quantity: "6",
        name: "",
        email: "",
        phone: "",
        notes: "",
        marketingConsent: false,
        website: "",
      });
      setTurnstileToken("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-6">
      <fieldset>
        <legend className="section-label mb-3">Your filter size</legend>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Enter the numbers printed on your current filter frame — Width × Length × Depth, in inches.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="space-y-2">
            <Label htmlFor="custom-width">Width</Label>
            <Input
              id="custom-width"
              type="number"
              inputMode="decimal"
              step="any"
              min={0.25}
              max={48}
              placeholder='e.g. 19.5"'
              className="h-12 text-base font-semibold"
              {...register("width")}
            />
            {errors.width && (
              <p className="text-xs text-destructive">{errors.width.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-length">Length</Label>
            <Input
              id="custom-length"
              type="number"
              inputMode="decimal"
              step="any"
              min={0.25}
              max={48}
              placeholder='e.g. 23.5"'
              className="h-12 text-base font-semibold"
              {...register("length")}
            />
            {errors.length && (
              <p className="text-xs text-destructive">{errors.length.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-depth">Depth</Label>
            <Input
              id="custom-depth"
              type="number"
              inputMode="decimal"
              step="any"
              min={0.25}
              max={48}
              placeholder='e.g. 1"'
              className="h-12 text-base font-semibold"
              {...register("depth")}
            />
            {errors.depth && (
              <p className="text-xs text-destructive">{errors.depth.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="custom-merv">MERV (optional)</Label>
          <select id="custom-merv" className="select-modern" {...register("merv")}>
            <option value="unsure">Not sure</option>
            {mervTypesForDisplay().map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-qty">Quantity</Label>
          <Input
            id="custom-qty"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            max={999}
            className="h-12 text-base font-semibold"
            {...register("quantity")}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="custom-name">Name</Label>
          <Input id="custom-name" {...register("name")} placeholder="Your name" className="h-11" />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-email">Email</Label>
          <Input
            id="custom-email"
            type="email"
            {...register("email")}
            placeholder="you@example.com"
            className="h-11"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-phone">Phone (optional)</Label>
        <Input id="custom-phone" {...register("phone")} placeholder="(555) 000-0000" className="h-11" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-notes">Notes (optional)</Label>
        <Textarea
          id="custom-notes"
          rows={4}
          {...register("notes")}
          placeholder="Anything else — photo of the label, HVAC brand, delivery timing…"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {cartSummary ? (
        <p className="text-xs text-muted-foreground bg-secondary/60 rounded-md p-3">
          Cart attached: {cartSummary}
        </p>
      ) : null}

      <MarketingOptIn
        id="custom-marketing"
        checked={Boolean(watch("marketingConsent"))}
        onCheckedChange={(checked) => setValue("marketingConsent", checked)}
      />

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="custom-website">Website</Label>
        <Input
          id="custom-website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>
      <TurnstileField onToken={setTurnstileToken} />

      <Button type="submit" size="lg" disabled={isSubmitting} className="hero-shop-btn text-white w-full sm:w-auto">
        {isSubmitting ? "Sending…" : "Request custom quote"}
        {!isSubmitting && <ArrowRight className="ml-1 h-4 w-4" />}
      </Button>
    </form>
  );
}
