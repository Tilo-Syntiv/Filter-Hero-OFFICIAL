import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import {
  AdminError,
  AdminLoading,
  AdminPanel,
  AdminSearch,
  AdminTable,
  EmptyState,
  MailLink,
  PersonName,
} from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createContact,
  createDeal,
  formatDate,
  listAdminContacts,
  listAdminLeads,
} from "@/lib/admin-api";

export default function AdminContacts() {
  return <AdminShell title="Contacts">{() => <ContactsBody />}</AdminShell>;
}

function ContactsBody() {
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState("");
  const contacts = useAdminLoad(() => listAdminContacts(query), [query]);
  const leads = useAdminLoad(() => listAdminLeads(query, intent), [query, intent]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, or size"
        />
        <select
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All form intents</option>
          <option value="quote">Quotes</option>
          <option value="support">Support</option>
          <option value="reminder">Reminders</option>
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <AdminPanel title="CRM contacts">
          {contacts.loading ? (
            <AdminLoading />
          ) : contacts.error ? (
            <AdminError>{contacts.error}</AdminError>
          ) : !contacts.data?.enabled ? (
            <p className="text-sm text-muted-foreground">CRM is off.</p>
          ) : contacts.data.rows.length === 0 ? (
            <EmptyState>No contacts yet.</EmptyState>
          ) : (
            <AdminTable headers={["Name", "Email", "Phone", "Updated"]}>
              {contacts.data.rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-2 py-2 font-medium text-navy">
                    {PersonName({
                      first: row.first_name,
                      last: row.last_name,
                      email: row.email,
                    })}
                  </td>
                  <td className="px-2 py-2">
                    <MailLink email={row.email} />
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{row.phone || "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {formatDate(row.updated_at)}
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>
        <CreateContactForm
          onCreated={() => {
            void contacts.reload();
          }}
        />
      </div>

      <AdminPanel title="Form submissions">
        {leads.loading ? (
          <AdminLoading />
        ) : leads.error ? (
          <AdminError>{leads.error}</AdminError>
        ) : !leads.data?.length ? (
          <EmptyState>No leads in leads.json.</EmptyState>
        ) : (
          <ul className="divide-y">
            {leads.data.map((lead) => (
              <li key={lead.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{lead.name}</p>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {lead.intent} · {formatDate(lead.createdAt)}
                  </span>
                </div>
                <p className="text-sm">
                  <MailLink email={lead.email} />
                  {lead.phone ? ` · ${lead.phone}` : ""}
                  {lead.filterSize ? ` · ${lead.filterSize}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {lead.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}

function CreateContactForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dealName, setDealName] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => email.includes("@"), [email]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const contact = await createContact({
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
      });
      if (dealName.trim()) {
        const deal = await createDeal({
          name: dealName.trim(),
          contactId: contact.id,
        });
        toast.success("Contact and quote created.");
        window.location.href = `/admin/deals/${deal.id}`;
        return;
      }
      toast.success("Contact saved.");
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPanel title="Add contact">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email" id="c-email">
          <Input
            id="c-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" id="c-first">
            <Input
              id="c-first"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label="Last name" id="c-last">
            <Input
              id="c-last"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Phone" id="c-phone">
          <Input id="c-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Open a quote named" id="c-deal">
          <Input
            id="c-deal"
            value={dealName}
            placeholder="Optional"
            onChange={(event) => setDealName(event.target.value)}
          />
        </Field>
        <Button type="submit" size="sm" disabled={saving || !canSave}>
          Save contact
        </Button>
        <p className="text-xs text-muted-foreground">
          Email them from your inbox.{" "}
          <Link href="/admin/quotes" className="text-primary">
            Quotes board
          </Link>
        </p>
      </form>
    </AdminPanel>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
