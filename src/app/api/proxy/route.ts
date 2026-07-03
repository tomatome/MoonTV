// src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url parameter', { status: 400 });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://dbiptv.sn.chinamobile.com/',
        'Origin': 'http://dbiptv.sn.chinamobile.com', // 增加 Origin
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        // 去掉 Accept-Encoding，避免压缩
        'Connection': 'keep-alive',
        // 如果源站需要 cookie，可以在这里添加（从环境变量读取）
        // 'Cookie': process.env.LIVE_COOKIE || '',
      },
      // 增加超时控制（可选）
      // signal: AbortSignal.timeout(10000),
    });

    // 如果请求失败，直接返回错误
    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
    }

    // 对于 M3U8 或 TS 文件，使用 arrayBuffer 没问题，但如果文件很大（TS片段通常几MB），可以考虑流式返回
    const data = await response.arrayBuffer();
    
    // 获取正确的 Content-Type
    const contentType = response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl';
    
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        // 可选：缓存控制，对于直播流通常不需要缓存
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Proxy error', { status: 500 });
  }
}
