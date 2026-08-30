document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
        toggle.focus();
      }
    });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var form = document.getElementById('contact-form');
  if (form) {
    var requiredFields = form.querySelectorAll('#name, #company, #email, #need');
    var requiredMessages = {
      name: 'Please enter your name and title.',
      company: 'Please enter your company name.',
      email: 'Please enter your email address.',
      need: 'Please select what you need.'
    };

    function validateField(field) {
      var wrapper = field.closest('.field');
      var errorEl = wrapper ? wrapper.querySelector('.field-error') : null;
      var message = '';
      if (field.validity.valueMissing) {
        message = requiredMessages[field.id] || 'This field is required.';
      } else if (field.validity.typeMismatch && field.type === 'email') {
        message = 'Please enter a valid email address, like name@company.com.';
      }
      if (wrapper) wrapper.classList.toggle('invalid', !!message);
      if (errorEl) errorEl.textContent = message;
      return !message;
    }

    requiredFields.forEach(function (field) {
      field.addEventListener('input', function () { validateField(field); });
      field.addEventListener('change', function () { validateField(field); });
      field.addEventListener('blur', function () { validateField(field); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var formIsValid = true;
      var firstInvalid = null;
      requiredFields.forEach(function (field) {
        var fieldIsValid = validateField(field);
        if (!fieldIsValid) {
          formIsValid = false;
          if (!firstInvalid) firstInvalid = field;
        }
      });
      if (!formIsValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var status = form.querySelector('.form-status');
      var data = new FormData(form);

      function fallbackToEmail() {
        var lines = [];
        data.forEach(function (value, key) {
          if (value && key !== 'access_key' && key !== 'botcheck' && key !== 'subject') lines.push(key + ': ' + value);
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
          form.reset();
          window.location.assign('thanks.html');
        })
        .catch(fallbackToEmail);
    });
  }
});
