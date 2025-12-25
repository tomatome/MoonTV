// functions/_middleware.js  ← 注意是 .js！
export default async function handleRequest(context) {
  const country = context.request.headers.get('CF-IPCountry') || 'XX';

  if (country !== 'CN') {
    return new Response(
      `<h2 style="text-align:center;margin:50px">🚫 仅限中国大陆访问</h2><p>IP 归属地: ${country}</p>`,
      { 
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }

  return context.next();
}
