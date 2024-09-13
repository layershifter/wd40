import type { Program } from 'estree';
import { parseAsync } from 'oxc-parser';

export async function parseProgram(
  sourceFilename: string,
  source: string
): Promise<Program> {
  const result = await parseAsync(source, {
    sourceType: 'module',
    sourceFilename,
  });

  if (result.errors.length > 0) {
    throw new Error('Error parsing program');
  }

  return JSON.parse(result.program) as Program;
}
