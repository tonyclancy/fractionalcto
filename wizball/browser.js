'use strict';
const el = id => document.getElementById(id);
const canvas = el('canvas');
let assetBuild = null, preloadedData = null, assetCache = null;
let started = false, storageReady = false, storageAvailable = false, muted = false;
let syncing = false, syncAgain = false, saveTimer = null;
const engineLog = [];
const debugMode = new URLSearchParams(location.search).has('debug');
if (debugMode) {
  const log = document.createElement('pre'); log.id = 'engine-log'; document.body.append(log);
}
function updateDebugLog() { if (debugMode) el('engine-log').textContent = engineLog.slice(-70).join('\n'); }
const saveStatus = text => { el('save-status').textContent = text; };
function fail(message) {
  console.error(message);
  el('launch-screen').hidden = false;
  el('play').hidden = true;
  el('progress-track').hidden = true;
  el('load-status').textContent = 'Couldn’t start the game. Reload the page to try again.';
  saveStatus('Game unavailable');
}
window.wizballSave = function () {
  if (!storageAvailable) return;
  saveStatus('Saving on this device…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSaves, 80);
};
function flushSaves() {
  if (!storageAvailable) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  Module.FS.syncfs(false, error => {
    syncing = false;
    if (error) { saveStatus('Save failed — keep this page open'); console.error('Save persistence failed', error); }
    else saveStatus('Saved on this device');
    if (syncAgain) { syncAgain = false; flushSaves(); }
  });
}
window.wizballExited = function () {
  started = false;
  el('launch-screen').hidden = false;
  el('play').hidden = false;
  el('play').disabled = false;
  el('play').textContent = 'Play again ↗';
  el('load-status').textContent = 'Thanks for playing. Your saved progress stays in this browser.';
  el('pause').disabled = el('sound').disabled = true;
  el('play').onclick = () => location.reload();
  flushSaves();
};
// Packs contain complete original files; a single promise serves background
// prefetches and first-use requests so concurrent callers never duplicate work.
const packDownloads = new Map(), readyPacks = new Set();
let assetWaiters = 0;
function logicalAssetPath(path) {
  const clean = path.replaceAll('\\','/').toLowerCase();
  const start = clean.lastIndexOf('wizball/');
  return start >= 0 ? clean.slice(start) : clean;
}
window.wizballAssetId = path => {
  const logical = logicalAssetPath(path);
  return assetBuild?.packs?.find(pack => pack.paths.includes(logical))?.id || 0;
};
window.wizballSpriteSize = (path, axis) => assetBuild?.spriteSizes?.[logicalAssetPath(path)]?.[axis] || 0;
async function downloadPack(id) {
  if (packDownloads.has(id)) return packDownloads.get(id);
  const pack = assetBuild.packs.find(pack => pack.id === id);
  if (!pack) throw new Error('Unknown asset pack');
  const pending = (async () => {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await assetCache.fetch(pack.file);
        if (!response.ok) throw new Error('Game asset download failed');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length !== pack.bytes) throw new Error('Incomplete game asset pack');
        Module.FS.writeFile(`/web-packs/${id}.zip`, bytes);
        readyPacks.add(id);
        return;
      } catch (error) { lastError = error; }
    }
    throw lastError;
  })();
  packDownloads.set(id, pending);
  try { await pending; } catch(error) { packDownloads.delete(id); throw error; }
}
window.wizballEnsurePack = async id => {
  if (readyPacks.has(id)) return;
  assetWaiters++;
  el('asset-wait').hidden = false;
  try { await downloadPack(id); }
  catch (error) { fail('Could not load the next game assets. Reload to try again.'); throw error; }
  finally { assetWaiters--; el('asset-wait').hidden = assetWaiters === 0; }
};
async function prefetchGameAssets() {
  const queue = [...(assetBuild.packs || [])];
  const worker = async () => {
    while (queue.length) {
      const pack = queue.shift();
      try { await downloadPack(pack.id); } catch(error) { console.warn('Background asset will retry when needed:',pack.file); }
    }
  };
  await Promise.all([worker(), worker()]);
  const complete = await assetCache.settle();
  el('cache-status').textContent = complete
    ? (assetCache.stats.network === 0 ? 'All game assets loaded from this device.' : 'All game assets are saved for faster return visits.')
    : 'Your browser will reuse available cached files.';
}

