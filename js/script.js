const audio = document.getElementById("audio");
const fileInput = document.getElementById("audioFile");
const playBtn = document.getElementById("playBtn");
const progressBar = document.querySelector(".progress-bar");
const progress = document.querySelector(".progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const playlistEl = document.querySelector(".playlist");

let audioContext;
let source, panner, bassFilter, trebleFilter, presence;
let panInterval;

let tracks = [];
let currentIndex = -1;

/* Audio Context */
function initAudioContext() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  source = audioContext.createMediaElementSource(audio);

  /* === Spatial Panner === */
  panner = audioContext.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 1;
  panner.maxDistance = 1000;
  panner.rolloffFactor = 1.5;

  /* === EQ for clarity === */

  // Low cut (remove rumble)
  const lowCut = audioContext.createBiquadFilter();
  lowCut.type = "highpass";
  lowCut.frequency.value = 60;

  // Bass control (tight, not muddy)
  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 120;
  bassFilter.gain.value = -2;

  // Presence boost (vocals / detail)
  presence = audioContext.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2500;
  presence.Q.value = 1.2;
  presence.gain.value = 3;

  // Treble air (clarity)
  trebleFilter = audioContext.createBiquadFilter();
  trebleFilter.type = "highshelf";
  trebleFilter.frequency.value = 6000;
  trebleFilter.gain.value = 2;

  /* === Compressor (clarity + loudness control) === */
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 24;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;

  /* === Output gain (safe level) === */
  const outputGain = audioContext.createGain();
  outputGain.gain.value = 0.95;

  /* === Connect chain === */
  source
    .connect(lowCut)
    .connect(bassFilter)
    .connect(presence)
    .connect(trebleFilter)
    .connect(compressor)
    .connect(panner)
    .connect(outputGain)
    .connect(audioContext.destination);
}

/* Upload */
fileInput.addEventListener("change", () => {
  [...fileInput.files].forEach(file => {
    if (!tracks.some(t => t.name === file.name)) {
      tracks.push({
        name: file.name,
        url: URL.createObjectURL(file)
      });
    }
  });
  renderPlaylist();
  if (currentIndex === -1 && tracks.length) playTrack(0);
});

/* Playlist */
function renderPlaylist() {
  playlistEl.innerHTML = "";
  tracks.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "track" + (i === currentIndex ? " playing" : "");
    div.textContent = t.name;
    div.onclick = () => playTrack(i);
    playlistEl.appendChild(div);
  });
}

/* Play Track */

async function playTrack(index) {
  initAudioContext();
  applyPreset("balanced");
  await audioContext.resume();

  currentIndex = index;
  audio.pause();
  audio.src = tracks[index].url;
  audio.load();
  audio.currentTime = 0;

  await new Promise(requestAnimationFrame);
  await audio.play();

  playBtn.textContent = "❚❚";
  renderPlaylist();
  startOrbit();
}

/* Play / Pause */
playBtn.onclick = async () => {
  initAudioContext();
  await audioContext.resume();

  if (audio.paused) {
    await audio.play();
    playBtn.textContent = "❚❚";
    startOrbit();
  } else {
    audio.pause();
    playBtn.textContent = "▶";
    stopOrbit();
  }
};

/* Progress */
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progress.style.width = audio.currentTime / audio.duration * 100 + "%";
  currentTimeEl.textContent = format(audio.currentTime);
});
audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = format(audio.duration);
});
progressBar.onclick = e => {
  const r = progressBar.getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
};

/* Auto Next */
audio.addEventListener("ended", () => {
  stopOrbit();
  if (currentIndex + 1 < tracks.length) playTrack(currentIndex + 1);
  else playBtn.textContent = "▶";
});

/* 8D Orbit */
function startOrbit() {
  stopOrbit();
  const start = audioContext.currentTime;
  panInterval = setInterval(() => {
    const t = audioContext.currentTime - start;
    panner.setPosition(
      Math.cos(t)*1.4,
      0,
      Math.sin(t)*0.6
      );
  }, 30);
}
function stopOrbit() {
  clearInterval(panInterval);
}

/* Utils */
function format(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/* Service Worker */

/* ================================
   PWA: Service Worker
================================ */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")   // ✅ ROOT PATH (IMPORTANT)
      .then(() => console.log("Service Worker registered"))
      .catch(err => console.error("SW failed:", err));
  });
}

/* ===============================
   PWA SETUP (FINAL, FIXED)
================================ */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js") // ROOT path
      .then(() => console.log("SW registered"))
      .catch(err => console.error("SW error!", err));
  });
}

const installBtn = document.getElementById("installBtn");
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  console.log("✅ Install prompt ready");
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("Install not ready yet. Reload once.");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });
}


/* preset buttons */
function applyPreset(type) {
  if (!audioContext) return;

  switch (type) {
    case "balanced":
      bassFilter.gain.value = -2;
      presence.gain.value = 3;
      trebleFilter.gain.value = 2;
      break;

    case "vocal":
      bassFilter.gain.value = -4;
      presence.gain.value = 4;
      trebleFilter.gain.value = 3;
      break;

    case "bass":
      bassFilter.gain.value = 3;
      presence.gain.value = 1.5;
      trebleFilter.gain.value = 1;
      break;
  }

  document.querySelectorAll(".presets button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.preset === type);
  });
}

document.querySelectorAll(".presets button").forEach(btn => {
  btn.addEventListener("click", async () => {
    initAudioContext();
    await audioContext.resume();
    applyPreset(btn.dataset.preset);
  });
});
