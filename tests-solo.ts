import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildings, createCampaign, apply, active, movementCost, routeTo, routeCost, worldNeighbors } from './src/engine';
import { validateGame, exportSave, importSave } from './src/storage';
import { landscape } from './src/catalog';
const legacy = JSON.parse(readFileSync('test-fixtures/legacy-v6.json','utf8'));
assert.deepEqual(importSave(exportSave(legacy),'test').game, validateGame(legacy.game));
assert.equal(validateGame(legacy.game).heroes[0].maxAp,3);
for (const size of [24,32] as const) for (const faction of ['mars','crystal','tide','grove']) for(let seed=1;seed<=20;seed++) {
 const g=createCampaign(seed,faction,size); validateGame(g);
 assert.deepEqual(g.terrain,landscape(seed,size).terrain); assert.equal(g.terrain.length,size*size);
 const path=routeTo(g,size+1); assert.ok(path.length); assert.ok(routeCost(g,path)<=7);
 const next=path[0], cost=movementCost(g,g.pos,next); const moved=apply(g,{kind:'move',target:next});
 assert.equal(active(moved).ap,14-cost); assert.equal(moved.pos,next); validateGame(moved);
 assert.equal(active(apply(moved,{kind:'endDay'})).ap,14);
 const save={...legacy,game:moved};assert.deepEqual(importSave(exportSave(save),'a').game,validateGame(moved));
 assert.equal(worldNeighbors(0,size).length,3);assert.equal(worldNeighbors(size+1,size).length,8);
}
const g=createCampaign(16); g.terrain[1]=2; g.roads=[]; active(g).ap=2;
assert.throws(()=>apply(g,{kind:'move',target:1}),/נקודות תנועה/);assert.equal(g.pos,0);assert.equal(active(g).ap,2);
assert.throws(()=>apply(g,{kind:'move',target:23}));
console.log('PASS 160 large-world seeds/factions/save roundtrips, legacy AP preserved, weighted diagonal movement, AP cost and rollback');
import {rosters}from'./src/roster';
for(const f of ['mars','crystal','tide','grove']){
 let town=createCampaign(55,f);town.gold=500;town.ore=500;town.crystal=500;
 assert.throws(()=>apply(town,{kind:'build',unit:'observatory'}),/מבנה נדרש/);
 town=apply(town,{kind:'build',unit:'barracks'});assert.throws(()=>apply(town,{kind:'build',unit:'workshop'}),/אחד ביום/);
 town=apply(town,{kind:'endDay'});town=apply(town,{kind:'build',unit:'workshop'});
 town=apply(town,{kind:'endDay'});town=apply(town,{kind:'build',unit:'sanctuary'});
 town=apply(town,{kind:'endDay'});town=apply(town,{kind:'build',unit:'observatory'});
 town=apply(town,{kind:'endDay'});town=apply(town,{kind:'upgrade'});
 town=apply(town,{kind:'endDay'});town=apply(town,{kind:'build',unit:'barracks'});
 for(let k=3;k<=7;k++){
  const fixture=structuredClone(town);fixture.army=fixture.army.slice(0,3);fixture.heroes[0].army=fixture.army;
  const old=fixture.recruitmentStock![k],next=apply(fixture,{kind:'recruit',unitKind:k});
  assert.equal(next.army.at(-1)!.name,rosters[f][k].name);assert.equal(next.recruitmentStock![k],old-1);validateGame(next);
 }
 const exhausted=structuredClone(town);exhausted.recruitmentStock![0]=0;assert.throws(()=>apply(exhausted,{kind:'recruit',unitKind:0}),/המלאי אזל/);
 let week=structuredClone(town);while(week.day<8)week=apply(week,{kind:'endDay'});assert.ok(week.recruitmentStock![0]>town.recruitmentStock![0]);
 const imported=importSave(exportSave({...legacy,game:week}),'test');validateGame(imported.game);
}
console.log('PASS four faction town chains, one-build/day, level prerequisite, 20 advanced recruitment cases, stock exhaustion/week growth and save reload');
// A town can progress from its actual opening budget and daily economy, without injected resources.
for(const f of Object.keys(rosters)){
 let g=createCampaign(120,f,24,1);
 const waitFor=(cost:number[])=>{let safety=0;while((g.gold<cost[0]||g.ore<cost[1]||g.crystal<cost[2])&&safety++<160){
  if(g.crystal<cost[2]&&g.gold>=6&&active(g).ap>0)g=apply(g,{kind:'trade',unit:'crystal'});
  else g=apply(g,{kind:'endDay'});
 }assert.ok(safety<160);};
 for(const key of ['barracks','workshop','sanctuary','observatory']){
  const costs=key==='barracks'?[8,4,0]:key==='workshop'?[10,5,0]:key==='sanctuary'?[8,2,3]:[12,4,4];
  // Read the actual catalog, so this tests reachability rather than duplicating the costs.
  waitFor(buildings[key].cost[g.buildings[key]]);if(g.builtDay===g.day)g=apply(g,{kind:'endDay'});g=apply(g,{kind:'build',unit:key});validateGame(g);
 }
 assert.ok(g.day<100);assert.equal(g.buildings.observatory,1);
}
console.log('PASS all four towns naturally reach observatory from real opening resources and daily income/trade');
import {ability,campaignUnit}from'./src/engine';
for(const f of Object.keys(rosters))for(let k=0;k<8;k++){
 let g=createCampaign(220,f),u=campaignUnit(g,k,'test-unit');u.hp=Math.max(1,u.max-5);u.pos=12;
 const e={...campaignUnit({...g,faction:f==='mars'?'crystal':'mars'},6,'enemy'),side:1,pos:13,hp:100,max:100,damage:1};
 g.army=[u];active(g).army=g.army;g.battle={site:2,units:[u,e],selected:u.id,round:1};
 const d=ability(g,u);assert.ok(d);const next=apply(g,{kind:'ability',unit:u.id,enemy:e.id});assert.equal(next.battle!.units[0].used,true);validateGame(next);assert.throws(()=>apply(next,{kind:'ability',unit:u.id,enemy:e.id}),/היכולת לא זמינה/);
 const save=importSave(exportSave({...legacy,game:next}),'test');assert.equal(save.game.battle!.units[0].used,true);
}
console.log('PASS all32troop abilities, single-use enforcement and in-battle save reload');
for(const f of Object.keys(rosters))for(const item of ['lens','shield','coil']){
 let g=createCampaign(843,f);g.gold=80;g.ore=30;g.crystal=20;g.relics=[item];
 g=apply(g,{kind:'hireHero'});const otherBefore=structuredClone(g.heroes[1]);g=apply(g,{kind:'equip',unit:item});
 const original=structuredClone(g.army);for(let repeat=0;repeat<3;repeat++){
  const site=g.sites.find(s=>s.guard===1&&s.type!=='gate')!;g.pos=site.id;active(g).pos=site.id;active(g).ap=14;g=apply(g,{kind:'visit'});
  const unit=g.battle!.units.find(u=>u.side===0&&u.kind===2)!;assert.equal(unit.range,original[2].range+(item==='lens'?1:0));assert.equal(unit.damage,original[2].damage+(item==='coil'?1:0));
  g=apply(g,{kind:'retreat'});assert.deepEqual(g.army.map(u=>[u.damage,u.range]),original.map(u=>[u.damage,u.range]));assert.deepEqual(g.heroes[1],otherBefore);validateGame(g);
 }
 const h0=active(g);h0.xp=45;h0.rank=3;g=apply(g,{kind:'talent',unit:'attack'});g=apply(g,{kind:'talent',unit:'defense'});assert.equal(active(g).attack,1);assert.equal(active(g).defense,1);assert.throws(()=>apply(g,{kind:'talent',unit:'attack'}),/נקודת דרגה/);
 const ap=active(g).ap;g=apply(g,{kind:'selectHero',hero:'hero-1'});assert.equal(active(g).maxAp,18);assert.equal(g.heroes[0].ap,ap);g=apply(g,{kind:'endDay'});assert.equal(g.heroes[0].ap,14);assert.equal(g.heroes[1].ap,18);validateGame(g);
}
console.log('PASS12faction/equipment combinations with3retreats each, no stat accumulation or inactive army changes, talents and separate AP');

