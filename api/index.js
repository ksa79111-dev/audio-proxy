// 🟢 Vercel Edge Function (runtime: edge)
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  if (url.pathname !== '/api/audio') {
    return new Response('🎧 Audio Proxy by ksa79111-dev', { status: 200 });
  }

  const fileId = url.searchParams.get('id');
  if (!fileId) {
    return new Response('❌ Missing "id"', { status: 400 });
  }

  try {
    // Запрос HEAD к Drive → получаем Location
    const headUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
    const res = await fetch(headUrl, {
      method: 'HEAD',
      redirect: 'manual',
    });

    if (res.status === 303 || res.status === 302) {
      const location = res.headers.get('location');
      if (location) {
        // ✅ Просто редиректим клиента напрямую на googleusercontent.com
        return new Response(null, {
          status: 302,
          headers: {
            Location: location,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD',
            'Access-Control-Allow-Headers': 'Range',
          },
        });
      }
    }

    return new Response('❌ Could not resolve audio URL', { status: 500 });
  } catch (e) {
    return new Response(`❌ ${e.message}`, { status: 500 });
  }
}
