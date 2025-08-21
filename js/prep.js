var sessionData = {
    title: "Session One",
    setting: "urban",
    hook: "The city is alive with activity.",
    npcs: [
        {
            name: "Guard",
            role: "Protector of the city",
            dialogue: "Halt! Who goes there?"
        },
        {
            name: "Merchant",
            role: "Seller of goods",
            dialogue: "Looking for something special?"
        }
    ],
    combat: {
        enemy: "Goblin",
        difficulty: "Easy"
    }
};
document.write('<h2>' + sessionData.title + '</h2>');
document.write('<p><strong>Setting:</strong> ' + sessionData.setting + '</p>');
document.write('<p><strong>Hook:</strong> ' + sessionData.hook + '</p>');
document.write('<h3>NPCs:</h3>');
document.write('<ul>');
for (var i = 0; i < sessionData.npcs.length; i++) {
    document.write('<li><strong>' + sessionData.npcs[i].name + '</strong> (' + sessionData.npcs[i].role + '): ' + sessionData.npcs[i].dialogue + '</li>');
}
document.write('</ul>');
document.write('<h3>Combat Encounter:</h3>');
document.write('<p><strong>Enemy:</strong> ' + sessionData.combat.enemy + '</p>');
document.write('<p><strong>Difficulty:</strong> ' + sessionData.combat.difficulty + '</p>');
