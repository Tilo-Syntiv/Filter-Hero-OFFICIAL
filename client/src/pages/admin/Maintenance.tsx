import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import { AdminError, AdminLoading, AdminPanel, AdminTable, StatCard } from "./ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatDateTime, getAdminMaintenance, patchAdminConfig } from "@/lib/admin-api";

export default function AdminMaintenance() {
  return <AdminShell title="Maintenance">{() => <MaintenanceBody />}</AdminShell>;
}

function MaintenanceBody() {
  const { data, error, loading, reload } = useAdminLoad(getAdminMaintenance);
  const [mode, setMode] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMode(data.maintenanceMode);
    setMessage(data.maintenanceMessage);
  }, [data]);

  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;

  const save = async () => {
    setSaving(true);
    try {
      await patchAdminConfig({
        maintenanceMode: mode,
        maintenanceMessage: message,
      });
      toast.success(mode ? "Checkout is paused." : "Checkout is open.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Checkout"
          value={data.checkoutPaused ? "Paused" : "Open"}
          tone={data.checkoutPaused ? "warn" : "ok"}
        />
        <StatCard label="Environment" value={data.flags.nodeEnv} />
        <StatCard label="Data directory" value={data.flags.dataDir} />
      </div>

      <AdminPanel title="Maintenance mode">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="maint">Pause Stripe Checkout</Label>
          <Switch id="maint" checked={mode} onCheckedChange={setMode} />
        </div>
        <Textarea
          className="mt-3"
          rows={2}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button className="mt-3" size="sm" disabled={saving} onClick={() => void save()}>
          Save
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Shoppers can still browse. Checkout returns 503 until this is off. Quote forms stay
          open so a paused shop can still take custom sizes.
        </p>
      </AdminPanel>

      <AdminPanel title="Kill switches">
        <p className="text-sm text-muted-foreground">
          CRM_DISABLE={data.flags.crmDisable ? "1" : "0"} · ACCOUNT_DISABLE=
          {data.flags.accountDisable ? "1" : "0"}. These are env-only.
        </p>
      </AdminPanel>

      <AdminPanel title="Data files">
        <AdminTable headers={["File", "Records", "Size", "Updated"]}>
          {data.files.map((file) => (
            <tr key={file.name} className="border-b last:border-0">
              <td className="px-2 py-2 font-medium text-navy">{file.name}</td>
              <td className="px-2 py-2">{file.exists ? file.records : "missing"}</td>
              <td className="px-2 py-2">{file.exists ? `${Math.round(file.bytes / 1024)} KB` : "—"}</td>
              <td className="px-2 py-2 text-muted-foreground">
                {formatDateTime(file.updatedAt)}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