// Enemy cells block passage and accept attacks from every neighboring direction.
for(const size of [24,32] as const)for(const f of Object.keys(rosters)){
 for(const [dx,dy]of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]){
  const g=createCampaign(122,f,size,1),target=10*size+10;g.rivals[0].capital=target;g.rivals[0].pos=target;
  g.pos=(10+dy)*size+10+dx;active(g).pos=g.pos;active(g).ap=1;
  const next=apply(g,{kind:'move',target});assert.ok(next.battle?.siege);assert.equal(next.pos,g.pos);assert.equal(active(next).ap,1);validateGame(next);
 }
 const g=createCampaign(123,f,size,1);g.rivals[0].pos=0;g.rivals[0].capital=0;g.rivals[0].army=[...g.rivals[0].army,g.rivals[0].army[0]].map((u,i)=>({...u,id:'siege-'+i}));g.rivals[0].siegeDays=3;g.rivals[0].cooldown=0;g.day=181*size/10+1;g.day=Math.ceil(g.day);if(g.day%2!==0)g.day++;g.heroes[0].army=[];g.army=[];
 const lost=apply(g,{kind:'endDay'});assert.equal(lost.lost,true);validateGame(lost);assert.throws(()=>apply(lost,{kind:'move',target:1}));
}
console.log('PASS 64 adjacent city attacks across factions/world sizes, no entry/AP overspend, defeat is persistent and blocks further actions');
