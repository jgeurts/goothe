// Goothe — Bay View Bark Quick Booker
// Minify and prefix with javascript: for the bookmark URL
//
// Minified version:
// javascript:void((function(){if(!location.hostname.includes('booking.goose.pet')){alert('Navigate to booking.goose.pet first');return}var e=document.getElementById('goothe');if(e){e.remove();return}var b='https://jgeurts.github.io/goothe/';var l=document.createElement('link');l.rel='stylesheet';l.href=b+'goothe.css';document.head.appendChild(l);var s=document.createElement('script');s.type='module';s.src=b+'goothe.js';document.head.appendChild(s)})())

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

  // Inject CSS + JS from GitHub Pages
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
