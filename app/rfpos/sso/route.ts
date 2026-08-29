import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

// Generates an HMAC SHA256 signed URL and redirects the client to WooCommerce.
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/rfpos/login", request.url))
  }

  const { data: account, error } = await supabase
    .from("client_accounts")
    .select("wp_user_id, woocommerce_url")
    .eq("id", user.id)
    .single()

  if (error || !account?.wp_user_id || !account?.woocommerce_url) {
    return NextResponse.json(
      { error: "Cuenta no vinculada con WooCommerce." },
      { status: 400 },
    )
  }

  const secret = process.env.WOOCOMMERCE_SSO_SECRET
  if (!secret) {
    return NextResponse.json({ error: "SSO no configurado." }, { status: 500 })
  }

  const wpUserId = String(account.wp_user_id)
  // Expiration timestamp 60 seconds from now (in seconds).
  const expires = Math.floor(Date.now() / 1000) + 60

  // Sign the payload: user_id + expires
  const payload = `${wpUserId}|${expires}`
  const token = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  const base = String(account.woocommerce_url).replace(/\/+$/, "")
  const redirectUrl = `${base}/?kiosqly_token=${encodeURIComponent(
    token,
  )}&user_id=${encodeURIComponent(wpUserId)}&expires=${expires}`

  return NextResponse.redirect(redirectUrl)
}
