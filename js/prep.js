
const settings = ["urban", "forest", "dungeon"];
const difficulties = ["Easy", "Medium", "Hard"];

// Cached monsters data
let monstersData = null;

// Load monsters from JSON file
async function loadMonsters() {
    if (monstersData) return monstersData;
    
    try {
        const response = await fetch('/InkFiles/srd_5e_monsters.json');
        monstersData = await response.json();
        return monstersData;
    } catch (error) {
        console.error('Failed to load monsters:', error);
        // Fallback monsters if JSON fails to load
        return [
            { name: "Goblin", difficulty: "Easy" },
            { name: "Orc", difficulty: "Medium" },
            { name: "Dragon", difficulty: "Hard" }
        ];
    }
}

// Get monsters appropriate for the difficulty level
function getMonstersByDifficulty(monsters, difficulty) {
    // Prefer using Challenge Rating (CR) when present in the JSON.
    // CR in the SRD file looks like: "1/4 (50 XP)" or "10 (5,900 XP)".
    function parseCR(monster) {
        const raw = monster['Challenge'] || monster['CR'] || '';
        if (!raw) return null;
        // Extract the leading part before space or parentheses
        const m = raw.match(/^([^\s(]+)/);
        if (!m) return null;
        const cr = m[1];
        // Handle fractional CR like "1/2", "1/4"
        if (cr.includes('/')) {
            const [num, den] = cr.split('/').map(Number);
            if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
            return null;
        }
        const n = Number(cr);
        return isNaN(n) ? null : n;
    }

    // Map CR to difficulty buckets. Tunable if you'd like different thresholds.
    const buckets = {
        'Easy': (cr) => cr !== null && cr <= 1,
        'Medium': (cr) => cr !== null && cr > 1 && cr <= 8,
        'Hard': (cr) => cr !== null && cr > 8
    };

    const predicate = buckets[difficulty];
    if (!predicate) return monsters;

    // First try CR-based filtering
    const byCR = monsters.filter(m => {
        const cr = parseCR(m);
        return predicate(cr);
    });
    if (byCR.length > 0) return byCR;

    // Fallback: use HP-based heuristic if CR isn't available
    const difficultyRanges = {
        'Easy': { min: 0, max: 50 },
        'Medium': { min: 51, max: 100 },
        'Hard': { min: 101, max: Infinity }
    };
    const range = difficultyRanges[difficulty];
    return monsters.filter(monster => {
        const hpMatch = monster['Hit Points']?.match(/(\d+)/);
        const hp = hpMatch ? parseInt(hpMatch[1]) : 0;
        return hp >= range.min && hp <= range.max;
    });
}
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

async function renderChoices() {
    // Generate two options for each category
    const settingChoices = getTwoRandom(settings);
    const difficultyChoices = getTwoRandom(difficulties);
    const npcChoices = getTwoRandomNPCs();
    const hookChoices = getTwoRandomHooks(settingChoices[0]); // Use first setting for hooks

    // Load and filter monsters based on random difficulty
    const monsters = await loadMonsters();
    const randomDifficulty = difficultyChoices[Math.floor(Math.random() * difficultyChoices.length)];
    const difficultySuitableMonsters = getMonstersByDifficulty(monsters, randomDifficulty);

    // Build a list of candidate names (filter out undefined names)
    let candidateNames = difficultySuitableMonsters.map(m => m && m.name).filter(Boolean);

    // If we don't have enough candidates for this difficulty, fall back to the full monster list
    if (candidateNames.length < 2) {
        const allNames = monsters.map(m => m && m.name).filter(Boolean);
        // Merge unique names, preferring difficulty candidates first
        const nameSet = new Set(candidateNames);
        for (const n of allNames) {
            if (nameSet.size >= 2) break;
            if (!nameSet.has(n)) nameSet.add(n);
        }
        candidateNames = Array.from(nameSet);
    }

    // Ensure we have at least two names (duplicate if only one available)
    if (candidateNames.length === 0) candidateNames = ["Goblin", "Orc"];
    if (candidateNames.length === 1) candidateNames.push(candidateNames[0]);

    const enemyChoices = getTwoRandom(candidateNames);

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

// Only initialize the generator if we're on the generator page
async function init() {
    // Check if we're on the generator page by looking for necessary elements
    if (document.getElementById('sessionOutput')) {
        document.getElementById('finalSession').innerHTML = '';
        await renderChoices();
        enableDragAndDrop();
    }
}

init();