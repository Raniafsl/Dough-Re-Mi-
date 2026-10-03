// Quick tests for the bot. Run these in a SECOND terminal while `npm start` runs.
//
//   node test.js health              → is the bot connected?
//   node test.js ring                → post a broadcast in #treats
//   node test.js poll                → post a poll in #suggestions (prints its id)
//   node test.js results <messageId> → live vote counts + winner
//   node test.js end <messageId>     → close the poll now + final winner

import 'dotenv/config';

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const [command, messageId] = process.argv.slice(2);

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function needId() {
  if (!messageId) {
    console.log('Add the poll id, e.g.  node test.js results 1234567890');
    process.exit(1);
  }
}

function showPoll(r) {
  if (!r.ok) return console.log('❌', r.error);
  console.log(`\n📊 ${r.question}${r.finished ? '  (closed)' : '  (open)'}`);
  for (const a of r.answers) {
    console.log(`   ${a.text.padEnd(20)} ${'█'.repeat(a.votes)} ${a.votes}`);
  }
  if (!r.winner) console.log('\n   No votes yet.');
  else if (r.tie) console.log(`\n   🤝 Tie between: ${r.leaders.join(', ')}`);
  else console.log(`\n   🏆 Winner: ${r.winner}`);
}

try {
  switch (command) {
    case 'health':
      console.log(await call('GET', '/health'));
      break;

    case 'ring':
      console.log(await call('POST', '/ring', {
        type: 'treats',
        text: 'Six parfaits left, half price! 🍓',
      }));
      break;

    case 'poll': {
      const r = await call('POST', '/ring', {
        type: 'poll',
        text: 'What should Grandma bake next?',
        options: ['Maple cookies', 'Apple crumble', 'Pumpkin bread'],
      });
      if (!r.ok) { console.log('❌', r.error); break; }
      console.log('✅ Poll posted in #suggestions. Go vote in Discord, then run:');
      console.log(`   node test.js results ${r.messageId}`);
      console.log(`   node test.js end ${r.messageId}`);
      break;
    }

    case 'results':
      needId();
      showPoll(await call('GET', `/polls/${messageId}`));
      break;

    case 'end':
      needId();
      showPoll(await call('POST', `/polls/${messageId}/end`));
      break;

    default:
      console.log('Usage: node test.js health | ring | poll | results <id> | end <id>');
  }
} catch (err) {
  console.log('❌ Could not reach the bot. Is `npm start` running in another terminal?');
}
