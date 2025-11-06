
const settings = ["urban", "forest", "dungeon"];
const difficulties = ["Easy", "Medium", "Hard"];

// Cached data
let monstersData = null;
let hooksData = null;

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
// Load hooks from JSON file
async function loadHooks() {
    if (hooksData) return hooksData;
    
    try {
        const response = await fetch('/InkFiles/hooks.json');
        hooksData = await response.json();
        return hooksData;
    } catch (error) {
        console.error('Failed to load hooks:', error);
        // Fallback hooks if JSON fails to load
        return {
            hooks: {
                urban: ["A mysterious event occurs in the ", "A stranger arrives in the "],
                forest: ["A mysterious event occurs in the ", "A stranger appears in the "],
                dungeon: ["A mysterious event occurs in the ", "A secret is revealed in the "]
            },
            custom_hooks: {}
        };
    }
}

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

async function getTwoRandomHooks(setting) {
    const data = await loadHooks();
    // Combine default and custom hooks for the setting
    const settingHooks = [
        ...(data.hooks[setting] || []),
        ...(data.custom_hooks[setting] || [])
    ];
    // Fallback if no hooks found for setting
    if (!settingHooks.length) {
        return ["A mysterious event occurs in", "A stranger arrives in"].map(h => h + " " + setting);
    }
    return getTwoRandom(settingHooks);
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
    const hookChoices = await getTwoRandomHooks(settingChoices[0]); // Use first setting for hooks

    // Load and filter monsters based on random difficulty
    const monsters = await loadMonsters();
    const randomDifficulty = difficultyChoices[Math.floor(Math.random() * difficultyChoices.length)];
    const difficultySuitableMonsters = getMonstersByDifficulty(monsters, randomDifficulty);

    // Build a list of candidate monster objects (filter out undefined names)
    let candidateMonsters = difficultySuitableMonsters.filter(m => m && m.name);

    // If we don't have enough candidates for this difficulty, fall back to the full monster list
    if (candidateMonsters.length < 2) {
        const allMonsters = monsters.filter(m => m && m.name);
        // Merge unique names, preferring difficulty candidates first
        const nameSet = new Set(candidateMonsters.map(m => m.name));
        for (const m of allMonsters) {
            if (nameSet.size >= 2) break;
            if (!nameSet.has(m.name)) {
                candidateMonsters.push(m);
                nameSet.add(m.name);
            }
        }
    }

    // Ensure we have at least two monsters (duplicate if only one available)
    if (candidateMonsters.length === 0) candidateMonsters = [{ name: "Goblin" }, { name: "Orc" }];
    if (candidateMonsters.length === 1) candidateMonsters.push(candidateMonsters[0]);

    const enemyChoices = getTwoRandom(candidateMonsters);

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
            // If difficulty or setting was changed, update the enemy choices
            try {
                if (this.dataset.category === 'difficulty' || this.dataset.category === 'setting') {
                    // call async updater but don't block drop handler
                    updateEnemyChoices().catch(err => console.warn('updateEnemyChoices error', err));
                }
            } catch (err) {
                console.warn(err);
            }
            checkIfAllSelected();
        });
    });
}

