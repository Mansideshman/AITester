import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const rl = readline.createInterface({ input: stdin, output: stdout });

export async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

/** Blocks until the user presses Enter, or returns a lowercase command word they typed. */
export async function confirm(question: string): Promise<'yes' | 'skip' | 'quit'> {
  const answer = (await ask(`${question} [Enter=yes / s=skip / q=quit] `)).toLowerCase();
  if (answer === 'q' || answer === 'quit') return 'quit';
  if (answer === 's' || answer === 'skip') return 'skip';
  return 'yes';
}

export function closePrompt() {
  rl.close();
}
