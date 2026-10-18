/** Google Tag Manager container for every page of lathosworld.com. */
export const GTM_ID = "GTM-TKWSWGNC";

/**
 * Official container bootstrap. The text is the standard snippet with this
 * container id; the rendered `<script>` must match `GTM_SCRIPT_TAG` exactly
 * so the document middleware can place that one tag at the top of `<head>`.
 */
export const GTM_HEAD_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

export const GTM_SCRIPT_TAG = `<script>${GTM_HEAD_SCRIPT}</script>`;

export const GTM_NOSCRIPT_IFRAME = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;

/**
 * One standard container `<script>`, immediately after the opening `<head>`.
 * Safe to run more than once.
 */
export function placeGtmScriptAfterHeadOpen(html: string): string {
  if (!/<head\b[^>]*>/i.test(html)) return html;
  const stripped = html.split(GTM_SCRIPT_TAG).join("");
  return stripped.replace(/<head\b[^>]*>/i, (open) => `${open}${GTM_SCRIPT_TAG}`);
}
