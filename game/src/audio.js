// Sound, all synthesized with WebAudio: engine hum, siren, gunshots, UI blips and a
// low ambient bass line. No audio files anywhere. The context starts on the first user
// gesture (a browser rule); in screenshot mode there is no gesture and it stays silent.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  /** Call on the first gesture (click/keypress): starts the context and the loops. */
  function start() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    if (!sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      // Two-tone wail: alternate 700/950 Hz every 0.4 s.
      let high = false;
      setInterval(() => {
        if (!sirenOsc || muted) return;
        high = !high;
        sirenOsc.frequency.value = high ? 950 : 700;
      }, 400);
    }
    if (!musicTimer) {
      // A slow bass line: one note a bar, root notes of a minor walk.
      const notes = [55, 55, 65.4, 49];
      let bar = 0;
      musicTimer = setInterval(() => {
        if (!ctx || muted) return;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = notes[bar % notes.length];
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc.connect(g);
        g.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 1.9);
        bar += 1;
      }, 1900);
    }
  }

  function noiseBurst(duration, volume, filterFreq) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  function blip(freq, duration, volume) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    start,
    /** Engine hum follows the player's speed (0 on foot, up with the car). */
    engine(speed, inCar) {
      if (!engineOsc || muted) return;
      engineGain.gain.value = inCar ? 0.03 + Math.min(0.06, speed * 0.002) : 0;
      engineOsc.frequency.value = 50 + speed * 3;
    },
    /** Siren on while the wanted level is up. */
    siren(on) {
      if (!sirenGain) return;
      sirenGain.gain.value = on && !muted ? 0.05 : 0;
    },
    shot() {
      noiseBurst(0.12, 0.5, 3000);
    },
    pickup() {
      blip(880, 0.15, 0.3);
      setTimeout(() => blip(1320, 0.2, 0.3), 90);
    },
    mission() {
      blip(523, 0.15, 0.3);
      setTimeout(() => blip(659, 0.15, 0.3), 120);
      setTimeout(() => blip(784, 0.3, 0.3), 240);
    },
    busted() {
      blip(220, 0.4, 0.4);
      setTimeout(() => blip(165, 0.6, 0.4), 200);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
