(function(){
  "use strict";

  const VIDEO_STYLES = `
    .vp-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 16px;
      overflow: hidden;
      background: #000;
      border: 1px solid rgba(90, 140, 230, 0.25);
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }

    .vp-wrap::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.5);
    }

    .vp-wrap iframe,
    .vp-wrap video {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      object-fit: contain;
      background: #000;
    }

    .vp-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 80px;
      z-index: 10;
      background: transparent;
      cursor: default;
    }

    .vp-watermark {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 15;
      font-family: 'Tajawal', 'Cairo', sans-serif;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 20px;
      color: #ff2d2d;
      background: transparent;
      text-shadow:
        0 0 8px rgba(255, 45, 45, 0.9),
        0 0 16px rgba(255, 45, 45, 0.6),
        1px 1px 2px rgba(0, 0, 0, 0.8);
      pointer-events: none;
      user-select: none;
      animation: vp-watermark-pulse 3s ease-in-out infinite;
    }

    @keyframes vp-watermark-pulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 1; }
    }

    .vp-badge {
      position: absolute;
      bottom: 14px;
      left: 14px;
      z-index: 15;
      font-family: 'Tajawal', 'Cairo', sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      padding: 5px 12px;
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.85);
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      pointer-events: none;
      user-select: none;
    }

    .vp-progress-badge {
      position: absolute;
      bottom: 14px;
      right: 14px;
      z-index: 15;
      font-family: 'Tajawal', 'Cairo', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      padding: 5px 12px;
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.9);
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      pointer-events: none;
      user-select: none;
    }

    .vp-cover {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(4, 6, 14, 0.85), rgba(11, 18, 38, 0.9));
      cursor: pointer;
      transition: opacity 0.4s ease, visibility 0.4s ease;
    }

    .vp-cover.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .vp-play-btn {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(140deg, #2f7dff, #8b5cf6);
      color: #fff;
      box-shadow: 0 16px 50px rgba(47, 125, 255, 0.7);
      padding-right: 6px;
      transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1);
      animation: vp-pulse 2.5s ease-in-out infinite;
    }

    .vp-cover:hover .vp-play-btn {
      transform: scale(1.1);
    }

    @keyframes vp-pulse {
      0%, 100% { box-shadow: 0 16px 50px rgba(47, 125, 255, 0.7), 0 0 0 0 rgba(47, 125, 255, 0.6); }
      50% { box-shadow: 0 16px 50px rgba(47, 125, 255, 0.7), 0 0 0 20px rgba(47, 125, 255, 0); }
    }

    .vp-cover-title {
      position: absolute;
      top: 24px;
      left: 24px;
      right: 24px;
      color: #e8eefc;
      font-family: 'Tajawal', 'Cairo', sans-serif;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
      pointer-events: none;
    }

    .vp-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #7f93b8;
      font-family: 'Tajawal', 'Cairo', sans-serif;
      text-align: center;
      padding: 20px;
    }

    .vp-error-icon {
      font-size: 48px;
      opacity: 0.35;
      margin-bottom: 12px;
    }

    @media (max-width: 640px) {
      .vp-watermark {
        font-size: 11px;
        padding: 3px 8px;
        top: 10px;
        right: 10px;
      }
      .vp-play-btn {
        width: 70px;
        height: 70px;
      }
      .vp-badge, .vp-progress-badge {
        font-size: 10px;
        padding: 4px 10px;
        bottom: 10px;
      }
    }
  `;

  function injectStyles() {
    if (document.getElementById("vp-styles")) return;
    const style = document.createElement("style");
    style.id = "vp-styles";
    style.textContent = VIDEO_STYLES;
    document.head.appendChild(style);
  }

  function getYouTubeId(url) {
    if (!url) return "";
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return m ? m[1] : "";
  }

  function getVimeoId(url) {
    if (!url) return "";
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : "";
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (s) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[s]);
  }

  class SecureVideoPlayer {
    constructor(options) {
      this.container = options.container;
      this.video = options.video || {};
      this.lessonTitle = options.lessonTitle || "";
      this.watermark = options.watermark || "user";
      this.onPlay = options.onPlay || function(){};
      this.onTimeUpdate = options.onTimeUpdate || function(){};
      this.onComplete = options.onComplete || function(){};
      this.milestones = { p25: false, p50: false, p75: false, p90: false };
      this.wrapEl = null;
      this.videoEl = null;
      this.coverEl = null;
      this.progressEl = null;
      this._init();
    }

    _init() {
      injectStyles();
      if (!this.container) return;

      const wrap = document.createElement("div");
      wrap.className = "vp-wrap";

      const cover = document.createElement("div");
      cover.className = "vp-cover";
      cover.innerHTML = `
        <div class="vp-cover-title">${escapeHtml(this.lessonTitle)}</div>
        <div class="vp-play-btn">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      `;

      const overlay = document.createElement("div");
      overlay.className = "vp-overlay";

      const watermark = document.createElement("div");
      watermark.className = "vp-watermark";
      watermark.textContent = this.watermark;

      const badge = document.createElement("div");
      badge.className = "vp-badge";
      badge.textContent = "🛡 مشاهدة محمية";

      const progressBadge = document.createElement("div");
      progressBadge.className = "vp-progress-badge";
      progressBadge.textContent = "0%";

      this.wrapEl = wrap;
      this.coverEl = cover;
      this.progressEl = progressBadge;

      this._renderMedia(wrap, cover, overlay, watermark, badge, progressBadge);

      this.container.innerHTML = "";
      this.container.appendChild(wrap);

      this._attachProtection();
    }

    _renderMedia(wrap, cover, overlay, watermark, badge, progressBadge) {
      const v = this.video;

      if (!v || !v.url) {
        wrap.innerHTML = `
          <div class="vp-error">
            <div class="vp-error-icon">🎬</div>
            <div>لا يوجد فيديو لهذا الدرس</div>
          </div>
        `;
        return;
      }

      if (v.type === "youtube") {
        const id = getYouTubeId(v.url);
        if (!id) {
          wrap.innerHTML = `<div class="vp-error"><div class="vp-error-icon">⚠️</div><div>رابط YouTube غير صالح</div></div>`;
          return;
        }
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&fs=1`;
        iframe.title = this.lessonTitle;
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
        iframe.setAttribute("allowfullscreen", "true");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        wrap.appendChild(iframe);
        wrap.appendChild(overlay);
        wrap.appendChild(watermark);
        wrap.appendChild(badge);
        cover.addEventListener("click", () => {
          cover.classList.add("hidden");
          this.onPlay();
        });
        wrap.appendChild(cover);
        return;
      }

      if (v.type === "vimeo") {
        const id = getVimeoId(v.url);
        if (!id) {
          wrap.innerHTML = `<div class="vp-error"><div class="vp-error-icon">⚠️</div><div>رابط Vimeo غير صالح</div></div>`;
          return;
        }
        const iframe = document.createElement("iframe");
        iframe.src = `https://player.vimeo.com/video/${id}?byline=0&portrait=0&title=0&dnt=1`;
        iframe.title = this.lessonTitle;
        iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
        iframe.setAttribute("allowfullscreen", "true");
        wrap.appendChild(iframe);
        wrap.appendChild(overlay);
        wrap.appendChild(watermark);
        wrap.appendChild(badge);
        cover.addEventListener("click", () => {
          cover.classList.add("hidden");
          this.onPlay();
        });
        wrap.appendChild(cover);
        return;
      }

      if (v.type === "mp4") {
        const videoEl = document.createElement("video");
        videoEl.controls = true;
        videoEl.controlsList = "nodownload noremoteplayback noplaybackrate";
        videoEl.disablePictureInPicture = true;
        videoEl.playsInline = true;
        videoEl.preload = "metadata";
        if (v.poster) videoEl.poster = v.poster;

        const source = document.createElement("source");
        source.src = v.url;
        source.type = "video/mp4";
        videoEl.appendChild(source);

        videoEl.addEventListener("play", () => {
          cover.classList.add("hidden");
          this.onPlay();
        });

        videoEl.addEventListener("timeupdate", () => {
          if (!videoEl.duration) return;
          const p = (videoEl.currentTime / videoEl.duration) * 100;
          if (this.progressEl) this.progressEl.textContent = Math.round(p) + "%";
          this.onTimeUpdate(p, videoEl.currentTime, videoEl.duration);

          if (p >= 25 && !this.milestones.p25) { this.milestones.p25 = true; this.onTimeUpdate(25, videoEl.currentTime, videoEl.duration, "p25"); }
          if (p >= 50 && !this.milestones.p50) { this.milestones.p50 = true; this.onTimeUpdate(50, videoEl.currentTime, videoEl.duration, "p50"); }
          if (p >= 75 && !this.milestones.p75) { this.milestones.p75 = true; this.onTimeUpdate(75, videoEl.currentTime, videoEl.duration, "p75"); }
          if (p >= 90 && !this.milestones.p90) { this.milestones.p90 = true; this.onComplete(); }
        });

        videoEl.addEventListener("contextmenu", (e) => e.preventDefault());

        wrap.appendChild(videoEl);
        wrap.appendChild(overlay);
        wrap.appendChild(watermark);
        wrap.appendChild(badge);
        wrap.appendChild(progressBadge);

        cover.addEventListener("click", () => {
          cover.classList.add("hidden");
          videoEl.play().catch(() => {});
        });

        wrap.appendChild(cover);
        this.videoEl = videoEl;
        return;
      }

      if (v.type === "external") {
        const iframe = document.createElement("iframe");
        iframe.src = v.url;
        iframe.title = this.lessonTitle;
        iframe.setAttribute("allowfullscreen", "true");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups allow-forms");
        wrap.appendChild(iframe);
        wrap.appendChild(overlay);
        wrap.appendChild(watermark);
        wrap.appendChild(badge);
        wrap.appendChild(cover);
        return;
      }

      wrap.innerHTML = `<div class="vp-error"><div class="vp-error-icon">⚠️</div><div>نوع الفيديو غير مدعوم</div></div>`;
    }

    _attachProtection() {
      const wrap = this.wrapEl;
      if (!wrap) return;

      wrap.addEventListener("contextmenu", (e) => e.preventDefault());
      wrap.addEventListener("dragstart", (e) => e.preventDefault());

      const keyBlocker = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          return false;
        }
      };
      document.addEventListener("keydown", keyBlocker, true);
      this._keyBlocker = keyBlocker;

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.type === "attributes" && m.attributeName === "style") {
            const el = m.target;
            if (el === wrap) {
              const style = el.getAttribute("style") || "";
              if (style.includes("display: none")) {
                el.setAttribute("style", style.replace(/display:\s*none;?/g, ""));
              }
            }
          }
        });
      });
      observer.observe(wrap, { attributes: true });
      this._observer = observer;
    }

    destroy() {
      if (this._keyBlocker) {
        document.removeEventListener("keydown", this._keyBlocker, true);
      }
      if (this._observer) {
        this._observer.disconnect();
      }
      if (this.container) {
        this.container.innerHTML = "";
      }
    }
  }

  window.SecureVideoPlayer = SecureVideoPlayer;

})();