const settings = ["urban", "forest", "dungeon"];
const enemies = ["Goblin", "Orc", "Dragon"];
const difficulties = ["Easy", "Medium", "Hard"];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateSession() {
    return {
        title: "Session " + Math.floor(Math.random() * 100),
        setting: getRandomElement(settings),
        hook: "A mysterious event occurs in the " + getRandomElement(settings) + ".",
        npcs: ['Guard', 'Merchant', 'Wizard'].map(name => ({
            name: name,
            role: "Role of " + name,
            dialogue: "Dialogue from " + name
        })),
        combat: {
            enemy: getRandomElement(enemies),
            difficulty: getRandomElement(difficulties)
        }
    };
}

// General-purpose formatter
function formatSession(session, format) {
    return format(session);
}

// HTML formatter
function htmlFormatter(session) {
    let html = '';
    html += '<h2>' + session.title + '</h2>';
    html += '<p>Setting: ' + session.setting + '</p>';
    html += '<p>Hook: ' + session.hook + '</p>';
    html += '<h3>NPCs:</h3>';
    session.npcs.forEach(npc => {
        html += '<p>' + npc.name + ' - ' + npc.role + '</p>';
        html += '<p>Dialogue: ' + npc.dialogue + '</p>';
    });
    html += '<h3>Combat:</h3>';
    html += '<p>Enemy: ' + session.combat.enemy + '</p>';
    html += '<p>Difficulty: ' + session.combat.difficulty + '</p>';
    return html;
}

// Plain text formatter
function textFormatter(session) {
    let text = '';
    text += session.title + '\n';
    text += 'Setting: ' + session.setting + '\n';
    text += 'Hook: ' + session.hook + '\n';
    text += 'NPCs:\n';
    session.npcs.forEach(npc => {
        text += npc.name + ' - ' + npc.role + '\n';
        text += 'Dialogue: ' + npc.dialogue + '\n';
    });
    text += 'Combat:\n';
    text += 'Enemy: ' + session.combat.enemy + '\n';
    text += 'Difficulty: ' + session.combat.difficulty + '\n';
    return text;
}

const session = generateSession();

// Print to screen
const container = document.getElementById('sessionOutput');
if (container) {
    container.innerHTML = formatSession(session, htmlFormatter);
}

// Download PDF
document.getElementById('downloadSessionBtn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const sessionText = formatSession(session, textFormatter);
    const lines = doc.splitTextToSize(sessionText, 180);
    doc.text(lines, 10, 10);
    doc.save(session.title + '.pdf');
});