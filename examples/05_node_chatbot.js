/**
 * Example 5 — Node.js chatbot (streaming).
 *
 * Run:
 *   npm install avaniko-ai     # or `npm link ./sdk/javascript`
 *   export AVANIKO_API_KEY=ak_xxx
 *   node 05_node_chatbot.js
 */
import { configure, Conversation } from 'avaniko-ai';
import readline from 'readline/promises';

configure();   // picks up AVANIKO_API_KEY

const bot = new Conversation({
  system: "You are Avaniko's helpful assistant. Reply concisely.",
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("Avaniko Bot — type 'quit' to exit\n");
while (true) {
  const userInput = (await rl.question('You: ')).trim();
  if (['quit', 'exit', 'bye'].includes(userInput.toLowerCase())) break;
  if (!userInput) continue;

  process.stdout.write('Bot: ');
  for await (const piece of bot.streamSay(userInput)) {
    process.stdout.write(piece);
  }
  console.log();
}
rl.close();
