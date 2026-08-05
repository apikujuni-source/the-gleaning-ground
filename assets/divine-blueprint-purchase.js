(function () {
  'use strict';

  var MODAL_ID = 'book-purchase-modal';
  var openTrigger = null;

  function normalizedText(element) {
    return ((element && element.textContent) || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isPurchaseTrigger(element) {
    if (!element || element.closest('#' + MODAL_ID)) return false;
    if (element.matches('[data-book-purchase-open]')) return true;
    return [
      'buy the book',
      'get the book',
      'order the book',
      'purchase the book',
      'get your copy',
      'buy now',
      'order now'
    ].indexOf(normalizedText(element)) !== -1;
  }

  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  function removeLegacyPurchaseModals() {
    document.querySelectorAll('.modal,[role="dialog"]').forEach(function (element) {
      if (element.id === MODAL_ID) return;
      var text = normalizedText(element);
      if (
        text.indexOf('add your amazon') !== -1 ||
        text.indexOf('shopify') !== -1 ||
        text.indexOf('woocommerce') !== -1 ||
        text.indexOf('before launch') !== -1
      ) {
        element.hidden = true;
        element.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function openModal(trigger) {
    var modal = getModal();
    if (!modal) return;

    openTrigger = trigger || document.activeElement;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('book-purchase-open');
    document.body.classList.add('book-purchase-open');

    var focusTarget = modal.querySelector('[data-book-purchase-initial-focus]') || modal.querySelector('a,button');
    if (focusTarget) window.setTimeout(function () { focusTarget.focus(); }, 0);
  }

  function closeModal() {
    var modal = getModal();
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('book-purchase-open');
    document.body.classList.remove('book-purchase-open');

    if (openTrigger && typeof openTrigger.focus === 'function') openTrigger.focus();
    openTrigger = null;
  }

  function trapFocus(event) {
    var modal = getModal();
    if (!modal || modal.hidden || event.key !== 'Tab') return;

    var focusable = Array.prototype.slice.call(
      modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')
    ).filter(function (element) { return !element.hidden; });

    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('a,button');

    if (isPurchaseTrigger(trigger)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      openModal(trigger);
      return;
    }

    if (event.target.closest('[data-book-purchase-close]')) {
      event.preventDefault();
      closeModal();
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal();
    trapFocus(event);
  });

  function initialize() {
    removeLegacyPurchaseModals();
    document.querySelectorAll('a,button').forEach(function (element) {
      if (!isPurchaseTrigger(element)) return;
      element.setAttribute('data-book-purchase-open', '');
      element.setAttribute('aria-haspopup', 'dialog');
      element.setAttribute('aria-controls', MODAL_ID);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
