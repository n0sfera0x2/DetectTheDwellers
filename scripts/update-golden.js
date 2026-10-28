// Re-snapshot the print deck after an intentional card change: npm run golden
const fs = require('fs'), path = require('path');
const cards = require('../deck/skeleton')();
fs.writeFileSync(path.join(__dirname, '..', 'test', 'golden-cards.json'), JSON.stringify(cards, null, 1) + '\n');
console.log(`test/golden-cards.json updated (${cards.length} cards)`);
