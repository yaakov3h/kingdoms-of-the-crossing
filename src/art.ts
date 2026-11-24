const armies: Record<string, string> = { mars: 'mars', crystal: 'crystal-army', tide: 'tide', grove: 'grove' };
export function art(f: string, k: number) { return ['machine', 'moth', 'manta', 'quartz', 'pyro'][k - 3] || (f === 'mars' ? (k === 0 ? 'mars-scout' : k === 2 ? 'mars-robot' : 'mars') : f === 'tide' && k === 0 ? 'tide-scout' : f === 'grove' && k !== 1 ? 'grove-scout' : armies[f]); }
export const img = (name: string, alt = '') => { const e = document.createElement('img'); e.src = '/art/' + name + '.webp'; e.alt = alt; e.draggable = false; return e; };
