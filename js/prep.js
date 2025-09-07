const settings = ["urban", "forest", "dungeon"];
const enemies = ["Goblin", "Orc", "Dragon"];
const difficulties = ["Easy", "Medium", "Hard"];

function myFunction() {
  alert("You clicked the coffee cup!");
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateSession() {
    const session = {
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
    return session;
}

function outputSession(session) {
    document.write('<h2>' + session.title + '</h2>');
    document.write('<p>Setting: ' + session.setting + '</p>');  
    document.write('<p>Hook: ' + session.hook + '</p>');
    document.write('<h3>NPCs:</h3>');
    session.npcs.forEach(npc => {
        document.write('<p>' + npc.name + ' - ' + npc.role + '</p>');
        document.write('<p>Dialogue: ' + npc.dialogue + '</p>');
    });
    document.write('<h3>Combat:</h3>');
    document.write('<p>Enemy: ' + session.combat.enemy + '</p>');
    document.write('<p>Difficulty: ' + session.combat.difficulty + '</p>');
}

outputSession(generateSession());
document.write('<hr>'); // Separator for clarity
