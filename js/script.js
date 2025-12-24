const fileInput = document.getElementById("audioFile");
const playBtn = document.getElementById("playBtn");
const progressBar = document.querySelector(".progress-bar");
const progress = document.querySelector(".progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

let audioContext;
let audio;
let source;
let panner;
let bassFilter;
let trebleFilter;
let panInterval;

// --------------------
// Upload & Load Audio
// --------------------
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Stop previous audio if exists
  if (audio) {
    audio.pause();
    stopOrbit();
  }

  // Reset controls
  playBtn.textContent = "▶";
  progress.style.width = "0%";
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";

  // Create new audio element
  audio = new Audio(URL.createObjectURL(file));
  audio.preload = "auto";

  // Initialize AudioContext if first time
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    panner = audioContext.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;

    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 150;
    bassFilter.gain.value = -5;

    trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 4000;
    trebleFilter.gain.value = 3;
  }

  // Disconnect old source if exists
  if (source) source.disconnect();

  // Connect new source
  source = audioContext.createMediaElementSource(audio);
  source.connect(bassFilter);
  bassFilter.connect(trebleFilter);
  trebleFilter.connect(panner);
  panner.connect(audioContext.destination);

  // Update metadata when loaded
  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  // Update progress
  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      const percent = (audio.currentTime / audio.duration) * 100;
      progress.style.width = percent + "%";
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }
  });

  // When audio ends
  audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
    progress.style.width = "0%";
    stopOrbit();
  });
});

// --------------------
// Play / Pause
// --------------------
playBtn.addEventListener("click", async () => {
  if (!audio) return;

  await audioContext.resume();

  if (audio.paused) {
    audio.play();
    playBtn.textContent = "❚❚";
    startOrbit();
  } else {
    audio.pause();
    playBtn.textContent = "▶";
    stopOrbit();
  }
});

// --------------------
// Seek / Progress Bar
// --------------------
progressBar.addEventListener("click", (e) => {
  if (!audio || !audio.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

// --------------------
// 3D Panner Orbit
// --------------------
function startOrbit() {
  stopOrbit();
  const radius = 1.2;
  const speed = 1.2;
  const startTime = audioContext.currentTime;

  panInterval = setInterval(() => {
    const t = audioContext.currentTime - startTime;
    const x = radius * Math.cos(speed * t);
    const z = radius * Math.sin(speed * t);
    panner.setPosition(x, 0, z);
  }, 30);
}

function stopOrbit() {
  if (panInterval) {
    clearInterval(panInterval);
    panInterval = null;
  }
}

// --------------------
// Format Time
// --------------------
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
