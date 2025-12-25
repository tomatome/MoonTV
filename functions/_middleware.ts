// functions/_middleware.ts
export const onRequest: PagesFunction = async (context) => {
  const country = context.request.headers.get('CF-IPCountry') || 'XX';
  
  // 仅允许中国大陆（CN）访问
  // 如需放开港澳台，可加 'HK', 'MO', 'TW'，但注意法律与合规风险
  const allowed = ['CN'];

  if (!allowed.includes(country)) {
    // 可选：记录日志（调试时开启）
    // console.log(`[Blocked] ${country} → ${context.request.url}`);

    return new Response(
      `<html><head><meta charset="utf-8"><title>Access Denied</title></head>
       <body style="text-align:center; padding:50px; font-family:sans-serif;">
         <h2>⚠️ 访问受限</h2>
         <p>本服务仅限中国大陆地区访问</p>
         <p><small>IP 归属地：${country}</small></p>
       </body></html>`,
      {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }

  // 放行中国 IP
  return context.next();
};
