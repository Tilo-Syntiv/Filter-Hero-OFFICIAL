import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel } from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getAdminConfig, patchAdminConfig } from "@/lib/admin-api";
import { SITE_FAQS } from "@shared/seo";
import type { SiteConfig, SiteFaqItem } from "@shared/site-config";

export default function AdminContent() {
  return <AdminShell title="Content">{() => <ContentBody />}</AdminShell>;
}

function ContentBody() {
  const { data, error, loading, reload } = useAdminLoad(getAdminConfig);
  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;
  return <ContentForm initial={data} onSaved={() => void reload()} />;
}

function ContentForm({
  initial,
  onSaved,
}: {
  initial: SiteConfig;
  onSaved: () => void;
}) {
  const [announcementEnabled, setAnnouncementEnabled] = useState(initial.announcementEnabled);
  const [announcement, setAnnouncement] = useState(initial.announcement);
  const [tagline, setTagline] = useState(initial.tagline);
  const [heroKicker, setHeroKicker] = useState(initial.heroKicker);
  const [heroLede, setHeroLede] = useState(initial.heroLede);
  const [featured, setFeatured] = useState(
    (initial.featuredSizeSlugs.length ? initial.featuredSizeSlugs : []).join(", "),
  );
  const [faqs, setFaqs] = useState<SiteFaqItem[]>(
    initial.faqs.length ? initial.faqs : SITE_FAQS.map(({ question, answer, category, action }) => ({
      question,
      answer,
      category,
      action,
    })),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAnnouncementEnabled(initial.announcementEnabled);
    setAnnouncement(initial.announcement);
    setTagline(initial.tagline);
    setHeroKicker(initial.heroKicker);
    setHeroLede(initial.heroLede);
    setFeatured(initial.featuredSizeSlugs.join(", "));
    setFaqs(
      initial.faqs.length
        ? initial.faqs
        : SITE_FAQS.map(({ question, answer, category, action }) => ({
            question,
            answer,
            category,
            action,
          })),
    );
  }, [initial]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await patchAdminConfig({
        announcementEnabled,
        announcement,
        tagline,
        heroKicker,
        heroLede,
        featuredSizeSlugs: featured
          .split(/[,\n]/)
          .map((slug) => slug.trim())
          .filter(Boolean),
        faqs: faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
      });
      toast.success("Content saved. The storefront picks it up on the next load.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <AdminPanel title="Announcement bar">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="announce-on">Show announcement</Label>
          <Switch
            id="announce-on"
            checked={announcementEnabled}
            onCheckedChange={setAnnouncementEnabled}
          />
        </div>
        <Textarea
          className="mt-3"
          value={announcement}
          onChange={(event) => setAnnouncement(event.target.value)}
          placeholder="2–3 day delivery"
          rows={2}
        />
      </AdminPanel>

      <AdminPanel title="Homepage copy">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={tagline} onChange={(event) => setTagline(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kicker">Hero kicker</Label>
            <Input
              id="kicker"
              value={heroKicker}
              onChange={(event) => setHeroKicker(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lede">Hero lede</Label>
            <Textarea
              id="lede"
              rows={4}
              value={heroLede}
              onChange={(event) => setHeroLede(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The large hero title is part of the designed layout. Kicker and lede are the
            editable lines.
          </p>
        </div>
      </AdminPanel>

      <AdminPanel title="Featured sizes">
        <Label htmlFor="featured">Size slugs, comma-separated</Label>
        <Textarea
          id="featured"
          className="mt-2"
          rows={3}
          value={featured}
          onChange={(event) => setFeatured(event.target.value)}
          placeholder="16x25x1, 20x25x1, 20x20x1"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Leave blank to keep the code defaults. Unknown slugs are dropped.
        </p>
      </AdminPanel>

      <AdminPanel
        title="FAQs"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setFaqs((current) => [
                ...current,
                { question: "", answer: "", category: "Ordering" },
              ])
            }
          >
            Add question
          </Button>
        }
      >
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-xl border border-border p-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                <Input
                  value={faq.question}
                  placeholder="Question"
                  onChange={(event) =>
                    setFaqs((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, question: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  value={faq.category ?? ""}
                  placeholder="Category"
                  onChange={(event) =>
                    setFaqs((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, category: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setFaqs((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
              <Textarea
                rows={3}
                value={faq.answer}
                placeholder="Answer"
                onChange={(event) =>
                  setFaqs((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, answer: event.target.value } : row,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
      </AdminPanel>

      <Button type="submit" disabled={saving}>
        Save content
      </Button>
    </form>
  );
}
