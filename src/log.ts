import type { OnLog } from './types';

/** JSON.stringify nhưng che mọi trường `token`, kể cả lồng sâu. */
export const redact = (value: unknown) =>
  JSON.stringify(value, (key, v) => (key === 'token' ? '***' : v));

/** Log mặc định: in ra console với prefix [tag], token bị che. */
export const consoleLog: OnLog = (tag, level, ...args) =>
  console[level](
    `[${tag}]`,
    ...args.map(a => (typeof a === 'string' ? a : redact(a))),
  );
