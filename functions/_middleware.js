// One address for everything: old pages.dev links and www both go to vixassist.com.
// /api/ on the old host keeps working (Paystack webhook, portfolio forms, OAuth callbacks).
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const old = url.hostname === "vixautomations.pages.dev" && !url.pathname.startsWith("/api/");
  if (old || url.hostname === "www.vixassist.com") {
    url.hostname = "vixassist.com";
    return Response.redirect(url.toString(), 301);
  }
  return ctx.next();
}
