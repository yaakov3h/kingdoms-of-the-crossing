import{performance}from'node:perf_hooks';import{createShared,applyShared}from'./server/paired';import{validateShared}from'./server/validate';
const people=[{id:'p1',name:'first',faction:'mars'},{id:'p2',name:'second',faction:'crystal'}];
const result:{name:string;samples:number;medianMs:number;p95Ms:number;maxMs:number}[]=[];
function measure(name:string,run:(i:number)=>void,n=100){const times:number[]=[];for(let i=0;i<n+10;i++){const t=performance.now();run(i);if(i>=10)times.push(performance.now()-t);}times.sort((a,b)=>a-b);result.push({name,samples:n,medianMs:+times[Math.floor(n/2)].toFixed(3),p95Ms:+times[Math.floor(n*.95)].toFixed(3),maxMs:+times[n-1].toFixed(3)});}
measure('create+validate',i=>validateShared(createShared(i,'cooperative',people)));
const base=createShared(42,'cooperative',people);measure('endTurn+validate',()=>validateShared(applyShared(base,'p1',{kind:'endTurn'})));
const battle=structuredClone(base),site=battle.sites.find(s=>s.guard===1)!;battle.players[0].pos=site.id;const started=applyShared(battle,'p1',{kind:'visit'});measure('neutral auto+validate',()=>validateShared(applyShared(started,'p1',{kind:'auto'})),40);
console.log(JSON.stringify({scope:'Local Node wall time only, not hosted CPU, free-tier fit, browser or phone performance',node:process.version,result},null,2));
