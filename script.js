'use strict';

(() => {
  const board = document.getElementById('game-board');
  const levelNumber = document.getElementById('level-number');
  const levelStat = document.getElementById('level-stat');
  const movesStat = document.getElementById('moves-stat');
  const bestStat = document.getElementById('best-stat');
  const gridSize = document.getElementById('grid-size');
  const boardHint = document.getElementById('board-hint');
  const gameMessage = document.getElementById('game-message');
  const soundToggle = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');
  const musicToggle = document.getElementById('music-toggle');
  const musicIcon = document.getElementById('music-icon');
  const musicLabel = document.getElementById('music-label');
  const restartButton = document.getElementById('restart-button');
  const resultModal = document.getElementById('result-modal');
  const resultSymbol = document.getElementById('result-symbol');
  const resultEyebrow = document.getElementById('result-eyebrow');
  const resultTitle = document.getElementById('result-title');
  const resultDescription = document.getElementById('result-description');
  const resultLevel = document.getElementById('result-level');
  const resultMoves = document.getElementById('result-moves');
  const resultMainButton = document.getElementById('result-main-button');
  const resultRetryButton = document.getElementById('result-retry-button');

  const DIRECTIONS = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
  ];
  const keyOf = (q, r) => `${q},${r}`;
  const distanceFromCenter = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

  let level = 1;
  let radius = 4;
  let moves = 0;
  let catKey = keyOf(0, 0);
  let cells = new Map();
  let finished = false;
  let audioContext = null;
  let musicGainNode = null;
  let musicInterval = null;
  let musicStep = 0;
  let soundEnabled = readStorage('catTrapSound', 'on') !== 'off';
  // Background music starts only after the player presses MUSIC, as browsers require a user gesture.
  let musicEnabled = false;
  let bestLevel = Number(readStorage('catTrapBestLevel', '1')) || 1;
  bestLevel = Math.max(1, Math.min(999, bestLevel));

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) { /* Storage can be disabled; the game still works. */ }
  }

  function ensureAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    } catch (_) {
      return null;
    }
  }

  function playTone(frequency, duration = 0.075, type = 'sine', volume = 0.035) {
    if (!soundEnabled) return;
    try {
      const context = ensureAudioContext();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch (_) { /* Audio is an optional enhancement. */ }
  }

  function midiToFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // Original, synthesized sneaky-jazz loop written for Cat Trap: no copied recording or theme melody.
  const spyMelody = [74, null, 77, 81, null, 79, 77, null, 74, null, 72, 69, null, 72, 74, null];
  const spyBass = [38, null, 45, null, 41, null, 45, null, 43, null, 50, null, 40, null, 45, null];
  const spyChords = { 3: [65, 69], 7: [62, 69], 11: [60, 64], 15: [57, 61] };

  function playMusicVoice(frequency, when, duration, type, volume) {
    if (!audioContext || !musicGainNode) return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope);
    envelope.connect(musicGainNode);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  function scheduleMusicStep() {
    if (!musicEnabled || !audioContext || !musicGainNode) return;
    const step = musicStep % 16;
    const when = audioContext.currentTime + 0.025;

    const bassNote = spyBass[step];
    if (bassNote !== null) playMusicVoice(midiToFrequency(bassNote), when, 0.22, 'triangle', 0.13);

    const melodyNote = spyMelody[step];
    if (melodyNote !== null) playMusicVoice(midiToFrequency(melodyNote), when, 0.15, 'triangle', 0.085);

    const chord = spyChords[step];
    if (chord) {
      chord.forEach((note) => playMusicVoice(midiToFrequency(note), when + 0.035, 0.13, 'sine', 0.025));
    }

    // A soft high click gives the loop a light brushed-percussion pulse.
    if (step % 4 === 2) playMusicVoice(1320, when, 0.025, 'sine', 0.015);
    musicStep += 1;
  }

  function syncMusicButton() {
    musicToggle.setAttribute('aria-pressed', String(musicEnabled));
    musicToggle.title = musicEnabled ? 'Turn original background music off' : 'Turn original background music on';
    musicIcon.textContent = musicEnabled ? '♬' : '♫̸';
    musicLabel.textContent = musicEnabled ? 'MUSIC ON' : 'MUSIC OFF';
  }

  function startBackgroundMusic() {
    const context = ensureAudioContext();
    if (!context) {
      musicEnabled = false;
      syncMusicButton();
      setMessage('Background music is not supported by this browser. Sound effects may still work.');
      return;
    }

    musicEnabled = true;
    if (!musicGainNode) {
      musicGainNode = context.createGain();
      musicGainNode.gain.value = 0;
      musicGainNode.connect(context.destination);
    }
    musicGainNode.gain.cancelScheduledValues(context.currentTime);
    musicGainNode.gain.setTargetAtTime(0.62, context.currentTime, 0.08);
    if (musicInterval !== null) window.clearInterval(musicInterval);
    musicStep = 0;
    scheduleMusicStep();
    musicInterval = window.setInterval(scheduleMusicStep, 360);
    writeStorage('catTrapMusic', 'on');
    syncMusicButton();
  }

  function stopBackgroundMusic() {
    musicEnabled = false;
    if (musicInterval !== null) {
      window.clearInterval(musicInterval);
      musicInterval = null;
    }
    if (musicGainNode && audioContext) {
      musicGainNode.gain.cancelScheduledValues(audioContext.currentTime);
      musicGainNode.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.07);
    }
    writeStorage('catTrapMusic', 'off');
    syncMusicButton();
  }

  function playMoveSound() {
    playTone(470, 0.06, 'triangle', 0.025);
    window.setTimeout(() => playTone(350, 0.075, 'sine', 0.02), 45);
  }

  function setMessage(text, tone = 'normal') {
    const icon = tone === 'good' ? '✦' : tone === 'bad' ? '!' : '⌁';
    gameMessage.innerHTML = `<span class="message-icon" aria-hidden="true">${icon}</span><span>${text}</span>`;
    gameMessage.classList.toggle('message-good', tone === 'good');
    gameMessage.classList.toggle('message-bad', tone === 'bad');
  }

  function formatLevel(value) { return String(value).padStart(2, '0'); }

  function updateStats() {
    levelNumber.textContent = formatLevel(level);
    levelStat.textContent = formatLevel(level);
    movesStat.textContent = formatLevel(moves);
    bestStat.textContent = formatLevel(bestLevel);
    gridSize.textContent = `RADIUS ${String(radius).padStart(2, '0')}`;
    boardHint.textContent = finished ? 'MISSION COMPLETE' : 'BLOCK A TILE TO BEGIN';
  }

  function syncSoundButton() {
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundToggle.setAttribute('title', soundEnabled ? 'Turn sound off' : 'Turn sound on');
    soundIcon.textContent = soundEnabled ? '♫' : '♪̸';
    soundLabel.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
  }

  function isEdge(q, r) { return distanceFromCenter(q, r) === radius; }

  function buildCoordinates() {
    cells = new Map();
    for (let r = -radius; r <= radius; r += 1) {
      const qMin = Math.max(-radius, -r - radius);
      const qMax = Math.min(radius, -r + radius);
      for (let q = qMin; q <= qMax; q += 1) {
        const key = keyOf(q, r);
        cells.set(key, { q, r, blocked: false });
      }
    }
  }

  function addInitialBarriers() {
    const candidates = Array.from(cells.values()).filter(({ q, r }) => {
      return distanceFromCenter(q, r) > 1 && distanceFromCenter(q, r) < radius;
    });
    // Fisher–Yates shuffle so each new round has a slightly different puzzle.
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const barrierCount = Math.min(4 + Math.floor((level - 1) / 2), Math.max(0, candidates.length));
    for (const cell of candidates.slice(0, barrierCount)) cell.blocked = true;
  }

  function renderBoard() {
    board.replaceChildren();
    const boardWidth = board.clientWidth || 500;
    const boardHeight = board.clientHeight || (boardWidth / 1.1547);
    const tileSize = Math.max(19, Math.min(boardWidth / (radius * 2 + 1) * 0.91, boardHeight / (radius * 2 + 1) * 0.91));

    for (const cell of cells.values()) {
      const button = document.createElement('button');
      const { q, r } = cell;
      const isCat = keyOf(q, r) === catKey;
      const edge = isEdge(q, r);
      button.type = 'button';
      button.className = 'cell';
      if (edge) button.classList.add('edge');
      if (cell.blocked) button.classList.add('blocked');
      if (isCat) button.classList.add('cat');
      button.style.left = `${(0.5 + ((q + r / 2) / (2 * radius)) * 0.9) * 100}%`;
      button.style.top = `${(0.5 + (r / (2 * radius)) * 0.9) * 100}%`;
      button.style.width = `${tileSize}px`;
      button.style.height = `${tileSize}px`;
      button.dataset.key = keyOf(q, r);
      if (isCat) {
        button.innerHTML = '<span class="cat-glyph" aria-hidden="true">🐈‍⬛</span>';
        button.setAttribute('aria-label', 'Cat position');
        button.setAttribute('aria-disabled', 'true');
      } else if (cell.blocked) {
        button.innerHTML = '<span aria-hidden="true">×</span>';
        button.setAttribute('aria-label', `Barrier at row ${r}, column ${q}`);
        button.disabled = true;
      } else {
        button.setAttribute('aria-label', `Place barrier at row ${r}, column ${q}${edge ? ', outer ring' : ''}`);
        button.addEventListener('click', () => handleTileClick(keyOf(q, r)));
      }
      board.appendChild(button);
    }
  }

  // Breadth-first search returns the shortest route from the cat to any open outer tile.
  function findRouteToEdge(startKey) {
    const queue = [startKey];
    const previous = new Map([[startKey, null]]);
    let goalKey = null;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const currentKey = queue[cursor];
      const current = cells.get(currentKey);
      if (!current) continue;
      if (isEdge(current.q, current.r)) { goalKey = currentKey; break; }

      for (const [dq, dr] of DIRECTIONS) {
        const nextKey = keyOf(current.q + dq, current.r + dr);
        const next = cells.get(nextKey);
        if (!next || next.blocked || previous.has(nextKey)) continue;
        previous.set(nextKey, currentKey);
        queue.push(nextKey);
      }
    }

    if (goalKey === null) return null;
    const path = [];
    let cursor = goalKey;
    while (cursor !== null) {
      path.push(cursor);
      cursor = previous.get(cursor);
    }
    return path.reverse();
  }

  function finishGame(won) {
    finished = true;
    boardHint.textContent = won ? 'CAT CONTAINED' : 'CAT ESCAPED';
    updateStats();
    if (won) {
      bestLevel = Math.max(bestLevel, level + 1);
      writeStorage('catTrapBestLevel', bestLevel);
      bestStat.textContent = formatLevel(bestLevel);
      resultSymbol.textContent = '✦';
      resultSymbol.style.color = 'var(--cyan)';
      resultSymbol.style.borderColor = 'rgba(104,242,255,.3)';
      resultEyebrow.textContent = 'MISSION COMPLETE';
      resultTitle.textContent = 'CAT CONTAINED';
      resultDescription.textContent = `Exit routes blocked in ${moves} ${moves === 1 ? 'move' : 'moves'}. Nice strategy. Ready for the next grid?`;
      resultMainButton.innerHTML = 'NEXT LEVEL <span aria-hidden="true">→</span>';
      resultMainButton.dataset.action = 'next';
      setMessage('All paths to the outer ring are blocked. You caught it!', 'good');
      playTone(660, 0.14, 'triangle', 0.04);
      window.setTimeout(() => playTone(880, 0.18, 'triangle', 0.035), 120);
    } else {
      resultSymbol.textContent = '↗';
      resultSymbol.style.color = 'var(--pink)';
      resultSymbol.style.borderColor = 'rgba(255,115,198,.35)';
      resultEyebrow.textContent = 'ESCAPE DETECTED';
      resultTitle.textContent = 'CAT GOT OUT';
      resultDescription.textContent = 'It found a path to the outer ring. Reset and try closing the lanes earlier.';
      resultMainButton.innerHTML = 'TRY AGAIN <span aria-hidden="true">↻</span>';
      resultMainButton.dataset.action = 'retry';
      setMessage('The cat reached the outer ring. Try a new strategy.', 'bad');
      playTone(190, 0.24, 'sawtooth', 0.025);
    }
    resultLevel.textContent = formatLevel(level);
    resultMoves.textContent = formatLevel(moves);
    resultModal.hidden = false;
    resultMainButton.focus();
  }

  function handleTileClick(key) {
    if (finished) return;
    const cell = cells.get(key);
    if (!cell || cell.blocked || key === catKey) return;

    cell.blocked = true;
    moves += 1;
    playTone(520, 0.055, 'sine', 0.025);
    const route = findRouteToEdge(catKey);

    if (!route) {
      renderBoard();
      updateStats();
      finishGame(true);
      return;
    }

    if (route.length > 1) catKey = route[1];
    renderBoard();
    updateStats();
    playMoveSound();

    const cat = cells.get(catKey);
    if (cat && isEdge(cat.q, cat.r)) {
      finishGame(false);
      return;
    }

    setMessage(`Barrier placed. The cat moved to (${cat.q}, ${cat.r}). Think one move ahead.`);
  }

  function startLevel(newLevel) {
    level = Math.max(1, newLevel);
    radius = Math.min(6, 4 + Math.floor((level - 1) / 3));
    moves = 0;
    catKey = keyOf(0, 0);
    finished = false;
    resultModal.hidden = true;
    buildCoordinates();
    addInitialBarriers();
    renderBoard();
    updateStats();
    setMessage('Tap a tile to place a barrier. The cat moves after every turn.');
    document.getElementById('mission-title').firstChild.textContent = level < 4 ? 'Containment drill ' : level < 7 ? 'Advanced containment ' : 'Maximum containment ';
  }

  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    writeStorage('catTrapSound', soundEnabled ? 'on' : 'off');
    syncSoundButton();
    if (soundEnabled) playTone(600, 0.08, 'triangle', 0.03);
  });

  musicToggle.addEventListener('click', () => {
    if (musicEnabled) stopBackgroundMusic();
    else startBackgroundMusic();
  });

  restartButton.addEventListener('click', () => {
    playTone(380, 0.07, 'sine', 0.02);
    startLevel(level);
  });

  resultMainButton.addEventListener('click', () => {
    const action = resultMainButton.dataset.action;
    if (action === 'next') startLevel(level + 1);
    else startLevel(level);
  });

  resultRetryButton.addEventListener('click', () => startLevel(level));
  window.addEventListener('resize', () => renderBoard());
  window.addEventListener('pagehide', () => {
    if (musicInterval !== null) window.clearInterval(musicInterval);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !resultModal.hidden) {
      resultModal.hidden = true;
      restartButton.focus();
    }
  });

  syncSoundButton();
  syncMusicButton();
  startLevel(1);
})();
