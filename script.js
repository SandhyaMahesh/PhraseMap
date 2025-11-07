/* =====================================================
   PhraseMap Hi-Fi Prototype — Interactive Behaviors
   ===================================================== */

/* -------------- Page Fade-in Animation -------------- */
document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("fade-in");
  });
  
  /* -------------- Smooth Page Navigation -------------- */
  const buttons = document.querySelectorAll("button, .session-card, .end");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Skip fade transition for immediate navigation buttons
      if (btn.dataset.skipfade === "true") return;
  
      const href = btn.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
      if (href) {
        e.preventDefault();
        document.body.classList.remove("fade-in");
        document.body.classList.add("fade-out");
        setTimeout(() => (window.location.href = href), 250);
      }
    });
  });
  
  /* -------------- Mark Phase Live Waveform -------------- */
  const wave = document.getElementById("livePath");
  if (wave) {
    let t = 0;
    function animateWave() {
      // Simulated real-time pitch movement
      const newPath = `
        M0,150 
        Q50,${130 + 20 * Math.sin(t / 10)} 
        100,${150 - 10 * Math.cos(t / 15)} 
        T200,${140 + 15 * Math.sin(t / 18)} 
        T300,${170 - 10 * Math.cos(t / 12)} 
        T400,${130 + 20 * Math.sin(t / 14)} 
        T500,${160 - 15 * Math.sin(t / 20)} 
        T600,150
      `;
      wave.setAttribute("d", newPath);
      t++;
      requestAnimationFrame(animateWave);
    }
    animateWave();
  }
  
  /* -------------- Saved Sessions Dynamic Loading -------------- */
  const historyContainer = document.querySelector(".history-list");
  if (historyContainer) {
    const savedSessions = [
      { title: "Etude in G Major", instrument: "Flute", date: "Oct 18, 2025", stat: "Stability 82%", color: "green" },
      { title: "Bach Sonata No. 2", instrument: "Violin", date: "Oct 14, 2025", stat: "Expression 88%", color: "amber" },
      { title: "Vocal Warmup C", instrument: "Voice", date: "Oct 11, 2025", stat: "Tone 79%", color: "coral" },
      { title: "Piano Prelude Op. 28", instrument: "Piano", date: "Oct 9, 2025", stat: "Dynamics 85%", color: "amber" },
      { title: "Clarinet Solo Study", instrument: "Clarinet", date: "Oct 6, 2025", stat: "Tone 81%", color: "green" }
    ];
  
    savedSessions.forEach((s) => {
      const card = document.createElement("div");
      card.classList.add("history-card");
      card.innerHTML = `
        <h3>${s.title}</h3>
        <p class="history-details">${s.instrument} • ${s.date}</p>
        <div class="stats-bar ${s.color}"><span></span></div>
        <p>${s.stat}</p>
      `;
      historyContainer.appendChild(card);
    });
  }
  
  /* -------------- Microinteractions: Button Feedback -------------- */
  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("mousedown", () => button.classList.add("pressed"));
    button.addEventListener("mouseup", () => button.classList.remove("pressed"));
  });
  
  /* -------------- Background Hue Animation -------------- */
  let hue = 220;
  function animateBackground() {
    document.body.style.background = `linear-gradient(160deg, hsl(${hue}, 50%, 30%) 0%, #4A69BB 40%, #FFF9F2 100%)`;
    hue = (hue + 0.15) % 360;
    requestAnimationFrame(animateBackground);
  }
  animateBackground();
  
  /* -------------- Fade Animations (CSS trigger) -------------- */
  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>
      body.fade-in { opacity: 0; animation: fadeIn 0.6s forwards ease-in; }
      body.fade-out { animation: fadeOut 0.3s forwards ease-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
  
      button.pressed {
        transform: scale(0.96);
        opacity: 0.9;
        box-shadow: none !important;
      }
    </style>`
  );
  