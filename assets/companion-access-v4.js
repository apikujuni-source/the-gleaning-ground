(function () {
  'use strict';

  var COMPANION_URL = '/companion#companion-access';
  var ACCESS_STORAGE_KEY = 'divineBlueprintCompanionAccess.v1';
  var ACCESS_QUERY = 'journal-access';

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

  function getAccessGate() {
    return document.getElementById('companion-access-gate');
  }

  function getDownloadSection() {
    return document.getElementById('download-editions') || document.getElementById('companion-downloads');
  }

  function getDownloadLinks() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-journal-download]'));
  }

  function hasStoredAccess() {
    try {
      return window.localStorage.getItem(ACCESS_STORAGE_KEY) === 'granted';
    } catch (error) {
      return false;
    }
  }

  function storeAccess() {
    try {
      window.localStorage.setItem(ACCESS_STORAGE_KEY, 'granted');
    } catch (error) {
      // Access still works for the current visit when storage is unavailable.
    }
  }

  function hasAccessQuery() {
    try {
      return new URL(window.location.href).searchParams.get(ACCESS_QUERY) === 'granted';
    } catch (error) {
      return false;
    }
  }

  function cleanAccessQuery() {
    try {
      var url = new URL(window.location.href);
      if (!url.searchParams.has(ACCESS_QUERY)) return;
      url.searchParams.delete(ACCESS_QUERY);
      window.history.replaceState({}, '', url.pathname + (url.search || '') + '#download-editions');
    } catch (error) {
      // The query parameter is harmless if history replacement is unavailable.
    }
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
      link.href = COMPANION_URL;
      link.setAttribute('data-companion-cta', 'true');
      link.setAttribute('aria-label', 'Register to access the Companion Journal');
      element.replaceWith(link);
    });
  }

  function goToAccess(event, trigger) {
    if (!isCompanionTrigger(trigger)) return;

    var gate = isCompanionPage() ? getAccessGate() : null;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    document.querySelectorAll('.modal').forEach(function (modal) {
      modal.classList.remove('is-open', 'open', 'active');
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open', 'no-scroll');

    if (gate) {
      window.history.replaceState(null, '', '#companion-access');
      gate.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.location.assign(COMPANION_URL);
  }

  function setFormStatus(message, state) {
    var status = document.getElementById('companion-access-status');
    if (!status) return;
    status.textContent = message || '';
    status.setAttribute('data-state', state || '');
  }

  function grantAccess(options) {
    var settings = options || {};
    var formPanel = document.getElementById('companion-access-form-panel');
    var successPanel = document.getElementById('companion-download-access');

    storeAccess();
    getDownloadLinks().forEach(function (link) {
      link.hidden = false;
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      if (link.dataset.journalLabel) link.textContent = link.dataset.journalLabel;
    });

    if (formPanel) formPanel.hidden = true;
    if (successPanel) successPanel.hidden = false;
    document.documentElement.classList.add('companion-access-granted');

    if (settings.cleanQuery) cleanAccessQuery();
    if (settings.scroll) {
      var section = getDownloadSection();
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleAccessForm() {
    var form = document.getElementById('companion-access-form');
    if (!form) return;

    form.addEventListener('submit', function () {
      setFormStatus('Registration submitted. Your journal is now unlocked.', 'success');
      grantAccess({ scroll: true });
    });
  }

  function initializeCompanionAccess() {
    if (!isCompanionPage()) return;

    var queryAccess = hasAccessQuery();
    if (hasStoredAccess() || queryAccess) {
      grantAccess({ cleanQuery: queryAccess, scroll: queryAccess });
    }

    handleAccessForm();
  }

  function initialize() {
    replaceTrigger();
    initializeCompanionAccess();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  document.addEventListener('click', function (event) {
    goToAccess(event, event.target.closest('a, button'));
  }, true);

  window.addEventListener('load', replaceTrigger);
})();
