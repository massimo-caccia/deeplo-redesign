const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
});
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    toggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) closeMenu();
});
matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);

// Search the existing directory; every profile remains available without JavaScript.
const teamQuery = document.querySelector('#team-query');
if (teamQuery) {
  const teamRole = document.querySelector('#team-role');
  const teamClear = document.querySelector('#team-clear');
  const teamStatus = document.querySelector('.team-status');
  const teamEmpty = document.querySelector('.team-empty');
  const groups = [...document.querySelectorAll('[data-team-group]')];
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const profiles = groups.flatMap((group) => [...group.querySelectorAll('.person-card')].map((card) => ({
    card,
    group,
    text: normalize(card.textContent),
  })));
  const filterTeam = () => {
    const terms = normalize(teamQuery.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const profile of profiles) {
      const visible = (!teamRole.value || profile.group.dataset.teamGroup === teamRole.value)
        && terms.every((term) => profile.text.includes(term));
      profile.card.hidden = !visible;
      if (visible) count += 1;
    }
    for (const group of groups) {
      const empty = !group.querySelector('.person-card:not([hidden])');
      group.hidden = empty;
      document.getElementById(group.getAttribute('aria-labelledby')).hidden = empty;
    }
    teamStatus.textContent = `${count} / ${profiles.length} ${teamStatus.dataset.unit}`;
    teamEmpty.hidden = count !== 0;
    teamClear.hidden = !teamQuery.value;
  };
  document.querySelector('.team-controls').hidden = false;
  teamQuery.addEventListener('input', filterTeam);
  teamRole.addEventListener('change', filterTeam);
  teamClear.addEventListener('click', () => {
    teamQuery.value = '';
    filterTeam();
    teamQuery.focus();
  });
  filterTeam();
}

// Native dialog supplies modal focus management and Escape-to-close behavior.
const photoDialog = document.querySelector('.photo-dialog');
if (photoDialog && typeof photoDialog.showModal === 'function') {
  const photos = [...document.querySelectorAll('[data-gallery-index]')];
  const fullPhoto = photoDialog.querySelector('.photo-full');
  const caption = photoDialog.querySelector('.photo-caption');
  const counter = photoDialog.querySelector('.photo-counter');
  let index = 0;
  let opener;
  const showPhoto = (nextIndex) => {
    index = (nextIndex + photos.length) % photos.length;
    const photo = photos[index];
    fullPhoto.src = photo.href;
    fullPhoto.alt = photo.querySelector('img').alt;
    caption.textContent = fullPhoto.alt;
    counter.textContent = `${index + 1} / ${photos.length}`;
  };
  photos.forEach((photo, photoIndex) => photo.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = photo;
    showPhoto(photoIndex);
    photoDialog.showModal();
    photoDialog.querySelector('.photo-close').focus();
  }));
  photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
  photoDialog.querySelector('.photo-previous').addEventListener('click', () => showPhoto(index - 1));
  photoDialog.querySelector('.photo-next').addEventListener('click', () => showPhoto(index + 1));
  photoDialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showPhoto(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  photoDialog.addEventListener('click', (event) => {
    if (event.target !== photoDialog) return;
    const bounds = photoDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoDialog.close();
  });
  photoDialog.addEventListener('close', () => opener?.focus());
}

// All eleven countries stay visible; selection reveals the source universities.
const network = document.querySelector('.hero-network');
if (network) {
  const countryButtons = [...network.querySelectorAll('[data-select-country]')];
  const world = network.querySelector('.network-world');
  const reset = network.querySelector('.network-reset');
  const selectCountry = (code) => {
    countryButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.selectCountry === code)));
    world.querySelectorAll('[data-country]').forEach((shape) => shape.classList.toggle('is-selected', shape.dataset.country === code));
    network.querySelectorAll('[data-panel-country]').forEach((panel) => { panel.hidden = panel.dataset.panelCountry !== code; });
    network.querySelector('.network-intro').hidden = Boolean(code);
    world.classList.toggle('has-selection', Boolean(code));
    reset.hidden = !code;
  };
  countryButtons.forEach((button) => button.addEventListener('click', () => selectCountry(button.dataset.selectCountry)));
  world.addEventListener('click', (event) => {
    const country = event.target.closest('[data-country]');
    if (country) selectCountry(country.dataset.country);
  });
  reset.addEventListener('click', () => {
    const selected = countryButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
    selectCountry(null);
    selected?.focus();
  });
}

// One accessible list, with native touch scrolling and optional automatic pages.
const partners = document.querySelector('#partenaires');
if (partners) {
  const viewport = partners.querySelector('.partner-viewport');
  const track = partners.querySelector('.partner-track');
  const slides = [...track.children];
  const status = partners.querySelector('.carousel-status');
  const play = partners.querySelector('.carousel-play');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let hovering = false;
  let focused = false;
  let visible = false;
  let timer;
  const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
  const count = () => Math.max(1, Math.round(viewport.clientWidth / step()));
  const first = () => Math.max(0, Math.min(slides.length - count(), Math.round(viewport.scrollLeft / step())));
  const updateStatus = () => {
    const start = first();
    status.textContent = `${start + 1}–${Math.min(start + count(), slides.length)} / ${slides.length}`;
  };
  const updatePlay = () => {
    play.textContent = paused ? play.dataset.pausedText : play.dataset.playingText;
    play.setAttribute('aria-label', paused ? play.dataset.playLabel : play.dataset.pauseLabel);
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!paused && !hovering && !focused && visible && !document.hidden) {
      timer = setTimeout(() => { move(1, false); schedule(); }, 5500);
    }
  };
  const move = (direction, manual = true) => {
    const current = first();
    const last = Math.max(0, slides.length - count());
    const wrapping = direction > 0 ? current >= last : current <= 0;
    const target = direction > 0 ? (current >= last ? 0 : Math.min(last, current + count()))
      : (current <= 0 ? last : Math.max(0, current - count()));
    if (manual) {
      paused = true;
      updatePlay();
      status.setAttribute('aria-live', 'polite');
    } else status.setAttribute('aria-live', 'off');
    viewport.scrollTo({left: target * step(), behavior: wrapping || reducedMotion.matches ? 'auto' : 'smooth'});
    schedule();
  };
  partners.querySelector('.carousel-controls').hidden = false;
  partners.querySelector('.carousel-previous').addEventListener('click', () => move(-1));
  partners.querySelector('.carousel-next').addEventListener('click', () => move(1));
  play.addEventListener('click', () => { paused = !paused; updatePlay(); schedule(); });
  viewport.addEventListener('scroll', updateStatus, {passive: true});
  viewport.addEventListener('keydown', (event) => {
    if (event.target === viewport && ['ArrowRight', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  viewport.addEventListener('pointerdown', () => { paused = true; updatePlay(); schedule(); });
  partners.addEventListener('pointerenter', () => { hovering = true; schedule(); });
  partners.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  partners.addEventListener('focusin', () => { focused = true; schedule(); });
  partners.addEventListener('focusout', () => setTimeout(() => {
    focused = partners.contains(document.activeElement);
    schedule();
  }, 0));
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) paused = true; updatePlay(); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold: .25}).observe(partners);
  new ResizeObserver(updateStatus).observe(viewport);
  updateStatus();
  updatePlay();
}
