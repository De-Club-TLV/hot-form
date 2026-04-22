(() => {
    const form = document.querySelector('form.lead-form');
    if (!form) return;

    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const phoneField = phoneInput.closest('.field');
    const emailField = emailInput.closest('.field');
    const phoneError = document.getElementById('phone-error');
    const emailError = document.getElementById('email-error');

    const formSection = document.querySelector('.form-section');
    const successPanel = document.querySelector('.success-panel');
    const submitAnother = document.getElementById('submit-another');
    const submitBtn = form.querySelector('.submit-btn');
    const btnLabel = submitBtn.querySelector('.btn-label');

    /* ---------- intl-tel-input ---------- */

    const iti = window.intlTelInput(phoneInput, {
        initialCountry: 'il',
        separateDialCode: true,
        strictMode: true,
        formatAsYouType: true,
        loadUtils: () =>
            import('https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js'),
    });

    /* ---------- Validators ---------- */

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const validatePhone = (touched = true) => {
        const raw = phoneInput.value.trim();
        if (!raw) {
            if (touched) showError(phoneField, phoneError, 'Phone number is required.');
            return false;
        }
        const valid = typeof iti.isValidNumber === 'function' ? iti.isValidNumber() : true;
        if (!valid) {
            if (touched) showError(phoneField, phoneError, 'Please enter a valid phone number.');
            return false;
        }
        clearError(phoneField, phoneError);
        return true;
    };

    const validateEmail = (touched = true) => {
        const val = emailInput.value.trim();
        if (!val) {
            clearError(emailField, emailError);
            return true; // optional
        }
        const valid = emailRe.test(val);
        if (!valid) {
            if (touched) showError(emailField, emailError, 'Please enter a valid email address.');
            return false;
        }
        clearError(emailField, emailError);
        return true;
    };

    function showError(fieldEl, errorEl, msg) {
        fieldEl.classList.add('invalid');
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }

    function clearError(fieldEl, errorEl) {
        fieldEl.classList.remove('invalid');
        errorEl.hidden = true;
    }

    /* ---------- Real-time events ---------- */

    // Validate on blur (first pass) and every input change thereafter
    phoneInput.addEventListener('blur', () => validatePhone(true));
    phoneInput.addEventListener('input', () => {
        if (phoneField.classList.contains('invalid')) validatePhone(true);
    });
    phoneInput.addEventListener('countrychange', () => {
        if (phoneField.classList.contains('invalid')) validatePhone(true);
    });

    emailInput.addEventListener('blur', () => validateEmail(true));
    emailInput.addEventListener('input', () => {
        if (emailField.classList.contains('invalid')) validateEmail(true);
    });

    /* ---------- Submit ---------- */

    const encode = (data) =>
        Object.keys(data)
            .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(data[k]))
            .join('&');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phoneOk = validatePhone(true);
        const emailOk = validateEmail(true);

        if (!form.checkValidity() || !phoneOk || !emailOk) {
            form.reportValidity();
            if (!phoneOk) phoneInput.focus();
            else if (!emailOk) emailInput.focus();
            return;
        }

        const originalLabel = btnLabel.textContent;
        submitBtn.disabled = true;
        btnLabel.textContent = 'Submitting…';

        const formData = new FormData(form);
        // Replace phone with E.164 formatted number
        if (typeof iti.getNumber === 'function') {
            formData.set('phone', iti.getNumber());
        }
        formData.set('phone_country', iti.getSelectedCountryData().iso2 || '');

        const data = {};
        formData.forEach((value, key) => (data[key] = value));

        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encode(data),
            });
            if (!response.ok) throw new Error('Submission failed');

            formSection.classList.add('submitted');
            successPanel.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            btnLabel.textContent = 'Try again';
            submitBtn.disabled = false;
            setTimeout(() => {
                btnLabel.textContent = originalLabel;
            }, 2500);
        }
    });

    submitAnother?.addEventListener('click', () => {
        form.reset();
        iti.setCountry('il');
        clearError(phoneField, phoneError);
        clearError(emailField, emailError);
        formSection.classList.remove('submitted');
        successPanel.hidden = true;
        submitBtn.disabled = false;
        btnLabel.textContent = 'Submit';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
})();
