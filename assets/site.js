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

// Keep keyboard-focused logos in view without stopping the continuous belt.
const belt = document.querySelector('.partner-belt');
if (belt) {
  belt.addEventListener('focusin', (event) => {
    const item = event.target.closest('#partner-track .partner-slide');
    const animation = belt.getAnimations()[0];
    if (!item || !animation) return;
    const track = document.querySelector('#partner-track');
    const distance = item.getBoundingClientRect().left - track.getBoundingClientRect().left;
    const duration = animation.effect.getTiming().duration;
    animation.currentTime = distance / track.getBoundingClientRect().width * duration;
  });
}
