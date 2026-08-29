"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"

const PAYPAL_CLIENT_ID =
  "BAA0zPEyaslOX6mT5nondXBuZ61iWGULglR0ACvU8m8gcs99dAEzpIou4bDCIEZ2KpI8lgXVPJI2X1W5fs"
const PAYPAL_PLAN_ID = "P-5XX972822Y4491137NKJSEEY"

export function SubscriptionPanel() {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)

  async function activateSubscription(subscriptionID: string) {
    setStatus("saving")
    setMessage(null)
    try {
      const res = await fetch("/rfpos/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionID }),
      })
      if (!res.ok) throw new Error("No se pudo activar la suscripción.")
      setStatus("done")
      router.refresh()
    } catch {
      setStatus("error")
      setMessage("El pago se realizó pero no pudimos actualizar tu cuenta. Contacta a soporte.")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-card-foreground">Activa tu suscripción mensual</h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Tu cuenta está inactiva. Suscríbete para reactivar el servicio y el acceso a la tienda.
        </p>
      </div>

      {status === "done" ? (
        <p className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
          Suscripción activada correctamente. Actualizando tu panel...
        </p>
      ) : (
        <div className="mt-5 max-w-sm">
          <PayPalScriptProvider
            options={{
              clientId: PAYPAL_CLIENT_ID,
              intent: "subscription",
              vault: true,
            }}
          >
            <PayPalButtons
              disabled={status === "saving"}
              style={{ layout: "vertical", label: "subscribe" }}
              createSubscription={(_data, actions) =>
                actions.subscription.create({ plan_id: PAYPAL_PLAN_ID })
              }
              onApprove={async (data) => {
                if (data.subscriptionID) {
                  await activateSubscription(data.subscriptionID)
                }
              }}
              onError={() => {
                setStatus("error")
                setMessage("Ocurrió un error al procesar el pago. Inténtalo de nuevo.")
              }}
            />
          </PayPalScriptProvider>
          {status === "saving" && (
            <p className="mt-3 text-sm text-muted-foreground">Activando tu cuenta...</p>
          )}
          {message && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
