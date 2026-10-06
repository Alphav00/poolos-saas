// Stands in for the claude.ai artifact runtime so boards built as Claude
// artifacts run unchanged inside PoolOS. Provides window.claude.use() for:
//   db         collections and documents, stored in D1 through /api/boards
//   user       the signed-in colleague (from Cloudflare Access)
//   downloads  saves a file in the browser
// `sample` (asking Claude) is not available here; boards already handle that.
(function () {
  'use strict';
  var BOARD = (location.pathname.match(/\/boards\/([a-z0-9-]+)(?:\.html)?\/?$/) || [])[1];
  var API = '/api/boards/' + BOARD + '/';
  var POLL_MS = 3000;
  var HIDDEN_POLL_MS = 15000;
  var OVERLAP_MS = 10000;

  function err(code, message) {
    var e = new Error(message || code);
    e.code = code;
    return e;
  }

  function call(method, path, body) {
    return fetch(API + path, {
      method: method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify({ data: body }) : undefined,
    }).then(function (res) {
      if (res.status === 401) throw err('unauthenticated', 'Sign in again');
      return res.json().then(function (j) {
        if (!res.ok) throw err((j.error && j.error.code) || 'http_' + res.status, j.error && j.error.message);
        return j;
      });
    });
  }

  function docSnap(id, data) {
    return { id: id, exists: data != null, data: function () { return data == null ? undefined : JSON.parse(JSON.stringify(data)); } };
  }

  function querySnap(map) {
    var docs = Object.keys(map).map(function (id) { return docSnap(id, map[id]); });
    return { docs: docs, size: docs.length, empty: docs.length === 0, forEach: function (f) { docs.forEach(f); } };
  }

  // One poller per collection, shared by every listener on it.
  var feeds = {};
  function feed(collection) {
    if (feeds[collection]) return feeds[collection];
    var f = { map: {}, since: null, listeners: [], loaded: false, timer: null };
    function tick() {
      clearTimeout(f.timer);
      var q = f.since ? '?since=' + encodeURIComponent(f.since) : '';
      return call('GET', encodeURIComponent(collection) + q)
        .then(function (r) {
          var changed = !f.loaded;
          r.docs.forEach(function (d) {
            if (d.deleted) { if (d.id in f.map) { delete f.map[d.id]; changed = true; } }
            else if (JSON.stringify(f.map[d.id]) !== JSON.stringify(d.data)) { f.map[d.id] = d.data; changed = true; }
          });
          // Resume from the newest change seen, minus an overlap: a write is
          // stamped just before it commits, so a slightly older one can land
          // after a newer one. Re-reading the overlap is harmless.
          var newest = maxTs(r.docs);
          if (newest && (!f.since || newest > f.since)) f.since = new Date(Date.parse(newest) - OVERLAP_MS).toISOString();
          f.loaded = true;
          if (changed) emit(f);
        })
        .catch(function (e) { f.listeners.forEach(function (l) { if (l.onError) l.onError(e); }); })
        .then(function () { f.timer = setTimeout(tick, document.hidden ? HIDDEN_POLL_MS : POLL_MS); });
    }
    f.refresh = tick;
    feeds[collection] = f;
    tick();
    return f;
  }
  function maxTs(docs) {
    return docs.reduce(function (m, d) { return d.updated_at > m ? d.updated_at : m; }, '');
  }
  function emit(f) {
    var snap = querySnap(f.map);
    f.listeners.forEach(function (l) { try { l.onNext(snap); } catch (e) { console.error(e); } });
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) Object.keys(feeds).forEach(function (k) { feeds[k].refresh(); });
  });

  function split(path) {
    var i = String(path).indexOf('/');
    if (i < 1) throw err('invalid_argument', 'Document path must be "collection/id"');
    return { collection: path.slice(0, i), id: path.slice(i + 1) };
  }
  function afterWrite(collection) {
    return function (r) { if (feeds[collection]) feeds[collection].refresh(); return r; };
  }

  var db = {
    collection: function (name) {
      return {
        onSnapshot: function (onNext, onError) {
          var f = feed(name);
          var l = { onNext: onNext, onError: onError };
          f.listeners.push(l);
          if (f.loaded) setTimeout(function () { onNext(querySnap(f.map)); }, 0);
          return function () { f.listeners = f.listeners.filter(function (x) { return x !== l; }); };
        },
        get: function () {
          return call('GET', encodeURIComponent(name)).then(function (r) {
            var m = {};
            r.docs.forEach(function (d) { m[d.id] = d.data; });
            return querySnap(m);
          });
        },
      };
    },
    doc: function (path) {
      var p = split(path);
      var url = encodeURIComponent(p.collection) + '/' + encodeURIComponent(p.id);
      return {
        id: p.id,
        get: function () { return call('GET', url).then(function (r) { return docSnap(p.id, r.exists ? r.data : null); }); },
        set: function (data) { return call('PUT', url, data).then(afterWrite(p.collection)); },
        update: function (data) { return call('PATCH', url, data).then(afterWrite(p.collection)); },
        delete: function () { return call('DELETE', url).then(afterWrite(p.collection)); },
        onSnapshot: function (onNext, onError) {
          return db.collection(p.collection).onSnapshot(function (s) {
            var d = null;
            s.docs.forEach(function (x) { if (x.id === p.id) d = x.data(); });
            onNext(docSnap(p.id, d));
          }, onError);
        },
      };
    },
  };

  var me = fetch('/api/me', { credentials: 'same-origin' }).then(function (r) {
    if (!r.ok) throw err('unauthenticated', 'Sign in again');
    return r.json();
  });

  var user = {
    isOwner: function () { return me.then(function (m) { return !!m.isOwner; }); },
    can: function () { return Promise.resolve(true); },
    email: function () { return me.then(function (m) { return m.email; }); },
  };

  var downloads = {
    save: function (opts) {
      var blob = opts.data instanceof Blob ? opts.data : new Blob([opts.data], { type: opts.contentType || 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = opts.filename || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return Promise.resolve({ saved: true });
    },
  };

  window.claude = {
    use: function (name) {
      if (!BOARD) return Promise.reject(err('unavailable', 'Not on a board page'));
      if (name === 'db') return Promise.resolve(db);
      if (name === 'user') return me.then(function () { return user; });
      if (name === 'downloads') return Promise.resolve(downloads);
      return Promise.reject(err('unavailable', '"' + name + '" is not available in PoolOS'));
    },
  };
})();