var Module = {
  canvas,
  noInitialRun: true,
  locateFile: name => new URL(name === 'wizball.wasm' && assetBuild ? assetBuild.wasm : name, location.href).href,
  getPreloadedPackage: (name, bytes) => {
    if (!preloadedData || preloadedData.byteLength !== bytes) throw new Error('Game data version mismatch');
    return preloadedData.buffer;
  },
  print: text => { engineLog.push(String(text)); if (engineLog.length > 200) engineLog.shift(); updateDebugLog(); },
  printErr: text => { engineLog.push(String(text)); console.warn(text); updateDebugLog(); },
  setStatus: text => {
    if (started) return;
    const progress = /\((\d+)\/(\d+)\)/.exec(text);
    if (progress) {
      const percent = Math.min(100, Math.round(Number(progress[1]) / Number(progress[2]) * 100));
      el('progress-bar').style.width = percent + '%';
      el('load-status').textContent = `Loading the game and soundtrack… ${percent}%`;
    }
  },
  onAbort: reason => fail('Engine aborted: ' + reason),
  onExit: () => window.wizballExited(),
  onRuntimeInitialized: () => {
    try {
      Module.FS.mkdir('/web-packs');
      Module.FS.mkdir('/wizball-saves');
      Module.FS.mount(Module.IDBFS, {}, '/wizball-saves');
      Module.FS.syncfs(true, error => {
        storageAvailable = !error;
        if (error) console.warn('Persistent storage unavailable', error);
        Module.FS.chdir('/wizball-saves');
        storageReady = true;
        el('play').disabled = false;
        el('play').textContent = 'Play Wizball ↗';
        el('progress-bar').style.width = '100%';
        el('progress-track').hidden = true;
        el('load-status').textContent = 'Ready — later levels and music load in the background.';
        prefetchGameAssets();
        saveStatus(storageAvailable ? 'Saves on this device' : 'Session only — browser storage unavailable');
      });
    } catch (error) { fail(error); }
  }
};
window.wizballDebug = { engineLog, get started() { return started; }, get storageAvailable() { return storageAvailable; } };
el('play').onclick = () => {
  if (!storageReady || started) return;
  started = true;
  el('launch-screen').hidden = true;
  el('pause').disabled = el('sound').disabled = false;
  canvas.focus();
  try { Module.callMain(debugMode ? ['-debug'] : []); } catch (error) { if (error !== 'unwind') fail(error); }
};
function releaseTouchKeys() {
  document.querySelectorAll('[data-key]').forEach(button => {
    if (started && Module._WIZBALL_web_key) Module._WIZBALL_web_key(Number(button.dataset.key), 0);
    button.classList.remove('held');
  });
}
function pauseGame() {
  if (!started) return;
  releaseTouchKeys();
  window.wizballPaused = true;
  el('pause-screen').hidden = false;
  el('pause').textContent = 'Resume';
}
function resumeGame() {
  window.wizballPaused = false;
  el('pause-screen').hidden = true;
  el('pause').textContent = 'Pause';
  canvas.focus();
}
el('pause').onclick = () => window.wizballPaused ? resumeGame() : pauseGame();
el('resume').onclick = resumeGame;
el('sound').onclick = () => {
  if (!started) return;
  muted = !muted;
  Module._WIZBALL_web_sound(muted ? 1 : 0);
  el('sound').textContent = muted ? 'Sound off' : 'Sound on';
  el('sound').setAttribute('aria-pressed', String(muted));
  canvas.focus();
};
el('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (el('game-stage').requestFullscreen) await el('game-stage').requestFullscreen();
    else { el('game-hint').textContent = 'Fullscreen isn’t available in this browser. Rotate your device for more room.'; return; }
    if (started) canvas.focus();
  } catch (error) { el('game-hint').textContent = 'Your browser did not allow fullscreen. You can keep playing here.'; }
};
el('exit-fullscreen').onclick = () => document.exitFullscreen();
document.addEventListener('fullscreenchange', () => { el('fullscreen').innerHTML = document.fullscreenElement ? 'Exit fullscreen ⛶' : 'Fullscreen ⛶'; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); flushSaves(); } });
window.addEventListener('blur', pauseGame);
window.addEventListener('pagehide', flushSaves);
window.addEventListener('keydown', event => {
  if (started && document.activeElement === canvas && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key)) event.preventDefault();
});
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (!started || window.wizballPaused) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    Module._WIZBALL_web_key(Number(button.dataset.key), 1);
    button.classList.add('held');
  });
  const release = event => {
    if (started && Module._WIZBALL_web_key) Module._WIZBALL_web_key(Number(button.dataset.key), 0);
    button.classList.remove('held');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});
