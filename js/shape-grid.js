window.ShapeGridApp = (() => {
  let raf = 0;
  let frozen = false;

  function init(container, opts = {}) {
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const config = {
      squareSize: opts.squareSize || 40,
      speed: opts.speed ?? 0.12,
      borderColor: opts.borderColor || '#262335',
      hoverFillColor: opts.hoverFillColor || 'rgba(255,77,109,0.2)',
      hoverTrailAmount: opts.hoverTrailAmount ?? 3,
      vignetteEdge: opts.vignetteEdge || 'rgba(5, 3, 14, 0.44)',
      backgroundColor: opts.backgroundColor || '#121019',
    };

    let w = 0;
    let h = 0;
    let offset = 0;
    const trail = [];
    let mouse = { x: -999, y: -999 };

    function resize() {
      w = container.clientWidth;
      h = container.clientHeight;
      canvas.width = w;
      canvas.height = h;
    }

    function draw() {
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      const size = config.squareSize;
      const cols = Math.ceil(w / size) + 2;
      const rows = Math.ceil(h / size) + 2;
      const drift = frozen ? 0 : offset;

      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = 1;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * size - (drift % size);
          const y = row * size - (drift % size);
          ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        }
      }

      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        t.life -= 0.04;
        if (t.life <= 0) {
          trail.splice(i, 1);
          continue;
        }
        ctx.fillStyle = config.hoverFillColor.replace(/[\d.]+\)$/, `${t.life * 0.35})`);
        ctx.fillRect(t.x, t.y, size, size);
      }

      const mx = Math.floor(mouse.x / size) * size;
      const my = Math.floor(mouse.y / size) * size;
      if (mouse.x >= 0) {
        ctx.fillStyle = config.hoverFillColor;
        ctx.fillRect(mx, my, size, size);
      }

      const grad = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.75);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, config.vignetteEdge);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    function loop() {
      if (!frozen) offset += config.speed;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      const size = config.squareSize;
      trail.push({
        x: Math.floor(mouse.x / size) * size,
        y: Math.floor(mouse.y / size) * size,
        life: 1,
      });
      if (trail.length > config.hoverTrailAmount) trail.shift();
    }

    function onLeave() {
      mouse.x = -999;
      mouse.y = -999;
    }

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    loop();

    const iframe = document.getElementById('playerIframe');
    if (iframe) {
      const observer = new MutationObserver(() => {
        frozen = !!iframe.src && iframe.src !== 'about:blank';
        document.documentElement.classList.toggle('perf-streaming', frozen);
      });
      observer.observe(iframe, { attributes: true, attributeFilter: ['src'] });
    }

    return { freeze: () => { frozen = true; }, unfreeze: () => { frozen = false; } };
  }

  return { init };
})();
