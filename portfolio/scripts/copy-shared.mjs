// Copies the files both sites serve from the same paths (fonts, icons, the
// portrait) out of ZR Photos' public folder. They are not committed here, so
// there is only ever one copy to update.
import { cpSync, mkdirSync } from 'node:fs';
const from = new URL('../../public/', import.meta.url), to = new URL('../public/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const item of ['fonts', 'favicon.svg', 'apple-touch-icon.png', 'zachary-800.jpg', 'zachary.jpg'])
  cpSync(new URL(item, from), new URL(item, to), { recursive: true });
