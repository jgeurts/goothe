// Goothe — Bay View Bark Quick Booker
// Minify and prefix with javascript: for the bookmark URL
//
// === PRODUCTION bookmarklet (loads from GitHub Pages) ===
// javascript:void((function(){if(!location.hostname.includes('booking.goose.pet')){alert('Navigate to booking.goose.pet first');return}var e=document.getElementById('goothe');if(e){e.remove();return}var b='https://jgeurts.github.io/goothe/';var l=document.createElement('link');l.rel='stylesheet';l.href=b+'goothe.css';document.head.appendChild(l);var s=document.createElement('script');s.type='module';s.src=b+'goothe.js';document.head.appendChild(s)})())
//
// === DEV bookmarklet (loads from localhost Vite dev server) ===
// Run `npm start` in the goothe directory first, then use this bookmarklet
// on booking.goose.pet to inject the app with hot reload:
// javascript:void((function(){if(!location.hostname.includes('booking.goose.pet')){alert('Navigate to booking.goose.pet first');return}var e=document.getElementById('goothe');if(e){e.remove();return}var b='http://localhost:3000/goothe/';var l=document.createElement('link');l.rel='stylesheet';l.href=b+'goothe.css';document.head.appendChild(l);var s=document.createElement('script');s.type='module';s.src=b+'goothe.js';document.head.appendChild(s)})())

(function () {
  // Must be on booking.goose.pet for localStorage access
  if (!location.hostname.includes('booking.goose.pet')) {
    alert('Navigate to booking.goose.pet first');
    return;
  }

  // Toggle: remove if already injected
  var existing = document.getElementById('goothe');
  if (existing) {
    existing.remove();
    return;
  }

  // Change this to 'http://localhost:3000/goothe/' for local dev
  var base = 'https://jgeurts.github.io/goothe/';

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = base + 'goothe.css';
  document.head.appendChild(link);

  var script = document.createElement('script');
  script.type = 'module';
  script.src = base + 'goothe.js';
  document.head.appendChild(script);
})();
