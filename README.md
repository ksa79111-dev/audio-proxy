# 🎧 Audio Proxy for Google Drive

Прокси для проигрывания аудио из Google Drive с поддержкой:
- ✅ Автозапуска  
- ✅ Перемотки (seek)  
- ✅ Повтора и случайного порядка  
- ✅ Смены папки по ID

---

## 🚀 Развернуть за 1 клик

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fksa79111-dev%2Faudio-proxy&project-name=audio-proxy&repository-name=audio-proxy)

> 🔹 Требуется аккаунт GitHub  
> 🔹 Разрешите доступ Vercel к репозиторию  
> 🔹 Готово за 30 секунд!

---

## 📥 Как использовать

После деплоя вы получите URL вида:  
`https://audio-proxy.vercel.app`

В вашем `index.html` замените:

```js
// БЫЛО:
const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(directUrl);

// СТАЛО:
const proxyUrl = `https://audio-proxy.vercel.app/api/audio?id=${song.id}`;
