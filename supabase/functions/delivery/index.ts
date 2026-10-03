import { Store, Drive, Calendar, createHandler } from './core.js';
const env = Deno.env.toObject();
const handler = createHandler({
  store: new Store(env),
  calendar: new Calendar(env),
  drive: new Drive(env.GOOGLE_SERVICE_ACCOUNT_JSON, env.GOOGLE_DRIVE_PARENT_ID || '0AHwV0eI44SAaUk9PVA'),
  // Google Drive folder that is the public portfolio; its subfolders are categories.
  portfolioFolder: env.PORTFOLIO_FOLDER_ID || '1EQPwt4TABYTBQp2GxlneR3mBHfN2dupn',
});
Deno.serve(handler);
