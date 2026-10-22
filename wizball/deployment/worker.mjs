export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.hostname === 'tonyclancy.com' && incoming.pathname === '/wizball') {
      incoming.pathname = '/wizball/';
      return Response.redirect(incoming.toString(), 308);
    }
    const assetURL = new URL(incoming);
    if (assetURL.pathname.startsWith('/wizball/')) assetURL.pathname = assetURL.pathname.slice('/wizball'.length);
    const response = await env.ASSETS.fetch(new Request(assetURL, request));
    const headers = new Headers(response.headers);
    if (headers.has('location')) {
      const target = new URL(headers.get('location'), assetURL);
      if (incoming.hostname === 'tonyclancy.com' && target.origin === incoming.origin && !target.pathname.startsWith('/wizball/')) {
        target.pathname = '/wizball' + target.pathname;
        headers.set('location', target.toString());
      }
    }
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Cache-Control', /\/(?:assets-|engine-|pack-)[a-f0-9]+(?:-\d+)?\.(?:bin|wasm|zip)$/.test(assetURL.pathname)
      ? 'public, max-age=31536000, immutable' : 'no-cache');
    return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
  }
};