// Update the enemy choice options based on selected difficulty and/or setting
async function updateEnemyChoices() {
    // Read current selections from DOM
    const difficultyDrop = document.querySelector('.selected-drop[data-category="difficulty"]');
    const settingDrop = document.querySelector('.selected-drop[data-category="setting"]');
    let difficulty = null;
    let setting = null;
    try {
        if (difficultyDrop && difficultyDrop.dataset.value) {
            const val = JSON.parse(decodeURIComponent(difficultyDrop.dataset.value));
            difficulty = typeof val === 'string' ? val : (val && val.name) || null;
        }
        if (settingDrop && settingDrop.dataset.value) {
            const val = JSON.parse(decodeURIComponent(settingDrop.dataset.value));
            setting = typeof val === 'string' ? val : (val && val.name) || null;
        }
    } catch (err) {
        console.warn('Failed to read current difficulty/setting from DOM', err);
    }

    const monsters = await loadMonsters();

    // Filter by difficulty first
    let candidates = difficulty ? getMonstersByDifficulty(monsters, difficulty) : monsters.slice();

    // Further filter by setting/environment if possible
    if (setting) {
        const envKeys = ['Environment','environment','Habitat','habitat','environments','habitats'];
        candidates = candidates.filter(m => {
            for (const k of envKeys) {
                const val = m[k];
                if (!val) continue;
                const text = Array.isArray(val) ? val.join(' ').toLowerCase() : String(val).toLowerCase();
                if (text.includes(setting.toLowerCase())) return true;
            }
            return false;
        });
        // If filtering by setting removed too many, fall back to difficulty candidates
        if (candidates.length < 2) candidates = difficulty ? getMonstersByDifficulty(monsters, difficulty) : monsters.slice();
    }

    // Fallback ensure at least two
    if (!candidates || candidates.length === 0) candidates = monsters.slice();
    if (candidates.length === 1) candidates.push(candidates[0]);

    const enemyPair = getTwoRandom(candidates);

    // Update the DOM choice elements for enemy (preserve event listeners)
    const enemyRow = document.querySelector('.choice-row[data-category="enemy"]');
    if (!enemyRow) return;
    const choiceDivs = enemyRow.querySelectorAll('.choice');
    for (let i = 0; i < 2; i++) {
        const m = enemyPair[i] || { name: 'Unknown' };
        if (choiceDivs[i]) {
            choiceDivs[i].dataset.value = encodeURIComponent(JSON.stringify(m));
            choiceDivs[i].textContent = m.name || 'Unknown';
        }
    }

    // Clear previously selected enemy choice (so user must re-pick)
    const enemyDrop = document.querySelector('.selected-drop[data-category="enemy"]');
    if (enemyDrop) {
        enemyDrop.dataset.value = '';
        enemyDrop.textContent = 'Drop your choice here';
    }
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
    // Include title from input if present
    const titleInput = document.getElementById('sessionTitle');
    if (titleInput) session.title = titleInput.value.trim();
    if (allSelected) {
        showSession(session);
        enableDownload(session);
    }
}

function renderMonsterDetails(monster) {
    if (!monster) return '<div class="monster-details">No monster data available.</div>';
    // Try common image keys
    const imgKeys = ['Image', 'image', 'ImageURL', 'image_url', 'img', 'imageUrl'];
    let imgSrc = null;
    for (const k of imgKeys) {
        if (monster[k]) { imgSrc = monster[k]; break; }
    }

    let html = '<div class="monster-details" style="display:flex;gap:12px;align-items:flex-start">';
    if (imgSrc) {
        // allow relative or absolute paths
        html += `<div class="monster-image"><img src="${imgSrc}" alt="${monster.name || 'monster'}" style="max-width:200px;max-height:200px;object-fit:contain;border:1px solid #ccc;padding:4px"></div>`;
    }
    html += '<div class="monster-meta">';
    html += `<h3>${monster.name || 'Unknown Monster'}</h3>`;
    const fields = ['Challenge','CR','Armor Class','Hit Points','Speed','Senses','Languages','Actions','Special Abilities','Legendary Actions'];
    for (const f of fields) {
        if (monster[f]) {
            const val = monster[f];
            if (Array.isArray(val)) {
                html += `<p><strong>${f}:</strong></p><ul>`;
                for (const item of val) {
                    // some entries may be objects with name/desc
                    if (typeof item === 'object') html += `<li>${item.name || JSON.stringify(item)}</li>`;
                    else html += `<li>${item}</li>`;
                }
                html += '</ul>';
            } else {
                html += `<p><strong>${f}:</strong> ${val}</p>`;
            }
        }
    }
    html += '</div></div>';
    return html;
}

function showSession(session) {
    let title = session.title && session.title.length ? session.title : 'Your Session';
    let html = `<h2>${title}</h2>`;
    html += `<p><strong>Setting:</strong> ${session.setting}</p>`;
    html += `<p><strong>Hook:</strong> ${session.hook}</p>`;
    html += `<p><strong>NPC:</strong> ${session.npc.name} - ${session.npc.role}<br>Dialogue: ${session.npc.dialogue}</p>`;
    html += `<p><strong>Difficulty:</strong> ${session.difficulty}</p>`;

    html += `<h3>Enemy</h3>`;
    if (typeof session.enemy === 'object') {
        html += renderMonsterDetails(session.enemy);
    } else {
        html += `<p>${session.enemy}</p>`;
    }

    document.getElementById('finalSession').innerHTML = html;
}

