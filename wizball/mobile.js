// SDL reuses Module.SDL2.audioContext. Create and resume that exact context
// inside the initiating tap, before Asyncify startup can leave the gesture.
window.WizballMobile = (() => {
  const watched = new WeakSet(), primed = new WeakSet();
  return {
    unlockAudio(module, onState) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return null;
      try {
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* Optional session hint must not block audio. */ }
        module.SDL2 ||= {};
        let context = module.SDL2.audioContext;
        if (!context || context.state === 'closed') {
          context = new Audio();
          module.SDL2.audioContext = context;
        }
        if (!watched.has(context)) {
          context.addEventListener('statechange', onState);
          watched.add(context);
        }
        // Both calls occur synchronously in the trusted gesture handler.
        if (context.state !== 'running') context.resume().then(onState).catch(onState);
        if (!primed.has(context)) {
          const source = context.createBufferSource();
          source.buffer = context.createBuffer(1,1,context.sampleRate);
          source.connect(context.destination);
          source.start(0);
          source.onended = () => source.disconnect();
          primed.add(context);
        }
        onState();
        return context;
      } catch (_) { onState(); return null; }
    },
    fullscreenRequest(stage, document) {
      if (stage.requestFullscreen && document.fullscreenEnabled !== false) return () => stage.requestFullscreen();
      const prefixed = stage.webkitRequestFullscreen || stage.webkitRequestFullScreen;
      if (prefixed && document.webkitFullscreenEnabled !== false) return () => prefixed.call(stage);
      return null;
    }
  };
})();
