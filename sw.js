/* Cookbook offline service worker. Bump VERSION when you want phones to refresh everything. */
var VERSION='cookbook-v6';
var CORE=['./','index.html','recipes.js','manifest.webmanifest','icon-180.png','icon-512.png'];
for(var i=1;i<=40;i++)CORE.push('pack-'+(i<10?'0':'')+i+'.js');

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(CORE.map(function(u){
      return fetch(u,{cache:'reload'}).then(function(r){if(r&&r.ok)return c.put(u,r)}).catch(function(){});
    }));
  }).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==VERSION}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  e.respondWith(
    caches.open(VERSION).then(function(c){
      return c.match(req,{ignoreSearch:true}).then(function(hit){
        var net=fetch(req).then(function(r){
          if(r&&r.ok)c.put(req,r.clone());
          return r;
        }).catch(function(){return null});
        if(hit){e.waitUntil(net);return hit}            /* cached: serve instantly, refresh in background */
        return net.then(function(r){
          if(r)return r;
          if(req.mode==='navigate')return c.match('index.html');
          if(/\.js$/.test(url.pathname))return new Response('',{status:200,headers:{'Content-Type':'application/javascript'}}); /* missing pack offline: skip quietly */
          return new Response('',{status:504});
        });
      });
    })
  );
});
