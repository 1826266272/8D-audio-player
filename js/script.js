const audio = document.getElementById("audio");
const fileInput = document.getElementById("audioFile");

//control panel elements
const playBtn = document.getElementById("playBtn");
const progressBar = document.querySelector(".progress-bar");
const progress = document.querySelector(".progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

let audioContext;
let source;
let panner;
let bassFilter;
let trebleFilter;
let panInterval;

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  audio.src = URL.createObjectURL(file);
  audio.load();

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Source node
    source = audioContext.createMediaElementSource(audio);

    // HRTF 3D panner
    panner = audioContext.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;

    // Bass and Treble filters
    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 150;
    bassFilter.gain.value = -5;

    trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 4000;
    trebleFilter.gain.value = 3;

    // Connect nodes: Source → Bass → Treble → Panner → Destination
    source.connect(bassFilter);
    bassFilter.connect(trebleFilter);
    trebleFilter.connect(panner);
    panner.connect(audioContext.destination);
  }
});

audio.addEventListener("play", () => {
  audioContext.resume();
  startOrbit();
});

audio.addEventListener("pause", stopOrbit);
audio.addEventListener("ended", stopOrbit);

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


//control panel code

playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "❚❚";
  } else {
    audio.pause();
    playBtn.textContent = "▶";
  }
});

audio.addEventListener("timeupdate", () => {
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.style.width = percent + "%";

  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

progressBar.addEventListener("click", (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
