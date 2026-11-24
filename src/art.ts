export const assetUrl=(name:string)=>(window as any).__KINGDOM_ART__?.[name]||'/art/'+name+'.webp';
const armies: Record<string, string> = { mars: 'mars', crystal: 'crystal-army', tide: 'tide', grove: 'grove' };
export function art(f: string, k: number) { return ['mars','crystal','grove','tide'].includes(f)&&k>=0&&k<8 ? 'troop-'+f+'-'+k : armies[f]||'mars'; }
export const img = (name: string, alt = '') => { const e = document.createElement('img'); e.src = assetUrl(name); e.alt = alt; e.draggable = false; return e; };
