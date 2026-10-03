// The public portfolio comes from the Google Drive portfolio folder. Studio
// only reads it (for counts and blog cover choices); photos are managed in Drive.
export function setupPortfolio(ctx) {
  async function load() {
    try {
      const response=await fetch('/api/portfolio',{signal:AbortSignal.timeout(20000)});
      const body=await response.json();
      if(!response.ok||!Array.isArray(body.photos))throw new Error(body.error||'The portfolio is unavailable.');
      ctx.state.portfolio=body.photos;ctx.state.portfolioError='';
    } catch(error) {
      ctx.state.portfolio=[];ctx.state.portfolioError=error.message||'The portfolio is unavailable.';
    }
  }
  return {load};
}
