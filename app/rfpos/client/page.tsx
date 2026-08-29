import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatCard } from "@/components/stat-card"
import { SubscriptionPanel } from "@/components/subscription-panel"
import { WooCommerceButton } from "@/components/woocommerce-button"

export const metadata = {
  title: "Panel del cliente | Kiosqly RFPOS",
}

function monthsSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const start = new Date(dateStr)
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/rfpos/login")
  }

  const { data: account } = await supabase
    .from("client_accounts")
    .select("id, email, company_name, subscription_status, subscription_id, installation_date, wp_user_id, woocommerce_url")
    .eq("id", user.id)
    .single()

  const { count: activeDevices } = await supabase
    .from("client_devices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id)
    .eq("status", "active")

  const months = monthsSince(account?.installation_date ?? null)
  const isInactive = account?.subscription_status === "INACTIVE"

  return (
    <main className="min-h-svh bg-background">
      <DashboardHeader
        companyName={account?.company_name ?? null}
        email={account?.email ?? user.email ?? ""}
        status={account?.subscription_status ?? "INACTIVE"}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Estaciones / kioscos activos" value={String(activeDevices ?? 0)} hint="client_devices" />
          <StatCard
            label="Meses desde la instalación"
            value={String(months)}
            hint={account?.installation_date ? `Instalado el ${account.installation_date}` : "Sin fecha de instalación"}
          />
        </section>

        {isInactive ? (
          <section className="mt-8">
            <SubscriptionPanel />
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-card-foreground">Suscripción activa</h2>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  Tu suscripción mensual está al día. Gracias por confiar en Kiosqly.
                </p>
                {account?.subscription_id && (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">ID: {account.subscription_id}</p>
                )}
              </div>
              <WooCommerceButton
                disabled={!account?.wp_user_id || !account?.woocommerce_url}
              />
            </div>
          </section>
        )}

        {isInactive && (
          <section className="mt-6 rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-card-foreground">Acceso a la tienda</h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Activa tu suscripción para habilitar el acceso directo a WooCommerce.
            </p>
            <div className="mt-4">
              <WooCommerceButton disabled />
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
