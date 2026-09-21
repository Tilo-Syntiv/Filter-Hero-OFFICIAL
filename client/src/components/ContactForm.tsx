import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MarketingOptIn from "@/components/MarketingOptIn";
import { identifyShopper } from "@/lib/klaviyo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TurnstileField from "@/components/TurnstileField";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required").max(200),
  phone: z.string().max(40).optional(),
  filterSize: z.string().max(40).optional(),
  message: z.string().min(1, "Message is required").max(4000),
  intent: z.enum(["quote", "support"]),
  marketingConsent: z.boolean().optional(),
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(4000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ContactFormProps = {
  defaultSize?: string;
  defaultMessage?: string;
  cartSummary?: string;
  intent?: "quote" | "support";
};

export default function ContactForm({
  defaultSize = "",
  defaultMessage = "",
  cartSummary = "",
  intent = "quote",
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      filterSize: defaultSize,
      message: defaultMessage,
      intent,
      marketingConsent: false,
      website: "",
      turnstileToken: "",
    },
  });

  useEffect(() => {
    if (defaultSize) setValue("filterSize", defaultSize);
  }, [defaultSize, setValue]);

  useEffect(() => {
    if (defaultMessage) setValue("message", defaultMessage);
  }, [defaultMessage, setValue]);

  useEffect(() => {
    setValue("intent", intent);
  }, [intent, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      identifyShopper({ email: values.email, firstName: values.name.split(/\s+/)[0] });
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          cartSummary: cartSummary || undefined,
          website: values.website || undefined,
          turnstileToken: values.turnstileToken || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send");
      }
      toast.success("Message sent — we'll get back to you shortly.");
      reset({
        name: "",
        email: "",
        phone: "",
        filterSize: values.filterSize,
        message: "",
        intent: values.intent,
        marketingConsent: false,
        website: "",
        turnstileToken: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Your name" />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" {...register("phone")} placeholder="(555) 000-0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filterSize">Filter size</Label>
          <Input
            id="filterSize"
            {...register("filterSize")}
            placeholder="e.g. 16x25x1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>How can we help?</Label>
        <Select
          value={watch("intent")}
          onValueChange={(v) => setValue("intent", v as "quote" | "support")}
        >
          <SelectTrigger className="h-11 w-full text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quote">Request a quote</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={5}
          {...register("message")}
          placeholder="Tell us what you need — custom sizes, bulk orders, auto-delivery…"
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <MarketingOptIn
        id="contact-marketing"
        checked={Boolean(watch("marketingConsent"))}
        onCheckedChange={(checked) => setValue("marketingConsent", checked)}
      />

      {cartSummary ? (
        <p className="text-xs text-muted-foreground bg-secondary/60 rounded-md p-3">
          Cart attached: {cartSummary}
        </p>
      ) : null}

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>
      <TurnstileField onToken={(token) => setValue("turnstileToken", token)} />

      <Button type="submit" size="lg" disabled={isSubmitting} className="hero-shop-btn text-white w-full sm:w-auto">
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
