import { Store, Drive, createHandler } from './core.js';
const env = Deno.env.toObject();
const handler = createHandler({
  store: new Store(env),
  drive: new Drive(env.GOOGLE_SERVICE_ACCOUNT_JSON, env.GOOGLE_DRIVE_PARENT_ID || '0AHwV0eI44SAaUk9PVA'),
});
Deno.serve(handler);
