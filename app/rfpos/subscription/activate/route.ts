import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Public PayPal client id (Live). The secret lives only on the server.
const PAYPAL_CLIENT_ID = "BAA0zPEyaslOX6mT5nondXBuZ61iWGULglR0ACvU8m8gcs99dAEzpIou4bDCIEZ2KpI8lgXVPJI2X1W5fs"
const PAYPAL_PLAN_ID = "P-5XX972822Y4491137NKJSEEY"
const PAYPAL_API_BASE = "https://api-m.paypal.com"

// Subscription states PayPal considers valid/paid for access.
const VALID_STATUSES = new Set(["ACTIVE", "APPROVED"])

async function getPayPalAccessToken(): Promise<string | null> {
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!secret) return null

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${secret}`).toString("base64")
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }

  let subscriptionID: unknown
  try {
    const body = await request.json()
    subscriptionID = body?.subscriptionID
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }

  if (typeof subscriptionID !== "string" || subscriptionID.trim().length === 0) {
    return NextResponse.json({ error: "subscriptionID inválido." }, { status: 400 })
  }

  const cleanSubscriptionId = subscriptionID.trim()

  // 1) Get a server-side OAuth token from PayPal.
  const accessToken = await getPayPalAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: "No se pudo autenticar con PayPal." }, { status: 502 })
  }

  // 2) Verify the subscription actually exists and belongs to our plan.
  const subRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(cleanSubscriptionId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!subRes.ok) {
    return NextResponse.json({ error: "Suscripción no encontrada en PayPal." }, { status: 400 })
  }

  const subscription = (await subRes.json()) as { status?: string; plan_id?: string }

  // 3) Enforce the plan id and an active/approved status before activating.
  if (subscription.plan_id !== PAYPAL_PLAN_ID) {
    return NextResponse.json({ error: "La suscripción no corresponde al plan esperado." }, { status: 400 })
  }

  if (!subscription.status || !VALID_STATUSES.has(subscription.status)) {
    return NextResponse.json(
      { error: `La suscripción no está activa (estado: ${subscription.status ?? "desconocido"}).` },
      { status: 400 },
    )
  }

  // 4) Update only the authenticated user's own account (RLS also enforces this).
  const { error } = await supabase
    .from("client_accounts")
    .update({
      subscription_status: "ACTIVE",
      subscription_id: cleanSubscriptionId,
    })
    .eq("id", user.id)

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar la cuenta." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
