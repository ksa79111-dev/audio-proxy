// 🟢 Vercel Edge Function (runtime: edge)
export const config = {
  runtime: 'edge',
};

// 🔔 Логгирование — в Vercel Logs (в панели)
function log(event, data = {}) {
  console.log(JSON.stringify({
    time: new Date().toISOString(),
    event,
    ...data
  }));
}

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // ➕ Статистика: /stats → количество вызовов
  if (path === '/api/stats') {
    // В Edge Runtime нет persistent storage, но можно использовать KV (платно) или просто возвращать заголовки
    // Пока — заглушка (на Hobby можно подключить free KV позже)
    return new Response(JSON.stringify({
      message: 'Stats API ready (KV integration available on Pro plan)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 🎵 Основной endpoint: /api/audio?id=...
  if (path === '/api/audio') {
    const fileId = url.searchParams.get('id');
    const referer = req.headers.get('referer') || 'unknown';
    
    if (!fileId) {
      log('error', { type: 'missing_id', referer });
      return new Response('❌ Missing "id" parameter', { status: 400 });
    }

    log('request', { fileId, referer });

    try {
      const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;

      const driveRes = await fetch(driveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AudioPlayer/1.0)',
        },
        redirect: 'follow',
        next: { revalidate: 0 }, // no cache
      });

      if (!driveRes.ok) {
        const status = driveRes.status;
        const snippet = await driveRes.text().then(t => t.substring(0, 100));
        log('drive_error', { fileId, status, snippet });
        return new Response(`❌ Drive error ${status}`, { status });
      }

      // ✅ Чистим заголовки
      const headers = new Headers(driveRes.headers);
      headers.set('Content-Type', 'audio/mpeg');
      headers.set('Accept-Ranges', 'bytes');
      headers.delete('Content-Disposition');
      headers.delete('X-Frame-Options');
      headers.delete('Content-Security-Policy');
      headers.set('Cache-Control', 'public, max-age=3600'); // кэш 1 час

      log('success', { fileId, size: headers.get('content-length') });

      // 🚀 Streaming — экономим память
      return new Response(driveRes.body, { headers });

    } catch (err) {
      log('proxy_error', { fileId, error: err.message });
      return new Response(`❌ Proxy error`, { status: 500 });
    }
  }

  return new Response('🎧 Audio Proxy by ksa79111-dev\nEndpoints: /api/audio?id=..., /api/stats', {
    headers: { 'Content-Type': 'text/plain' }
  });
}
