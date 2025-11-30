// 🟢 Vercel Edge Function (runtime: edge)
export const config = {
  runtime: 'edge',
};

function log(event, data = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...data }));
}

export default async function handler(req) {
  const url = new URL(req.url);
  if (url.pathname !== '/api/audio') {
    return new Response('🎧 Audio Proxy by ksa79111-dev', { status: 200 });
  }

  const fileId = url.searchParams.get('id');
  if (!fileId) {
    return new Response('❌ Missing "id"', { status: 400 });
  }

  const clientRange = req.headers.get('range');

  try {
    // 🔹 Шаг 1: Получить прямую ссылку (Location) через HEAD + confirm=t
    const headUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
    let res = await fetch(headUrl, {
      method: 'HEAD',
      redirect: 'manual',
    });

    if (res.status === 302) {
      const location = res.headers.get('location');
      if (!location) throw new Error('No Location in 302');

      // 🔹 Шаг 2: Запросить по прямой ссылке — с Range
      res = await fetch(location, {
        method: 'GET',
        headers: clientRange ? { 'Range': clientRange } : {},
        redirect: 'manual',
      });
    }

    // 🔹 Шаг 3: Формируем ответ
    const status = res.status; // 200 или 206
    const headers = new Headers();

    // Обязательные
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('Content-Type', res.headers.get('content-type') || 'audio/mpeg');

    // Динамические
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');

    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentRange) headers.set('Content-Range', contentRange);

    // Чистим
    ['content-disposition', 'x-frame-options', 'content-security-policy'].forEach(h => headers.delete(h));

    log('ok', { status, contentRange, contentLength });

    return new Response(res.body, { status, headers });

  } catch (e) {
    log('err', { msg: e.message });
    return new Response(`❌ ${e.message}`, { status: 500 });
  }
}
