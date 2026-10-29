// Keep React, domain fixtures, fonts and graphics behind this independently loaded entry.
// The static HTML recovery surface also works if this entry itself is blocked.
void import('./main').catch(() => {
  window.dispatchEvent(new Event('jejak:boot-failed'));
});
