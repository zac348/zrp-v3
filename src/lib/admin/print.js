export function setupPrint() {
// ── ENVELOPE GENERATOR ──
const envCanvas = document.getElementById('env-canvas');

  const envCtx = envCanvas.getContext('2d');
  envCanvas.width  = 1800;
  envCanvas.height = 1200;

  function renderEnv() {
    const isDark  = document.getElementById('env-style')?.value === 'dark';
    const client  = document.getElementById('env-client')?.value || '';
    const msg     = document.getElementById('env-msg')?.value || '';
    const bg    = isDark ? '#202020' : '#f8f8f8';
    const ink   = isDark ? '#f8f8f8' : '#202020';
    const text2 = isDark ? '#b8b8b8' : '#5e5e5e';
    const text3 = isDark ? '#b8b8b8' : '#5e5e5e';
    const bdr   = isDark ? '#505050' : '#d4d4d4';

    envCtx.clearRect(0,0,envCanvas.width,envCanvas.height);
    envCtx.fillStyle = bg; envCtx.fillRect(0,0,envCanvas.width,envCanvas.height);
    envCtx.strokeStyle = bdr; envCtx.lineWidth = 2; envCtx.strokeRect(1,1,envCanvas.width-2,envCanvas.height-2);
    envCtx.fillStyle = ink; envCtx.fillRect(0,0,8,envCanvas.height);

    envCtx.fillStyle = text3; envCtx.font = '600 28px "Public Sans"'; envCtx.letterSpacing='6px';
    envCtx.fillText('ZACHARY ROUTSONG PHOTOGRAPHY', 60, 75); envCtx.letterSpacing='0px';
    envCtx.fillStyle = bdr; envCtx.fillRect(60,95,envCanvas.width-120,1);

    if (client) { envCtx.fillStyle=text2; envCtx.font='400 36px "Public Sans"'; envCtx.fillText('For: '+client, 60, 185); }

    envCtx.fillStyle=text3; envCtx.font='400 28px "Public Sans"'; envCtx.letterSpacing='3px';
    envCtx.fillText('PRIVATE GALLERY', 60, client?280:240); envCtx.letterSpacing='0px';

    envCtx.fillStyle=ink; envCtx.font='400 120px "Bodoni Moda"';
    envCtx.fillText('Your photos', 60, client?440:400);
    envCtx.fillText('are ready.', 60, client?580:540);

    if (msg) { envCtx.fillStyle=text2; envCtx.font='400 30px "Public Sans"'; envCtx.fillText(msg, 60, 700); }

    envCtx.fillStyle=bdr; envCtx.fillRect(60,1100,envCanvas.width-120,1);
    envCtx.fillStyle=text3; envCtx.font='400 26px "Public Sans"'; envCtx.letterSpacing='1px';
    envCtx.fillText('229-300-1006', 60, 1155); envCtx.letterSpacing='0px';
    envCtx.textAlign='right';
    envCtx.fillText('zacharyroutsongphotos', envCanvas.width-60, 1155);
    envCtx.textAlign='left';
  }

  document.fonts.ready.then(renderEnv);

  async function downloadEnv() {
    await document.fonts.ready;
    renderEnv();
    const a = document.createElement('a'); a.download='envelope.png'; a.href=envCanvas.toDataURL('image/png'); a.click();
  }


return {render:renderEnv,actions:{renderEnv,downloadEnv}};
}