window.addEventListener('error', event => {
  if (!started && /wizball|wasm/i.test(event.filename || event.message || '')) fail(event.message);
});

// Keep each static asset below common hosting limits. Assemble the original
// read-only pack before starting Emscripten; no server runtime is required.
(async function loadEngine() {
  try {
    const response = await fetch(new URL('build.json', location.href), {cache:'no-cache'});
    if (!response.ok) throw new Error('Could not load the build manifest');
    assetBuild = await response.json();
    assetCache = await window.WizballAssetCache.create(assetBuild);
    // Compile as the engine streams in, overlapping this work with asset loading.
    const wasmDownload = assetCache.fetch(assetBuild.wasm).then(response =>
      typeof WebAssembly.compileStreaming === 'function' && response.headers.get('Content-Type')?.split(';')[0] === 'application/wasm'
        ? WebAssembly.compileStreaming(response)
        : response.arrayBuffer().then(bytes => WebAssembly.compile(bytes))
    );
    let loaded = 0, nextOffset = 0;
    preloadedData = new Uint8Array(assetBuild.bytes);
    const dataDownload = Promise.all(assetBuild.data.map(async part => {
      const baseOffset = nextOffset; nextOffset += part.bytes;
      const response = await assetCache.fetch(part.file);
      const reader = response.body.getReader(); let size = 0;
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        if (size + value.length > part.bytes) throw new Error('Incorrect game asset length');
        preloadedData.set(value,baseOffset+size); size += value.length; loaded += value.length;
        Module.setStatus(`Loading startup assets... (${loaded}/${assetBuild.bytes})`);
      }
      if (size !== part.bytes) throw new Error('Incomplete game assets');
    }));
    const [, compiledEngine] = await Promise.all([dataDownload, wasmDownload]);
    Module.instantiateWasm = (imports, receiveInstance) => {
      const instance = new WebAssembly.Instance(compiledEngine, imports);
      receiveInstance(instance, compiledEngine);
      return instance.exports;
    };
    el('cache-status').textContent = assetCache.stats.network === 0
      ? 'Startup assets loaded from this device.'
      : 'Saving downloaded assets for faster return visits…';
    el('load-status').textContent = 'Preparing the game…';
    const script = document.createElement('script'); script.src = './wizball.js'; script.onerror = () => fail('Engine download failed'); document.body.append(script);
  } catch (error) { fail(error); }
})();

const touchControls = el('touch-controls');
touchControls.hidden = !matchMedia('(pointer:coarse)').matches;
el('controls-toggle').setAttribute('aria-expanded', String(!touchControls.hidden));
el('controls-toggle').onclick = () => {
  touchControls.hidden = !touchControls.hidden;
  el('controls-toggle').setAttribute('aria-expanded', String(!touchControls.hidden));
  releaseTouchKeys();
};
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement && matchMedia('(pointer:coarse)').matches) el('game-stage').append(touchControls);
  else document.querySelector('.game-toolbar').after(touchControls);
});
