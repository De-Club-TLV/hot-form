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

    // Shared HMAC secret with the Netlify Function env var HOT_FORM_HMAC_SECRET.
    // Browser can see this; real anti-abuse lives at the edge. Same tradeoff
    // as the main declub.co.il contact modal.
    const HMAC_SECRET = 'd137087578ec6d752eb872f12474b63a8d1803a74b76729e25384edf3a8d2d08';
    const SUBMIT_ENDPOINT = '/.netlify/functions/submit-lead';

    function sortKeys(val) {
        if (Array.isArray(val)) return val.map(sortKeys);
        if (val && typeof val === 'object') {
            const out = {};
            for (const k of Object.keys(val).sort()) out[k] = sortKeys(val[k]);
            return out;
        }
        return val;
    }

    function canonicalJson(obj) {
        return JSON.stringify(sortKeys(obj));
    }

    async function hmacSha256Hex(secret, message) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
        return Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

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

        const fd = new FormData(form);
        const payload = {
            submitted_by: (fd.get('submitted_by') || '').toString(),
            first_name: (fd.get('first_name') || '').toString().trim(),
            last_name: (fd.get('last_name') || '').toString().trim(),
            phone: typeof iti.getNumber === 'function' ? iti.getNumber() : (fd.get('phone') || '').toString(),
            phone_country: (iti.getSelectedCountryData().iso2 || '').toLowerCase(),
            email: (fd.get('email') || '').toString().trim() || undefined,
            notes: (fd.get('notes') || '').toString().trim() || undefined,
        };
        for (const k of ['email', 'notes']) {
            if (payload[k] === undefined) delete payload[k];
        }

        try {
            const canonical = canonicalJson(payload);
            const signature = await hmacSha256Hex(HMAC_SECRET, canonical);
            const response = await fetch(SUBMIT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                },
                body: canonical,
            });
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error('Submission failed: ' + response.status + ' ' + text.slice(0, 200));
            }

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
