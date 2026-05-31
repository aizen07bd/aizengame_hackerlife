(function () {
  const enabledKey = 'hltAudioEnabled';
  let bgm = null;
  let config = null;
  const sfx = new Map();

  function audioEnabled() {
    return sessionStorage.getItem(enabledKey) === '1';
  }

  function loadAudio() {
    if (!config) return;
    if (config.bgm && (!bgm || bgm.dataset.src !== config.bgm)) {
      if (bgm) bgm.pause();
      bgm = new Audio(config.bgm);
      bgm.dataset.src = config.bgm;
      bgm.loop = true;
      bgm.volume = config.bgmVolume ?? 0.28;
      bgm.preload = 'auto';
    }
    Object.entries(config.sfx || {}).forEach(([name, src]) => {
      if (sfx.has(name)) return;
      const clip = new Audio(src);
      clip.volume = config.sfxVolume ?? 0.58;
      clip.preload = 'auto';
      sfx.set(name, clip);
    });
  }

  function playBgm() {
    loadAudio();
    if (!audioEnabled() || !bgm) return;
    bgm.play().catch(() => {});
  }

  function playSfx(name) {
    loadAudio();
    if (!audioEnabled()) return;
    const source = sfx.get(name);
    if (!source) return;
    const clip = source.cloneNode();
    clip.volume = source.volume;
    clip.play().catch(() => {});
  }

  function attachResumeEvents() {
    ['pointerdown', 'touchstart', 'keydown'].forEach(eventName => {
      window.addEventListener(eventName, playBgm, { once: true, passive: true });
    });
  }

  window.HLTAudio = {
    init(options) {
      config = options || {};
      loadAudio();
      attachResumeEvents();
      playBgm();
      document.addEventListener('click', event => {
        if (event.target.closest('button, a')) playSfx('click');
      }, true);
    },
    enable() {
      sessionStorage.setItem(enabledKey, '1');
      playBgm();
    },
    play(name) {
      playSfx(name);
    }
  };
})();
