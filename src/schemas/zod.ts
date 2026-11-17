// Zod with its JIT compiler off: the extension CSP has no unsafe-eval, so Zod must not build code from strings

import { config } from 'zod';

config({ jitless: true });

export * from 'zod';
