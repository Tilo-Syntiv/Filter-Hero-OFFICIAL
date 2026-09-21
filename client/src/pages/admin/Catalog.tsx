import { useState } from "react";
import { Link } from "wouter";
import AdminShell from "./AdminShell";
import { useAdminLoad } from "./use-admin-load";
import {
  AdminError,
  AdminLoading,
  AdminPanel,
  AdminSearch,
  AdminTable,
  EmptyState,
  StatCard,
} from "./ui";
import { formatMoney, getAdminCatalog } from "@/lib/admin-api";

export default function AdminCatalog() {
  return <AdminShell title="Products">{() => <CatalogBody />}</AdminShell>;
}

function CatalogBody() {
  const [query, setQuery] = useState("");
  const { data, error, loading } = useAdminLoad(() => getAdminCatalog(query), [query]);

  if (loading) return <AdminLoading />;
  if (error) return <AdminError>{error}</AdminError>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sellable SKUs" value={data.skuCount} />
        <StatCard label="Sizes on sale" value={data.sizeCount} />
        <StatCard label="Archive sizes" value={data.archivedSizeCount} />
        <StatCard
          label="Mode"
          value={data.sellableOnly ? "Sheet" : "Full"}
          hint="FULL_CATALOG env flag"
        />
      </div>

      <AdminPanel
        title="Featured sizes"
        action={
          <Link href="/admin/content" className="text-xs font-semibold text-primary">
            Edit in Content
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          {(data.featuredSizes.length ? data.featuredSizes : data.defaultFeaturedSizes).join(", ")}
        </p>
      </AdminPanel>

      <AdminPanel title="Sellable catalog">
        <div className="mb-4">
          <AdminSearch
            value={query}
            onChange={setQuery}
            placeholder="Search size, MERV, or name"
          />
        </div>
        {data.products.length === 0 ? (
          <EmptyState>No SKUs match that search.</EmptyState>
        ) : (
          <AdminTable headers={["Size", "MERV", "SKU", "Name", "Price", "Stock"]}>
            {data.products.map((product) => (
              <tr key={product.id} className="border-b last:border-0">
                <td className="px-2 py-2 font-medium text-navy">
                  <Link href={`/sizes/${product.size}`} className="hover:text-primary">
                    {product.size}
                  </Link>
                </td>
                <td className="px-2 py-2">{product.isCarbon ? "8 Carbon" : product.merv}</td>
                <td className="px-2 py-2 font-mono text-xs">{product.wholesaleSku || "—"}</td>
                <td className="px-2 py-2">{product.name}</td>
                <td className="px-2 py-2">{formatMoney(product.price)}</td>
                <td className="px-2 py-2">{product.inStock ? "In stock" : "Out"}</td>
              </tr>
            ))}
          </AdminTable>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {data.products.length} of {data.matched}. Contractor sheet is the catalog.
          Stripe / Klaviyo / Supabase update with <code>pnpm sync:catalog</code>.
        </p>
      </AdminPanel>
    </div>
  );
}
