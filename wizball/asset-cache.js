// Cache only this game's immutable, content-addressed assets. New builds use a
// new namespace, so cached files cannot be mixed with another engine version.
window.WizballAssetCache = {
  async create(manifest) {
    const files = [manifest.wasm, ...manifest.data.map(part => part.file), ...(manifest.packs || []).map(pack => pack.file)];
    const prefix = 'wizball-assets-v1-';
    const name = prefix + manifest.wasm.replace(/[^a-z0-9]/g,'') + '-' + manifest.data[0].file.replace(/[^a-z0-9]/g,'');
    const url = file => new URL(file, location.href).href;
    let cache = null, writable = true, previous = [];
    const pending = new Set(), stats = {hits:0, network:0};
    try {
      cache = await caches.open(name);
      previous = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== name);
    } catch (_) { writable = false; }
    function save(file, response) {
      if (!cache || !writable) return;
      const task = cache.put(url(file), response.clone()).catch(() => { writable = false; });
      pending.add(task); task.finally(() => pending.delete(task));
    }
    return {
      stats,
      async fetch(file) {
        if (!files.includes(file)) throw new Error('Unknown game asset');
        if (cache) {
          try {
            let response = await cache.match(url(file));
            if (!response) {
              for (const key of previous) {
                response = await (await caches.open(key)).match(url(file));
                if (response) { save(file,response); break; }
              }
            }
            if (response) { stats.hits++; return response; }
          } catch (_) { /* Storage is optional; network loading remains usable. */ }
        }
        stats.network++;
        const response = await fetch(url(file));
        if (!response.ok) throw new Error('Could not download game assets');
        save(file,response);
        return response;
      },
      async settle() {
        await Promise.all([...pending]);
        if (!cache || !writable) return false;
        try {
          const complete = (await Promise.all(files.map(file => cache.match(url(file))))).every(Boolean);
          if (!complete) return false;
          // Retain one prior build for another open game tab; trim older builds
          // only after the current build is fully cached.
          const old = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== name);
          await Promise.all(old.slice(0,-1).map(key => caches.delete(key)));
          return true;
        } catch (_) { return false; }
      }
    };
  }
};
