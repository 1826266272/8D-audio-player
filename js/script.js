const audio = document.getElementById("audio");
const fileInput = document.getElementById("audioFile");
const playBtn = document.getElementById("playBtn");
const progressBar = document.querySelector(".progress-bar");
const progress = document.querySelector(".progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const playlistEl = document.querySelector(".playlist");

let audioContext;
let source, panner, bassFilter, trebleFilter;
let panInterval;

let tracks = [];
let currentIndex = -1;

/* Audio Context */
function initAudioContext() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  source = audioContext.createMediaElementSource(audio);

  panner = audioContext.createPanner();
  panner.panningModel = "HRTF";

  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = "lowshelf";
  bassFilter.frequency.value = 150;
  bassFilter.gain.value = -5;

  trebleFilter = audioContext.createBiquadFilter();
  trebleFilter.type = "highshelf";
  trebleFilter.frequency.value = 4000;
  trebleFilter.gain.value = 3;

  source.connect(bassFilter)
    .connect(trebleFilter)
    .connect(panner)
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
    panner.setPosition(Math.cos(t), 0, Math.sin(t));
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


// YouTube Thumbnail - PosterFeature
/* ---------------- YOUTUBE THUMBNAIL ---------------- */

const ytAPIKey = "AIzaSyAhDQwqhvPMIwDISYnEdVsH9E_H5X5eUTs"; 
const ytThumbnail = document.getElementById("ytThumbnail");
const ytTitle = document.getElementById("ytTitle"); 
const ytStats = document.getElementById("ytStats");

async function fetchYouTubeInfo(songName) {
  const ytThumbnail = document.getElementById("ytThumbnail");
  const ytTitle = document.getElementById("ytTitle");
  
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(songName)}&type=video&maxResults=1&key=${ytAPIKey}`
    );
    const searchData = await searchRes.json();
    if (!searchData.items || searchData.items.length === 0) {
      ytThumbnail.src = "";
      ytTitle.textContent = "No video found";
      return;
    }

    const video = searchData.items[0];
    const snippet = video.snippet;

    ytThumbnail.src = snippet.thumbnails.medium.url;
    ytTitle.textContent = snippet.title;

  } catch (err) {
    console.error("YouTube API error:", err);
    ytThumbnail.src = "";
    ytTitle.textContent = "Error fetching video";
  }
}
async function playTrack(index) {
  initAudioContext();
  await audioContext.resume();

  currentIndex = index;
  audio.pause();
  audio.src = tracks[index].url;
  audio.currentTime = 0;

  await audio.play();

  playBtn.textContent = "❚❚";
  renderPlaylist();
  startOrbit();

  // fetch YouTube thumbnail but don't await it
  fetchYouTubeInfo(cleanSongName(tracks[index].name));
}

function cleanSongName(fileName) {
  // removes stuff like [nZiJTYiujUs] from file name
  return fileName.replace(/\[.*?\]/g, "").replace(/\..+$/, "").trim();
}
