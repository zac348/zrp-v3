import { defineConfig } from 'astro/config';

// The portfolio at zrphotos.net. Styles, fonts and the appearance switch are
// shared with ZR Photos one folder up (../src/styles and ../src/shared), so the
// two sites cannot drift apart.
export default defineConfig({
  output: 'static',
  site: 'https://zrphotos.net',
  vite: { server: { fs: { allow: ['..'] } } },
});
