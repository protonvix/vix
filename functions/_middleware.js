// Old address → new domain. Keeps /api/ on the old host working (Paystack webhook, portfolio forms, OAuth callbacks).
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (url.hostname === "vixautomations.pages.dev" && !url.pathname.startsWith("/api/")) {
    url.hostname = "vixassist.com";
    return Response.redirect(url.toString(), 301);
  }
  return ctx.next();
}
