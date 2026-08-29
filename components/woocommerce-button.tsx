"use client"

import { Button } from "@/components/ui/button"

export function WooCommerceButton({ disabled }: { disabled?: boolean }) {
  function openWooCommerce() {
    // The /rfpos/sso route signs an HMAC token and redirects to WooCommerce.
    // Open in a new tab when embedded in an iframe, otherwise same tab.
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.open("/rfpos/sso", "_blank", "noopener,noreferrer")
    } else {
      window.location.href = "/rfpos/sso"
    }
  }

  return (
    <Button onClick={openWooCommerce} disabled={disabled} className="shrink-0">
      Abrir WooCommerce
    </Button>
  )
}
