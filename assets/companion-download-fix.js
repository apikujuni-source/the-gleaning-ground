(function () {
  var DOWNLOAD_URL = '/companion#download-editions';

  function normalizedText(element) {
    return ((element && element.textContent) || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isCompanionTrigger(element) {
    return !!element && normalizedText(element) === 'get the companion';
  }

  function isCompanionPage() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/companion' || path === '/companion.html';
  }

  function getDownloadSection() {
    return document.getElementById('download-editions') || document.getElementById('companion-downloads');
  }

  function replaceTrigger() {
    document.querySelectorAll('a, button').forEach(function (element) {
      if (!isCompanionTrigger(element) || element.hasAttribute('data-companion-cta')) return;

      var link = document.createElement('a');

      Array.prototype.slice.call(element.attributes || []).forEach(function (attribute) {
        if (['href', 'type', 'onclick', 'data-modal-open'].indexOf(attribute.name) !== -1) return;
        link.setAttribute(attribute.name, attribute.value);
      });

      link.className = element.className || 'btn btn-primary';
      link.innerHTML = element.innerHTML;
      link.href = DOWNLOAD_URL;
      link.setAttribute('data-companion-cta', 'true');
      link.setAttribute('aria-label', 'Choose a Companion Journal download');
      element.replaceWith(link);
    });
  }

  function goToDownloads(event, trigger) {
    if (!isCompanionTrigger(trigger)) return;

    var section = isCompanionPage() ? getDownloadSection() : null;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    document.querySelectorAll('.modal').forEach(function (modal) {
      modal.classList.remove('is-open', 'open', 'active');
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open', 'no-scroll');

    if (section) {
      window.history.replaceState(null, '', '#download-editions');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.location.assign(DOWNLOAD_URL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceTrigger);
  } else {
    replaceTrigger();
  }

  document.addEventListener('click', function (event) {
    goToDownloads(event, event.target.closest('a, button'));
  }, true);

  window.addEventListener('load', replaceTrigger);
})();
