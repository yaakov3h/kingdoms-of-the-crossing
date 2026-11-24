import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCampaign, apply, active, movementCost, routeTo, routeCost, worldNeighbors } from './src/engine';
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