function enableDownload(session) {
    document.getElementById('downloadSessionBtn').onclick = async function () {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // helper: fetch image and convert to dataURL
        async function fetchImageAsDataUrl(url) {
            try {
                const res = await fetch(url);
                if (!res.ok) return null;
                const blob = await res.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                 let binary = '';
                const chunkSize = 0x8000;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
                }
                const base64 = btoa(binary);
                const mime = blob.type || 'image/png';
                return { dataUrl: `data:${mime};base64,${base64}`, mime };
            } catch (err) {
                console.warn('Failed to fetch image for PDF:', err);
                return null;
            }
        }

        function getMonsterImageUrl(monster) {
            if (!monster) return null;
            const imgKeys = ['Image', 'image', 'ImageURL', 'image_url', 'img', 'imageUrl'];
            for (const k of imgKeys) if (monster[k]) return monster[k];
            return null;
        }

        function measureImage(dataUrl) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = function () { resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
                img.onerror = function () { resolve(null); };
                img.src = dataUrl;
            });
        }

        let cursorY = 10;

        // If enemy has image, try to embed at the top
        if (typeof session.enemy === 'object') {
            const imgUrl = getMonsterImageUrl(session.enemy);
            if (imgUrl) {
                const fetched = await fetchImageAsDataUrl(imgUrl);
                if (fetched && fetched.dataUrl) {
                    const dims = await measureImage(fetched.dataUrl);
                    if (dims) {
                        // Fit to width 180 (approx page width minus margins)
                        const maxW = 180;
                        const scale = Math.min(1, maxW / dims.w);
                        const drawW = dims.w * scale;
                        const drawH = dims.h * scale;
                        const format = fetched.mime && fetched.mime.includes('png') ? 'PNG' : 'JPEG';
                        try {
                            doc.addImage(fetched.dataUrl, format, 10, cursorY, drawW, drawH);
                            cursorY += drawH + 6; // add spacing after image
                        } catch (err) {
                            console.warn('jsPDF addImage failed:', err);
                        }
                    }
                }
            }
        }

        // Build textual content
     let lines = [];
    if (session.title && session.title.length) lines.push(`Title: ${session.title}`);
    else lines.push('Session');
        lines.push(`Setting: ${session.setting}`);
        lines.push(`Hook: ${session.hook}`);
        lines.push(`NPC: ${session.npc.name} - ${session.npc.role}`);
        lines.push(`Dialogue: ${session.npc.dialogue}`);
        lines.push(`Difficulty: ${session.difficulty}`);
        lines.push('Enemy:');
        if (typeof session.enemy === 'object') {
            const m = session.enemy;
            lines.push(`  Name: ${m.name || ''}`);
            if (m['Challenge'] || m['CR']) lines.push(`  CR: ${m['Challenge'] || m['CR']}`);
            if (m['Armor Class']) lines.push(`  Armor Class: ${m['Armor Class']}`);
            if (m['Hit Points']) lines.push(`  Hit Points: ${m['Hit Points']}`);
            if (m['Speed']) lines.push(`  Speed: ${m['Speed']}`);
            if (m['Senses']) lines.push(`  Senses: ${m['Senses']}`);
            if (m['Languages']) lines.push(`  Languages: ${m['Languages']}`);
            if (m['Actions']) {
                lines.push('  Actions:');
                if (Array.isArray(m['Actions'])) {
                    for (const a of m['Actions']) lines.push(`    - ${typeof a === 'object' ? (a.name || JSON.stringify(a)) : a}`);
                } else lines.push(`    - ${m['Actions']}`);
            }
        } else {
            lines.push(`  ${session.enemy}`);
        }

        const text = lines.join('\n');
        const wrapped = doc.splitTextToSize(text, 180);
        doc.text(wrapped, 10, cursorY || 10);
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