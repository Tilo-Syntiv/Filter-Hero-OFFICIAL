import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel from "@/pages/CheckoutCancel";
import Home from "@/pages/Home";
import SizeDetailPage from "@/pages/SizeDetail";
import { AllSizesPage, ThicknessHubPage } from "@/pages/SizeBrowse";
import { AllBrandsPage, BrandDetailPage } from "@/pages/BrandBrowse";
import CustomAirFiltersPage from "@/pages/CustomAirFilters";
import FilterChangeGuidePage from "@/pages/FilterChangeGuide";
import AccountPage from "@/pages/account/Account";
import CustomerLogin from "@/pages/account/Login";
import AdminBoard from "@/pages/admin/Board";
import AdminDealDetail from "@/pages/admin/DealDetail";
import AdminShell from "@/pages/admin/AdminShell";
import AdminOverview from "@/pages/admin/Overview";
import AdminContacts from "@/pages/admin/Contacts";
import AdminOrders from "@/pages/admin/Orders";
import AdminCustomers, { AdminCustomerDetail } from "@/pages/admin/Customers";
import AdminCatalog from "@/pages/admin/Catalog";
import AdminContent from "@/pages/admin/Content";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminTracking from "@/pages/admin/Tracking";
import AdminUsers from "@/pages/admin/Users";
import AdminSecurity from "@/pages/admin/Security";
import AdminSettings from "@/pages/admin/Settings";
import AdminMaintenance from "@/pages/admin/Maintenance";
import { Redirect, Route, Switch, useRoute } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccountProvider } from "./contexts/AccountContext";
import { CartProvider } from "./contexts/CartContext";
import { SiteConfigProvider } from "./contexts/SiteConfigContext";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { bootKlaviyo } from "@/lib/klaviyo";

function ThicknessRoute() {
  const [, params] = useRoute("/filters/:thickness");
  const raw = params?.thickness?.replace("-inch", "") ?? "1";
  const depth = Number(raw);
  return <ThicknessHubPage depth={depth} />;
}

function SizeRoute() {
  const [, params] = useRoute("/sizes/:size");
  const size = params?.size ?? "";
  return <SizeDetailPage sizeSlug={size} />;
}

function BrandRoute() {
  const [, params] = useRoute("/brands/:slug");
  const slug = params?.slug ?? "";
  return <BrandDetailPage slug={slug} />;
}

function AdminLoginRoute() {
  return (
    <AdminShell title="Staff sign in">
      {() => <Redirect to="/admin" />}
    </AdminShell>
  );
}

function AdminDealRoute() {
  const [, params] = useRoute("/admin/deals/:id");
  return <AdminDealDetail id={params?.id ?? ""} />;
}

function AdminCustomerRoute() {
  const [, params] = useRoute("/admin/customers/:id");
  return <AdminCustomerDetail id={params?.id ?? ""} />;
}

function Router() {
  useScrollToTop();
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sizes" component={AllSizesPage} />
      <Route path="/sizes/:size" component={SizeRoute} />
      <Route path="/filters/:thickness" component={ThicknessRoute} />
      <Route path="/brands" component={AllBrandsPage} />
      <Route path="/brands/:slug" component={BrandRoute} />
      <Route path="/custom-air-filters" component={CustomAirFiltersPage} />
      <Route path="/how-often-to-change-air-filter" component={FilterChangeGuidePage} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route path="/login" component={CustomerLogin} />
      <Route path="/account" component={AccountPage} />
      <Route path="/admin/login" component={AdminLoginRoute} />
      <Route path="/admin/deals/:id" component={AdminDealRoute} />
      <Route path="/admin/quotes" component={AdminBoard} />
      <Route path="/admin/contacts" component={AdminContacts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/customers/:id" component={AdminCustomerRoute} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/catalog" component={AdminCatalog} />
      <Route path="/admin/content" component={AdminContent} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/tracking" component={AdminTracking} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/security" component={AdminSecurity} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/maintenance" component={AdminMaintenance} />
      <Route path="/admin" component={AdminOverview} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    void bootKlaviyo();
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AccountProvider>
          <SiteConfigProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
          </SiteConfigProvider>
        </AccountProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
