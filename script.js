(() => {
    const form = document.querySelector('form.lead-form');
    const successPanel = document.querySelector('.success-panel');
    const submitAnother = document.getElementById('submit-another');
    const submitBtn = form?.querySelector('.submit-btn');
    const btnLabel = submitBtn?.querySelector('.btn-label');

    if (!form) return;

    const encode = (data) =>
        Object.keys(data)
            .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
            .join('&');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const originalLabel = btnLabel.textContent;
        submitBtn.disabled = true;
        btnLabel.textContent = 'Submitting…';

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => (data[key] = value));

        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encode(data),
            });

            if (!response.ok) throw new Error('Submission failed');

            form.hidden = true;
            successPanel.hidden = false;
            successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        form.hidden = false;
        successPanel.hidden = true;
        submitBtn.disabled = false;
        btnLabel.textContent = 'Submit Lead';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
})();
