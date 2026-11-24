import{createCampaign,apply,active,buildings,worldNeighbors,worldSize,Game,distance}from'./src/engine';
import{rosters}from'./src/roster';import{validateGame,exportSave,importSave}from'./src/storage';import assert from'node:assert/strict';
for(const f of Object.keys(rosters))for(const seed of[71,523]){
 let g=createCampaign(seed,f,24,1),commands=0;
 const act=(a:any)=>{g=apply(g,a);commands++;validateGame(g);if(commands%30===0)g=importSave(exportSave({id:'run',profile:'test',name:'run',updated:1,game:g}),'test').game;};
 const day=()=>{act({kind:'endDay'});if(g.battle)act({kind:'auto'});assert.ok(!g.lost)};
 const afford=(c:number[])=>{let i=0;while((g.gold<c[0]||g.ore<c[1]||g.crystal<c[2])&&i++<180){if(g.crystal<c[2]&&g.gold>=6&&active(g).ap)act({kind:'trade',unit:'crystal'});else day();}assert.ok(i<180);if(!active(g).ap)day();};
 for(const key of ['barracks','workshop','sanctuary','observatory']){afford(buildings[key].cost[0]);if(g.builtDay===g.day)day();act({kind:'build',unit:key});}
 afford([10,5,2]);if(g.builtDay===g.day)day();act({kind:'upgrade'});afford(buildings.barracks.cost[1]);if(g.builtDay===g.day)day();act({kind:'build',unit:'barracks'});
 afford([18,4,2]);act({kind:'hireHero'});for(const u of g.army.slice(1))act({kind:'transfer',hero:'hero-1',unit:u.id});
 for(const k of[7,6,3,5,2]){const d=rosters[f][k];afford([d.gold,d.ore,d.crystal]);while(!g.recruitmentStock![k])day();act({kind:'recruit',unitKind:k});}
 const target=g.rivals[0].capital;let steps=0;
 while(!g.finished&&steps++<220){if(g.battle){act({kind:'auto'});continue;}if(g.pos===0&&steps>1)break;
 const ns=worldNeighbors(g.pos,worldSize(g)).sort((a,b)=>distance(a,target,worldSize(g))-distance(b,target,worldSize(g)));const next=ns[0];try{act({kind:'move',target:next});}catch(e){if(String(e).includes('נקודות')||!active(g).ap)day();else throw e;}}
 console.log(f,seed,'day',g.day,'commands',commands,'finished',g.finished,'pos',g.pos,'army',g.army.map(u=>u.hp));assert.equal(g.finished,true);
}
