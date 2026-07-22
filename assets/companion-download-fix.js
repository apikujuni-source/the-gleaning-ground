(function () {
  function normalizedText(element) {
    return ((element && element.textContent) || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isCompanionTrigger(element) {
    return !!element && normalizedText(element) === 'get the companion';
  }

  function getDownloadSection() {
    return document.getElementById('download-editions') || document.getElementById('companion-downloads');
  }

  function replaceTrigger() {
    document.querySelectorAll('a, button').forEach(function (element) {
      if (!isCompanionTrigger(element) || element.hasAttribute('data-companion-cta')) return;

      var link = document.createElement('a');
      link.className = element.className || 'btn btn-primary';
      link.innerHTML = element.innerHTML;
      link.href = '#companion-downloads';
      link.setAttribute('data-companion-cta', 'true');
      link.setAttribute('aria-label', 'Choose a Companion Journal download');
      element.replaceWith(link);
    });
  }

  replaceTrigger();

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('a, button');
    if (!isCompanionTrigger(trigger)) return;

    var section = getDownloadSection();
    if (!section) return;

    event.preventDefault();
    event.stopPropagation();

    document.querySelectorAll('.modal').forEach(function (modal) {
      modal.classList.remove('is-open', 'open', 'active');
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open', 'no-scroll');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, true);

  window.addEventListener('load', replaceTrigger);
})();
