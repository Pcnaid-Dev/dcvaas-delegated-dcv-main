export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 1. Try to fetch the requested asset (e.g. /main.js, /logo.png) directly
    let response = await env.ASSETS.fetch(request);

    // 2. If the asset is not found (404), and it's not a file in /assets/,
    //    serve index.html instead. This fixes "Page Not Found" on refresh.
    if (response.status === 404 && !url.pathname.startsWith('/assets/')) {
      response = await env.ASSETS.fetch(new URL("/index.html", request.url));
    }

    return response;
  }
};