/**
 * EasyMechanics — Site Visit Counter
 * Uses localStorage to track total page visits across the site.
 * Each page load increments the counter and updates the footer display.
 */
(function () {
  const KEY = 'em_visit_count';
  const count = (parseInt(localStorage.getItem(KEY), 10) || 0) + 1;
  localStorage.setItem(KEY, count);

  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('visitCount');
    if (el) el.textContent = count.toLocaleString();
  });
})();
