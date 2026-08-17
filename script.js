document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var data = new FormData(form);

      function fallbackToEmail() {
        var lines = [];
        data.forEach(function (value, key) {
          if (value && key !== 'access_key' && key !== 'botcheck') lines.push(key + ': ' + value);
        });
        var subject = encodeURIComponent('Fractional CTO inquiry — ' + (data.get('company') || ''));
        var body = encodeURIComponent(lines.join('\n'));
        if (status) status.textContent = 'Opening your email client…';
        window.location.href = 'mailto:info@tonyclancy.com?subject=' + subject + '&body=' + body;
      }

      if (status) status.textContent = 'Sending…';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data
      })
        .then(function (response) { return response.json(); })
        .then(function (result) {
          if (!result.success) throw new Error(result.message || 'Form submission failed');
          if (status) status.textContent = 'Thanks — I\'ll be in touch soon.';
          form.reset();
        })
        .catch(fallbackToEmail);
    });
  }
});
