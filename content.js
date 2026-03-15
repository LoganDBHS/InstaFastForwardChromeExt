(function () {
  "use strict";

  const FF_RATE = 2;
  const NORMAL_RATE = 1;

  let isFastForwarding = false;
  let activeVideo = null;

  // --- Video detection ---

  function getVisibleVideo() {
    const videos = document.querySelectorAll("video");
    let best = null;
    let bestArea = 0;

    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, window.innerHeight);
      const visibleLeft = Math.max(rect.left, 0);
      const visibleRight = Math.min(rect.right, window.innerWidth);

      if (visibleBottom > visibleTop && visibleRight > visibleLeft) {
        const area = (visibleBottom - visibleTop) * (visibleRight - visibleLeft);
        if (area > bestArea) {
          bestArea = area;
          best = video;
        }
      }
    }
    return best;
  }

  // --- Fast forward logic ---

  function startFastForward() {
    if (isFastForwarding) return;

    const video = getVisibleVideo();
    if (!video) return;

    if (video.paused) return;

    isFastForwarding = true;
    activeVideo = video;
    activeVideo.playbackRate = FF_RATE;
  }

  function stopFastForward() {
    if (!isFastForwarding) return;

    if (activeVideo) {
      activeVideo.playbackRate = NORMAL_RATE;
    }
    isFastForwarding = false;
    activeVideo = null;
  }

  // --- Keyboard handling ---

  function isTyping(e) {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    if (e.target.isContentEditable) return true;
    if (e.target.getAttribute("role") === "textbox") return true;
    return false;
  }

  function shouldIgnore(e) {
    return e.code !== "Space" || isTyping(e) || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey;
  }

  function suppress(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // Use window-level capture for everything so we're the first to handle it
  window.addEventListener("keydown", function (e) {
    if (shouldIgnore(e)) return;
    if (e.repeat) {
      suppress(e);
      return;
    }
    suppress(e);
    startFastForward();
  }, true);

  window.addEventListener("keyup", function (e) {
    if (e.code !== "Space" || isTyping(e)) return;
    suppress(e);
    stopFastForward();
  }, true);

  window.addEventListener("keypress", function (e) {
    if (shouldIgnore(e)) return;
    suppress(e);
  }, true);

  // Safety: stop fast forward if window loses focus
  window.addEventListener("blur", stopFastForward);

  // Handle SPA navigation — if the video element gets removed, clean up
  const observer = new MutationObserver(function () {
    if (isFastForwarding && activeVideo && !document.contains(activeVideo)) {
      stopFastForward();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
