/* Xaiu猫猫守护团 · Service Worker：本地加速（缓存页面与依赖，重复打开秒开，离线可用） */
const CACHE = 'xaiu-cat-v1';
self.addEventListener('install', function(e){
  self.skipWaiting();
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function(e){
  const req = e.request;
  const url = new URL(req.url);
  const sameOrigin = url.hostname === self.location.hostname;
  const isCdn = url.hostname.indexOf('jsdelivr.net') >= 0;
  const isIndex = req.mode === 'navigate' || url.pathname === '/' || /\/index\.html$/.test(url.pathname);
  if(req.method !== 'GET') return;

  // 页面：先用网络，失败才用缓存（保证更新能上线）
  if(isIndex){
    e.respondWith(fetch(req).then(function(res){
      const copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put('/index.html', copy); }).catch(function(){});
      return res;
    }).catch(function(){
      return caches.match('/index.html').then(function(m){ return m || caches.match(req); });
    }));
    return;
  }
  // 静态/依赖：缓存优先，找不到再联网并写入缓存
  if(sameOrigin || isCdn){
    e.respondWith(caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      });
    }));
  }
});
