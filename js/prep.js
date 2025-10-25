// RFC-style email validation helper
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

// Handle mailing list submission with inline validation and simulated async submit.
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
        // If you have a real backend endpoint, set window.MAILING_LIST_ENDPOINT = 'https://your.api/subscribe'
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

const settings = ["urban", "forest", "dungeon"];
const enemies = ["Goblin", "Orc", "Dragon"];
const difficulties = ["Easy", "Medium", "Hard"];
const hooks = [
    "A mysterious event occurs in the ",
    "A stranger arrives in the ",
    "A secret is revealed in the "
];
const npcNames = ['Guard', 'Merchant', 'Wizard', 'Noble', 'Thief', 'Priest'];

function getTwoRandom(arr) {
    let first = arr[Math.floor(Math.random() * arr.length)];
    let second;
    do {
        second = arr[Math.floor(Math.random() * arr.length)];
    } while (second === first && arr.length > 1);
    return [first, second];
}

function getTwoRandomNPCs() {
    let shuffled = npcNames.sort(() => 0.5 - Math.random());
    return [
        { name: shuffled[0], role: "Role of " + shuffled[0], dialogue: "Dialogue from " + shuffled[0] },
        { name: shuffled[1], role: "Role of " + shuffled[1], dialogue: "Dialogue from " + shuffled[1] }
    ];
}

function getTwoRandomHooks(setting) {
    let [h1, h2] = getTwoRandom(hooks);
    return [h1 + setting, h2 + setting];
}  

function createChoiceRow(category, choices) {
    return `
    <div class="choice-row" data-category="${category}">
        <div class="choice" draggable="true" data-value="${encodeURIComponent(JSON.stringify(choices[0]))}">${typeof choices[0] === 'object' ? choices[0].name : choices[0]}</div>
        <div class="choice" draggable="true" data-value="${encodeURIComponent(JSON.stringify(choices[1]))}">${typeof choices[1] === 'object' ? choices[1].name : choices[1]}</div>
        <div class="selected-drop" data-category="${category}">Drop your choice here</div>
    </div>
    `;
}

function renderChoices() {
    // Generate two options for each category
    const settingChoices = getTwoRandom(settings);
    const enemyChoices = getTwoRandom(enemies);
    const difficultyChoices = getTwoRandom(difficulties);
    const npcChoices = getTwoRandomNPCs();
    const hookChoices = getTwoRandomHooks(settingChoices[0]); // Use first setting for hooks

    let html = '';
    html += createChoiceRow('setting', settingChoices);
    html += createChoiceRow('hook', hookChoices);
    html += createChoiceRow('npc', npcChoices);
    html += createChoiceRow('enemy', enemyChoices);
    html += createChoiceRow('difficulty', difficultyChoices);

    document.getElementById('sessionOutput').innerHTML = html;
}

function enableDragAndDrop() {
    let dragged;
    document.querySelectorAll('.choice').forEach(choice => {
        choice.addEventListener('dragstart', function (e) {
            dragged = this;
            e.dataTransfer.setData('text/plain', this.dataset.value);
            e.dataTransfer.effectAllowed = 'move';
        });
    });

    document.querySelectorAll('.selected-drop').forEach(drop => {
        drop.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        drop.addEventListener('dragleave', function (e) {
            this.classList.remove('dragover');
        });
        drop.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('dragover');
            let value = e.dataTransfer.getData('text/plain');
            let parsed = JSON.parse(decodeURIComponent(value));
            this.textContent = typeof parsed === 'object' ? parsed.name : parsed;
            this.dataset.value = value;
            checkIfAllSelected();
        });
    });
}

function checkIfAllSelected() {
    let allSelected = true;
    let session = {};
    document.querySelectorAll('.selected-drop').forEach(drop => {
        if (!drop.dataset.value) allSelected = false;
        else {
            let val = JSON.parse(decodeURIComponent(drop.dataset.value));
            session[drop.dataset.category] = val;
        }
    });
    if (allSelected) {
        showSession(session);
        enableDownload(session);
    }
}

function showSession(session) {
    let html = `<h2>Your Session</h2>`;
    html += `<p><strong>Setting:</strong> ${session.setting}</p>`;
    html += `<p><strong>Hook:</strong> ${session.hook}</p>`;
    html += `<p><strong>NPC:</strong> ${session.npc.name} - ${session.npc.role}<br>Dialogue: ${session.npc.dialogue}</p>`;
    html += `<p><strong>Enemy:</strong> ${session.enemy}</p>`;
    html += `<p><strong>Difficulty:</strong> ${session.difficulty}</p>`;
    document.getElementById('finalSession').innerHTML = html;
}

function enableDownload(session) {
    document.getElementById('downloadSessionBtn').onclick = function () {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let text = `Session\nSetting: ${session.setting}\nHook: ${session.hook}\nNPC: ${session.npc.name} - ${session.npc.role}\nDialogue: ${session.npc.dialogue}\nEnemy: ${session.enemy}\nDifficulty: ${session.difficulty}`;
        const lines = doc.splitTextToSize(text, 180);
        doc.text(lines, 10, 10);
        doc.save('Session.pdf');
    };
}

// Initial render
document.getElementById('finalSession').innerHTML = '';
renderChoices();
enableDragAndDrop()