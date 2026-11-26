import{chromium}from'@playwright/test';import{spawn}from'node:child_process';import assert from'node:assert/strict';
const PORT=process.env.PORT||'5200',BASE=process.env.BASE||`http://127.0.0.1:${PORT}`;let proc;
if(!process.env.BASE){proc=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',PORT],{stdio:'pipe'});for(let i=0;i<50;i++){try{await fetch(BASE);break}catch{await new Promise(r=>setTimeout(r,100))}}}
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});const K='kingdom-independent.saves.v1';const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
const st=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k))[0].game,K);
async function fresh(mut,arg){await p.goto(BASE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.getByRole('button',{name:'מערכה חדשה',exact:true}).tap();await p.getByRole('button',{name:'יצירת מערכה נפרדת'}).tap();await p.waitForTimeout(800);
 await p.evaluate(([k,m,a])=>{const s=JSON.parse(localStorage.getItem(k));const g=s[0].game;new Function('g','a',m)(g,a);localStorage.setItem(k,JSON.stringify(s));},[K,mut,arg]);await p.reload();const op=p.getByRole('button',{name:'פתיחה',exact:true});if(await op.count())await op.tap({timeout:5000});await p.waitForTimeout(900);}
// A: guarded ruin -> battle -> auto-resolve from the UI
await fresh("const s=g.sites.find(x=>x.type==='ruin'&&x.guard);g.pos=s.id;g.heroes[0].pos=s.id;g.gold=200;");
let g0=await st();console.log('A start pos',g0.pos);
const fightBtn=p.getByRole('button',{name:'קרב באתר',exact:true});assert.equal(await fightBtn.count(),1,'fight-site button at guarded site');
await p.screenshot({path:'/downloads/o/n-attack-0.png'});
await fightBtn.tap();await p.waitForTimeout(1200);await p.screenshot({path:'/downloads/o/n-attack-1.png'});
const auto=p.getByRole('button',{name:'קרב אוטומטי',exact:true});assert.equal(await auto.count(),1,'battle starts with auto button');
await auto.tap();await p.getByRole('button',{name:'אישור',exact:true}).tap();await p.waitForTimeout(1200);
const g1=await st();console.log('A battle ended:',!g1.battle,'army',g0.army.length,'->',g1.army.length,'site done/owner',JSON.stringify(g1.sites.find(x=>x.id===g0.pos)).slice(0,120));assert(!g1.battle,'battle resolved');
await p.screenshot({path:'/downloads/o/n-attack-2.png'});
// B: owned special site -> recruit from the map context bar
await fresh("const s=g.sites.find(x=>x.type==='factory');s.owner=true;s.guard=0;s.done=true;g.pos=s.id;g.heroes[0].pos=s.id;g.gold=300;g.ore=60;g.crystal=40;");
await p.screenshot({path:'/downloads/o/n-recsite-0.png'});g0=await st();const rec=p.getByRole('button',{name:/^גיוס /});console.log('B recruit buttons',await rec.count());assert(await rec.count()>=1,'recruit-site button');
await p.screenshot({path:'/downloads/o/n-recsite-0.png'});
await rec.first().tap();await p.waitForTimeout(500);const g2=await st();console.log('B army',g0.army.length,'->',g2.army.length,'gold',g0.gold,'->',g2.gold,'ore',g0.ore,'->',g2.ore);
assert(g2.army.length>g0.army.length||g2.army.some((u,i)=>u.count!==g0.army[i]?.count),'recruited at site');
await p.screenshot({path:'/downloads/o/n-recsite-1.png'});
console.log('errors',errs.length?errs:'none');await b.close();proc?.kill();process.exit(errs.length?1:0);
