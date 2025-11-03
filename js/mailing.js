// Mailing list functionality
function isValidEmail(email) {
    if (!email) return false;
    // overall length limit (RFC recommends 256 but practical limit is 254)
    if (email.length > 254) return false;

    // local-part length limit
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    if (parts[0].length > 64) return false;
 
    // Regex that follows the RFC 5322-ish pattern
    // Accepts quoted local-parts and domain literals. 
    const rfc5322 = /^(?:[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*|"(?:\\[\x00-\x7f]|[^"\\])*")@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}|\[(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d?\d)){3}|[A-Za-z0-9-]*[A-Za-z0-9]:[!#-\[\]-~]+)\])$/;

    return rfc5322.test(email);
}

async function handleMailingListSubmit(event) {
    event.preventDefault();
    const emailInput = document.getElementById('email');
    const feedback = document.getElementById('mailing-feedback');
    const form = document.getElementById('mailing-list-form');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Clear previous feedback
    if (feedback) {
        feedback.textContent = '';
        feedback.className = '';
    }
    emailInput.setAttribute('aria-invalid', 'false');

    const email = (emailInput.value || '').trim();
    if (!isValidEmail(email)) {
        if (feedback) {
            feedback.textContent = 'Please enter a valid email address.';
            feedback.className = 'ml-error';
        } else {
            alert('Please enter a valid email address.');
        }
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return false;
    }

    // Disable submit to prevent double submissions
    if (submitBtn) submitBtn.disabled = true;

    try {
        const endpoint = window.MAILING_LIST_ENDPOINT || '/subscribe';

        if (endpoint === '/subscribe') {
            // No backend configured: simulate network delay and success
            await new Promise((resolve) => setTimeout(resolve, 700));
        } else {
            // Attempt a real network POST
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) throw new Error('Network response was not ok');
        }

        if (feedback) {
            feedback.textContent = 'Thanks for subscribing! Check your inbox for a confirmation.';
            feedback.className = 'ml-success';
        } else {
            alert('Thanks for subscribing!');
        }
        emailInput.value = '';
    } catch (err) {
        console.error('Mailing list signup failed:', err);
        if (feedback) {
            feedback.textContent = 'Sorry — we could not sign you up right now. Please try again later.';
            feedback.className = 'ml-error';
        } else {
            alert('Signup failed. Please try again later.');
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }

    return false;
}