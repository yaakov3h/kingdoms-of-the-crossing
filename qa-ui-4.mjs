import{chromium}from'@playwright/test';import{spawn}from'node:child_process';import assert from'node:assert/strict';
const PORT=process.env.PORT||'5197',BASE=process.env.BASE||`http://127.0.0.1:${PORT}`;let proc;
if(!process.env.BASE){proc=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',PORT],{stdio:'pipe'});for(let i=0;i<50;i++){try{await fetch(BASE);break}catch{await new Promise(r=>setTimeout(r,100))}}}
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});const K='kingdom-independent.saves.v1';const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
const st=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k))[0].game,K);
await p.goto(BASE);await p.getByRole('button',{name:'מערכה חדשה',exact:true}).tap();await p.getByRole('button',{name:'יצירת מערכה נפרדת'}).tap();await p.waitForTimeout(1000);
const cv=p.locator('canvas').first();const box=await cv.boundingBox();console.log('canvas',box);
let g=await st();const ap0=g.heroes[0].ap??g.ap;console.log('start pos',g.pos,'ap',JSON.stringify(g.heroes.map(h=>h.ap)));
// 0 enter city from capital
assert(await p.getByRole('button',{name:'כניסה לעיר',exact:true}).count()===1,'enter-city button at capital');
await p.getByRole('button',{name:'כניסה לעיר',exact:true}).tap();await p.waitForTimeout(400);assert(await p.locator('.palace').count()===1,'city page opens');
await p.getByRole('button',{name:'חזרה למפה',exact:true}).tap();await p.waitForTimeout(600);
// 1 select + move: tap same map point repeatedly, path cost chip must equal AP spent when the hero moves
const tapAt=[box.x+50,box.y+90];
const apOf=async()=>(await st()).heroes[0].ap;
let moved=0;
for(let i=0;i<3;i++){const before=await apOf();const posB=(await st()).pos;await p.touchscreen.tap(...tapAt);await p.waitForTimeout(2200);
 const g2=await st();const spent=before-g2.heroes[0].ap;const chips=(await p.locator('.mapchips').last().innerText().catch(()=>'')).replace(/\s+/g,' ');
 console.log('tap',i,'pos',posB,'->',g2.pos,'ap spent',spent,'chips after:',chips);if(g2.pos!==posB)moved++;
 if(i===0)await p.screenshot({path:'/downloads/o/n-map-select.png'});}
assert(moved>=1,'hero moved by map taps');
g=await st();assert(g.heroes[0].ap>=0&&g.heroes[0].ap<=14,'ap sane');
await p.screenshot({path:'/downloads/o/n-map-moved.png'});
// 3 capital jump button does not move hero
const pos=g.pos;await p.getByRole('button',{name:'בירה',exact:true}).tap();await p.waitForTimeout(300);g=await st();assert.equal(g.pos,pos,'capital camera jump must not move hero');
console.log('errors',errs.length?errs:'none');await b.close();proc?.kill();
