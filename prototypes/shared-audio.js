(function () {
  const enabledKey = 'hltAudioEnabled';
  const progressKey = 'hltProgressV1';
  const statePrefix = 'hltState:';
  let bgm = null;
  let config = null;
  const sfx = new Map();

  const episodes = [
    { id: 'ep01', no: 1, title: 'EP.01 FIRST LOGIN', subtitle: 'LMS 세션 복원', path: 'prototypes/episode-01-vn-scene/index.html' },
    { id: 'ep02', no: 2, title: 'EP.02 THE LINK AT HOME', subtitle: '피싱 피해 범위 확인', path: 'prototypes/episode-02-comic-animation/index.html' },
    { id: 'ep03', no: 3, title: 'EP.03 CLUBROOM GHOST TRACE', subtitle: '동아리 PC 이상 흔적', path: 'prototypes/episode-03-comic-animation/index.html' },
    { id: 'ep04', no: 4, title: 'EP.04 SIGNAL AT THE CONFERENCE', subtitle: '컨퍼런스와 공개 정보', path: 'prototypes/episode-04-comic-animation/index.html' },
    { id: 'ep05', no: 5, title: 'EP.05 FIRST LOOK', subtitle: '해인 PC 1차 분석', path: 'prototypes/episode-05-comic-animation/index.html' },
    { id: 'ep06', no: 6, title: 'EP.06 A CALL DURING THE BREAK', subtitle: '외부 맥락 수집', path: 'prototypes/episode-06-comic-animation/index.html' },
    { id: 'ep07', no: 7, title: 'EP.07 SECOND LOOK', subtitle: '해인 PC 2차 분석', path: 'prototypes/episode-07-comic-animation/index.html' },
    { id: 'ep08', no: 8, title: 'EP.08 CLUB BRIEFING', subtitle: '화이트보드 타임라인', path: 'prototypes/episode-08-comic-animation/index.html' },
    { id: 'ep09', no: 9, title: 'EP.09 PATTERN HUNT', subtitle: '패턴 연결', path: 'prototypes/episode-09-comic-animation/index.html' },
    { id: 'ep10', no: 10, title: 'EP.10 YUNA PERSONAL PC', subtitle: '유나 PC 범위 분석', path: 'prototypes/episode-10-comic-animation/index.html' },
    { id: 'ep11', no: 11, title: 'EP.11 WEB SERVER ANALYSIS', subtitle: '웹 서버와 웹 로그', path: 'prototypes/episode-11-comic-animation/index.html' },
    { id: 'ep12', no: 12, title: 'EP.12 EVENT CORRELATION', subtitle: '보안장비 이벤트', path: 'prototypes/episode-12-comic-animation/index.html' },
    { id: 'ep13', no: 13, title: 'EP.13 FORENSIC IMAGE', subtitle: '포렌식 이미지 분석', path: 'prototypes/episode-13-comic-animation/index.html' },
    { id: 'ep14', no: 14, title: 'EP.14 MALWARE LAB', subtitle: '악성코드 분석', path: 'prototypes/episode-14-comic-animation/index.html' },
    { id: 'ep15', no: 15, title: 'EP.15 FINAL REPORT', subtitle: '최종 보고와 엔딩', path: 'prototypes/episode-15-comic-animation/index.html' }
  ];

  function audioEnabled() {
    return sessionStorage.getItem(enabledKey) === '1';
  }

  function safeJsonParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }

  function readProgress() {
    const progress = safeJsonParse(localStorage.getItem(progressKey), null) || {};
    const unlocked = Array.isArray(progress.unlocked) ? progress.unlocked : ['ep01'];
    if (!unlocked.includes('ep01')) unlocked.unshift('ep01');
    return {
      version: 1,
      lastPath: progress.lastPath || '',
      lastEpisode: progress.lastEpisode || 'ep01',
      unlocked,
      updatedAt: progress.updatedAt || ''
    };
  }

  function writeProgress(progress) {
    const next = Object.assign({}, readProgress(), progress || {});
    next.unlocked = [...new Set(next.unlocked || ['ep01'])].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
    next.updatedAt = new Date().toISOString();
    localStorage.setItem(progressKey, JSON.stringify(next));
    return next;
  }

  function currentRootPath() {
    let path = window.location.pathname.replace(/\\/g, '/');
    const idx = path.indexOf('/prototypes/');
    if (idx >= 0) return path.slice(idx + 1);
    const file = path.split('/').pop();
    if (file === 'index.html' || file === '') return 'index.html';
    return path.replace(/^\//, '');
  }

  function appBasePath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const idx = path.indexOf('/prototypes/');
    if (idx >= 0) return path.slice(0, idx + 1);
    return path.replace(/[^/]*$/, '');
  }

  function hrefFor(rootPath) {
    return appBasePath() + rootPath;
  }

  function episodeFromPath(rootPath) {
    const match = rootPath.match(/prototypes\/episode-(\d{2})-/);
    if (!match) return '';
    return `ep${match[1]}`;
  }

  function unlockThrough(episodeId) {
    const no = Number((episodeId || '').slice(2));
    if (!no) return readProgress().unlocked;
    const unlocked = new Set(readProgress().unlocked);
    episodes.forEach(ep => {
      if (ep.no <= no) unlocked.add(ep.id);
    });
    return [...unlocked];
  }

  function restoreEpisodeState() {
    for (let i = 1; i <= 15; i += 1) {
      const ep = String(i).padStart(2, '0');
      ['Evidence', 'Conclusion'].forEach(suffix => {
        const key = `ep${ep}${suffix}`;
        if (sessionStorage.getItem(key) === null) {
          const saved = localStorage.getItem(statePrefix + key);
          if (saved !== null) sessionStorage.setItem(key, saved);
        }
      });
    }
  }

  function mirrorEpisodeState() {
    if (window.__hltStateMirrorInstalled) return;
    window.__hltStateMirrorInstalled = true;
    const setItem = Storage.prototype.setItem;
    const removeItem = Storage.prototype.removeItem;
    const clear = Storage.prototype.clear;
    Storage.prototype.setItem = function (key, value) {
      setItem.call(this, key, value);
      if (this === sessionStorage && /^ep\d{2}(Evidence|Conclusion)$/.test(key)) {
        localStorage.setItem(statePrefix + key, String(value));
      }
    };
    Storage.prototype.removeItem = function (key) {
      removeItem.call(this, key);
      if (this === sessionStorage && /^ep\d{2}(Evidence|Conclusion)$/.test(key)) {
        localStorage.removeItem(statePrefix + key);
      }
    };
    Storage.prototype.clear = function () {
      if (this === sessionStorage) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(statePrefix + 'ep')) localStorage.removeItem(key);
        });
      }
      clear.call(this);
    };
  }

  function clearEpisodeState(episodeId) {
    const no = String(Number((episodeId || '').slice(2)) || 0).padStart(2, '0');
    if (no === '00') return;
    ['Evidence', 'Conclusion'].forEach(suffix => {
      const key = `ep${no}${suffix}`;
      sessionStorage.removeItem(key);
      localStorage.removeItem(statePrefix + key);
    });
  }

  function clearRunState() {
    for (let i = 1; i <= 15; i += 1) clearEpisodeState(`ep${String(i).padStart(2, '0')}`);
  }

  function markCurrentPage() {
    const rootPath = currentRootPath();
    if (rootPath === 'index.html' || rootPath === 'prototypes/mobile-start/index.html') return;
    const episodeId = episodeFromPath(rootPath);
    const progress = readProgress();
    const next = {
      lastPath: rootPath,
      lastEpisode: episodeId || progress.lastEpisode,
      unlocked: episodeId ? unlockThrough(episodeId) : progress.unlocked
    };
    if (rootPath === 'prototypes/game-credits/index.html') {
      next.unlocked = episodes.map(ep => ep.id);
      next.lastEpisode = 'ep15';
    }
    if (rootPath === 'prototypes/prologue-comic-animation/index-inline-text.html') {
      next.unlocked = unlockThrough('ep01');
      next.lastEpisode = 'ep01';
    }
    writeProgress(next);
  }

  mirrorEpisodeState();
  restoreEpisodeState();
  markCurrentPage();

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

  window.HLTProgress = {
    episodes,
    read: readProgress,
    write: writeProgress,
    href: hrefFor,
    currentRootPath,
    clearEpisodeState,
    clearRunState,
    unlockThrough,
    go(rootPath) {
      window.location.href = hrefFor(rootPath);
    },
    goEpisode(episodeId, options = {}) {
      const ep = episodes.find(item => item.id === episodeId);
      if (!ep) return;
      if (options.clearState) clearEpisodeState(episodeId);
      writeProgress({ lastPath: ep.path, lastEpisode: episodeId, unlocked: unlockThrough(episodeId) });
      window.location.href = hrefFor(ep.path);
    },
    continue() {
      const progress = readProgress();
      if (progress.lastPath) {
        window.location.href = hrefFor(progress.lastPath);
        return true;
      }
      return false;
    }
  };

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
