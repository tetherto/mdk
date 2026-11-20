#!/usr/bin/env node
import { buildProgram } from './program.js';
import { failureText } from './lib/flags.js';

const program = buildProgram();

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = failureText(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
