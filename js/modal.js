window.App = window.App || {};

// Replaces the browser's native alert()/confirm() (which render as an
// unstyled OS dialog) with a custom overlay that matches the app's dark
// theme. Native alert/confirm are synchronous — they pause script
// execution until dismissed — but a custom DOM dialog can't block like
// that, so these return Promises instead. Call sites use `await`:
//   const ok = await App.Modal.confirm('Delete this?');
//   if (!ok) return;
(function () {
  let overlay, titleEl, messageEl, confirmBtn, cancelBtn;

  // DOM elements are grabbed on first use rather than at load time, since
  // this file loads before body markup is guaranteed parsed in some load
  // orders — grabbing lazily avoids caring about that.
  function refs() {
    if (!overlay) {
      overlay = document.getElementById('modal-overlay');
      titleEl = document.getElementById('modal-title');
      messageEl = document.getElementById('modal-message');
      confirmBtn = document.getElementById('modal-confirm-btn');
      cancelBtn = document.getElementById('modal-cancel-btn');
    }
    return { overlay, titleEl, messageEl, confirmBtn, cancelBtn };
  }

  // Shared implementation for both alert() and confirm() below — the only
  // difference between them is whether a Cancel button is shown and what
  // "dismissed without confirming" resolves to.
  function show({ title, message, showCancel, confirmText, cancelText, danger }) {
    const r = refs();
    r.titleEl.textContent = title || '';
    r.titleEl.style.display = title ? 'block' : 'none';
    r.messageEl.textContent = message;
    r.confirmBtn.textContent = confirmText || 'OK';
    r.confirmBtn.className = 'btn-small ' + (danger ? 'btn-danger' : 'btn-primary');
    r.cancelBtn.style.display = showCancel ? 'inline-block' : 'none';
    r.cancelBtn.textContent = cancelText || 'Cancel';
    r.overlay.style.display = 'flex';
    // rAF so the "open" class is applied a frame after display:flex, giving
    // the CSS transition something to animate from (see .modal-overlay.open).
    requestAnimationFrame(() => r.overlay.classList.add('open'));
    r.confirmBtn.focus();

    return new Promise((resolve) => {
      function close(result) {
        r.overlay.classList.remove('open');
        r.overlay.style.display = 'none';
        r.confirmBtn.removeEventListener('click', onConfirm);
        r.cancelBtn.removeEventListener('click', onCancel);
        r.overlay.removeEventListener('mousedown', onOverlayClick);
        document.removeEventListener('keydown', onKeydown);
        resolve(result);
      }
      function onConfirm() { close(true); }
      function onCancel() { close(false); }
      // Clicking the dark backdrop (not the box itself) counts as Cancel.
      function onOverlayClick(e) { if (e.target === r.overlay) close(false); }
      function onKeydown(e) {
        if (e.key === 'Escape') close(false);
        else if (e.key === 'Enter') close(true);
      }
      r.confirmBtn.addEventListener('click', onConfirm);
      r.cancelBtn.addEventListener('click', onCancel);
      r.overlay.addEventListener('mousedown', onOverlayClick);
      document.addEventListener('keydown', onKeydown);
    });
  }

  // Message + single OK button. Resolves (with no meaningful value) once dismissed.
  function modalAlert(message, opts) {
    opts = opts || {};
    return show({ message, showCancel: false, confirmText: opts.confirmText || 'OK', title: opts.title, danger: opts.danger });
  }

  // Message + Cancel/Confirm buttons. Resolves true if confirmed, false
  // if cancelled (via button, backdrop click, or Escape).
  function modalConfirm(message, opts) {
    opts = opts || {};
    return show({ message, showCancel: true, confirmText: opts.confirmText || 'Confirm', cancelText: opts.cancelText, title: opts.title, danger: opts.danger });
  }

  window.App.Modal = { alert: modalAlert, confirm: modalConfirm };
})();
