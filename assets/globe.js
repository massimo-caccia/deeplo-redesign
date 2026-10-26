(() => {
  const network = document.querySelector('.hero-network');
  if (!network || !window.d3) return;
  const canvas = network.querySelector('.globe-canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const data = JSON.parse(document.querySelector('#globe-data').textContent);
  const buttons = [...network.querySelectorAll('[data-select-country]')];
  const names = new Map(buttons.map(button => [button.dataset.selectCountry, button.textContent.trim()]));
  const countries = data.features.filter(feature => names.has(feature.properties.code));
  const countryByCode = new Map(countries.map(feature => [feature.properties.code, feature]));
  const radians = Math.PI / 180;
  const dots = data.dots.map(([lon, lat, code]) => ({
    x: Math.cos(lat * radians) * Math.cos(lon * radians),
    y: Math.cos(lat * radians) * Math.sin(lon * radians),
    z: Math.sin(lat * radians), code,
  }));
  const projection = d3.geoOrthographic().translate([300, 265]).scale(220).clipAngle(90);
  const path = d3.geoPath(projection, context);
  const grid = d3.geoGraticule().step([30, 30])();
  const tooltip = network.querySelector('.globe-tooltip');
  const reset = network.querySelector('.network-reset');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const baseLabel = canvas.getAttribute('aria-label');
  let rotation = [24, -20, 0];
  let selected = null;
  let hovered = null;
  let markers = [];
  let drag = null;
  let tween = null;
  let autorotate = true;
  let visible = true;
  let frameId = 0;
  let lastTime = 0;

  function draw() {
    projection.rotate(rotation);
    context.clearRect(0, 0, 600, 530);
    const lon = -rotation[0] * radians;
    const lat = -rotation[1] * radians;
    const sinLon = Math.sin(lon), cosLon = Math.cos(lon);
    const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
    function point(x, y, z) {
      const forward = x * cosLon + y * sinLon;
      return [300 + 220 * (y * cosLon - x * sinLon), 265 + 220 * (sinLat * forward - cosLat * z), cosLat * forward + sinLat * z];
    }
    function locate([longitude, latitude]) {
      const a = longitude * radians, b = latitude * radians;
      return point(Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b));
    }
    const halo = context.createRadialGradient(300, 265, 190, 300, 265, 270);
    halo.addColorStop(0, '#95cabe35'); halo.addColorStop(1, '#95cabe00');
    context.fillStyle = halo;
    context.beginPath(); context.arc(300, 265, 270, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#5f9f902d'; context.lineWidth = .8;
    for (const [angle, radiusY] of [[-.45, 100], [.58, 140]]) {
      context.beginPath(); context.ellipse(300, 265, 282, radiusY, angle, 0, Math.PI * 2); context.stroke();
    }
    const sea = context.createRadialGradient(215, 135, 15, 300, 265, 310);
    sea.addColorStop(0, '#f1fff6'); sea.addColorStop(.62, '#d7eee4'); sea.addColorStop(1, '#a3cbbf');
    context.beginPath(); context.arc(300, 265, 220, 0, Math.PI * 2);
    context.fillStyle = sea; context.fill();
    context.strokeStyle = '#8bb8aa'; context.lineWidth = .7; context.stroke();
    context.save(); context.clip();
    context.beginPath(); path(grid);
    context.strokeStyle = '#4d867735'; context.lineWidth = .6; context.stroke();
    for (const country of countries) {
      context.beginPath(); path(country);
      const active = country.properties.code === selected || country.properties.code === hovered;
      context.fillStyle = active ? '#059f8240' : '#209f8319';
      context.fill();
      context.strokeStyle = active ? '#00685d' : '#478e7d4d';
      context.lineWidth = active ? 1 : .5; context.stroke();
    }
    for (const dot of dots) {
      const [x, y, z] = point(dot.x, dot.y, dot.z);
      if (z <= 0) continue;
      context.globalAlpha = .32 + .48 * z;
      context.fillStyle = dot.code === selected ? '#004f50' : '#27646b';
      context.beginPath(); context.arc(x, y, .8 + .55 * z, 0, Math.PI * 2); context.fill();
    }
    context.globalAlpha = 1;
    markers = [];
    for (const country of countries) {
      const [x, y, z] = locate(country.properties.center);
      if (z < .035) continue;
      const code = country.properties.code;
      const active = code === selected || code === hovered;
      markers.push({x, y, code});
      context.beginPath(); context.arc(x, y, active ? 11 : 7, 0, Math.PI * 2);
      context.strokeStyle = active ? '#00887599' : '#00756855'; context.lineWidth = 1; context.stroke();
      context.beginPath(); context.arc(x, y, active ? 4.5 : 3, 0, Math.PI * 2);
      context.fillStyle = active ? '#003e51' : '#008979'; context.fill();
      context.strokeStyle = '#f1fff6'; context.lineWidth = 1; context.stroke();
    }
    context.restore();
  }

  function frame(now) {
    frameId = 0;
    if (!visible || document.hidden) { lastTime = 0; return; }
    const elapsed = lastTime ? Math.min(now - lastTime, 64) : 0;
    lastTime = now;
    if (tween) {
      const progress = Math.min((now - tween.start) / 850, 1);
      const ease = progress * progress * (3 - 2 * progress);
      rotation = [tween.from[0] + tween.delta[0] * ease, tween.from[1] + tween.delta[1] * ease, 0];
      if (progress === 1) tween = null;
    } else if (autorotate && !drag && !reducedMotion.matches) rotation[0] += elapsed * .0025;
    draw();
    if (tween || (autorotate && !drag && !reducedMotion.matches)) requestFrame();
  }
  function requestFrame() {
    if (!frameId && visible && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  function rotateTo(target) {
    const delta = ((target[0] - rotation[0] + 540) % 360 + 360) % 360 - 180;
    if (reducedMotion.matches) { rotation = target; tween = null; }
    else tween = {from: [...rotation], delta: [delta, target[1] - rotation[1]], start: performance.now()};
    requestFrame();
  }
  function selectCountry(code) {
    selected = code;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.selectCountry === code)));
    network.querySelectorAll('[data-panel-country]').forEach(panel => { panel.hidden = panel.dataset.panelCountry !== code; });
    network.querySelector('.network-intro').hidden = Boolean(code);
    reset.hidden = false;
    tooltip.hidden = true;
    autorotate = !code;
    canvas.setAttribute('aria-label', code ? `${baseLabel} — ${names.get(code)}` : baseLabel);
    if (code) {
      const [lon, lat] = countryByCode.get(code).properties.center;
      rotateTo([-lon, -lat, 0]);
    } else rotateTo([24, -20, 0]);
  }
  function position(event) {
    const bounds = canvas.getBoundingClientRect();
    return [(event.clientX - bounds.left) * 600 / bounds.width, (event.clientY - bounds.top) * 530 / bounds.height];
  }
  function hit([x, y]) {
    const marker = [...markers].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (marker && Math.hypot(marker.x - x, marker.y - y) < 12) return marker.code;
    if (Math.hypot(x - 300, y - 265) > 220) return null;
    const coordinate = projection.invert([x, y]);
    return countries.find(country => d3.geoContains(country, coordinate))?.properties.code || null;
  }
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = {id: event.pointerId, origin: position(event), rotation: [...rotation], moved: false};
    autorotate = false; tween = null;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    tooltip.hidden = true;
  });
  canvas.addEventListener('pointermove', event => {
    const point = position(event);
    if (drag && event.pointerId === drag.id) {
      const dx = point[0] - drag.origin[0], dy = point[1] - drag.origin[1];
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      rotation = [drag.rotation[0] + dx * .34, Math.max(-80, Math.min(80, drag.rotation[1] - dy * .34)), 0];
      reset.hidden = false;
      requestFrame();
      return;
    }
    const country = hit(point);
    if (country !== hovered) { hovered = country; requestFrame(); }
    canvas.classList.toggle('has-country', Boolean(country));
    tooltip.hidden = !country;
    if (country) {
      tooltip.textContent = names.get(country);
      const bounds = canvas.getBoundingClientRect();
      tooltip.style.left = `${Math.max(8, Math.min(bounds.width - 140, event.clientX - bounds.left + 10))}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - bounds.top - 38)}px`;
    }
  });
  function endDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const clicked = !drag.moved && !cancelled;
    drag = null;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (clicked) {
      const code = hit(position(event));
      if (code) selectCountry(code);
    }
    requestFrame();
  }
  canvas.addEventListener('pointerup', event => endDrag(event));
  canvas.addEventListener('pointercancel', event => endDrag(event, true));
  canvas.addEventListener('lostpointercapture', event => endDrag(event, true));
  canvas.addEventListener('pointerleave', () => { hovered = null; tooltip.hidden = true; requestFrame(); });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    autorotate = false; tween = null; reset.hidden = false;
    if (event.key === 'Home') { selectCountry(null); return; }
    if (event.key === 'ArrowLeft') rotation[0] -= 12;
    if (event.key === 'ArrowRight') rotation[0] += 12;
    if (event.key === 'ArrowUp') rotation[1] = Math.min(80, rotation[1] + 12);
    if (event.key === 'ArrowDown') rotation[1] = Math.max(-80, rotation[1] - 12);
    requestFrame();
  });
  buttons.forEach(button => button.addEventListener('click', () => selectCountry(button.dataset.selectCountry)));
  reset.addEventListener('click', () => { selectCountry(null); canvas.focus(); });
  reducedMotion.addEventListener('change', requestFrame);
  document.addEventListener('visibilitychange', () => { lastTime = 0; requestFrame(); });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastTime = 0;
    requestFrame();
  }).observe(canvas);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 600 * ratio;
  canvas.height = 530 * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
  canvas.hidden = false;
  network.querySelector('.globe-fallback').style.display = 'none';
  requestFrame();
})();
