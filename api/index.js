// 🟢 Vercel Edge Function (runtime: edge)
export const config = {
  runtime: 'edge',
};

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

  // ➕ Stats
  if (path === '/api/stats') {
    return new Response(JSON.stringify({
      message: 'Stats API ready'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 🎵 /api/audio?id=...
  if (path === '/api/audio') {
    const fileId = url.searchParams.get('id');
    const referer = req.headers.get('referer') || 'unknown';
    
    if (!fileId) {
      log('error', { type: 'missing_id', referer });
      return new Response('❌ Missing "id" parameter', { status: 400 });
    }

    // ✅ УБРАЛИ ПРОБЕЛЫ, ДОБАВИЛИ confirm=t
    const initialDriveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;

    // Получаем клиентский Range (например: "bytes=1000-2000")
    const clientRange = req.headers.get('range');

    try {
      // Шаг 1: делаем GET с redirect: 'manual'
      let driveRes = await fetch(initialDriveUrl, {
        method: 'GET',
        headers: clientRange ? { 'Range': clientRange } : {},
        redirect: 'manual',
      });

      // Шаг 2: если 302 — идём по Location вручную, с тем же Range
      if (driveRes.status === 302) {
        const location = driveRes.headers.get('location');
        if (!location) {
          log('error', { type: 'no_location', fileId });
          return new Response('❌ Redirect without Location', { status: 500 });
        }

        // Повторяем запрос на location — с тем же Range
        driveRes = await fetch(location, {
          method: 'GET',
          headers: clientRange ? { 'Range': clientRange } : {},
          redirect: 'manual',
        });
      }

      // Теперь driveRes — либо 200, либо 206

      // 🧾 Формируем заголовки ответа
      const responseHeaders = new Headers();

      // Обязательные:
      responseHeaders.set('Accept-Ranges', 'bytes');
      responseHeaders.set('Cache-Control', 'public, max-age=3600');
      responseHeaders.set('Content-Type', 'audio/mpeg'); // можно взять из driveRes.headers.get('content-type')

      // Динамические — только если есть
      const contentLength = driveRes.headers.get('content-length');
      const contentRange = driveRes.headers.get('content-range');

      if (contentLength) responseHeaders.set('Content-Length', contentLength);
      if (contentRange) responseHeaders.set('Content-Range', contentRange);

      // Чистим нежелательные заголовки
      [
        'Content-Disposition',
        'X-Frame-Options',
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'Strict-Transport-Security'
      ].forEach(h => responseHeaders.delete(h));

      // ✅ Логгирование
      const status = driveRes.status;
      log('success', {
        fileId,
        status,
        range: clientRange,
        contentLength,
        contentRange
      });

      // 🚀 Возвращаем streaming-ответ
      return new Response(driveRes.body, {
        status,
        headers: responseHeaders
      });

    } catch (err) {
      log('proxy_error', { fileId, error: err.message, stack: err.stack });
      return new Response(`❌ Proxy error: ${err.message}`, { status: 500 });
    }
  }

  return new Response('🎧 Audio Proxy by ksa79111-dev\nEndpoints: /api/audio?id=..., /api/stats', {
    headers: { 'Content-Type': 'text/plain' }
  });
}
