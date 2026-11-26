import{chromium}from'@playwright/test';import{spawn}from'node:child_process';import assert from'node:assert/strict';
const PORT=process.env.PORT||'5198',BASE=process.env.BASE||`http://127.0.0.1:${PORT}`;let proc;
if(!process.env.BASE){proc=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',PORT],{stdio:'pipe'});for(let i=0;i<50;i++){try{await fetch(BASE);break}catch{await new Promise(r=>setTimeout(r,100))}}}
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});const K='kingdom-independent.saves.v1';const errs=[];
for(const f of (process.env.FACTIONS||'mars,crystal,tide,grove').split(',')){
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();p.on('pageerror',e=>errs.push(f+': '+e.message));
 const st=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k))[0].game,K);const nav=n=>p.getByRole('navigation').getByRole('button',{name:n,exact:true}).tap();
 await p.goto(BASE);await p.getByRole('button',{name:'מערכה חדשה',exact:true}).tap();await p.locator(`[data-faction=${f}]`).tap();await p.getByRole('button',{name:'יצירת מערכה נפרדת'}).tap();await p.waitForTimeout(700);
 await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));const g=s[0].game;g.gold=400;g.ore=80;g.crystal=40;localStorage.setItem(k,JSON.stringify(s));},K);
 await p.reload();await p.getByRole('button',{name:'פתיחה',exact:true}).tap();await p.waitForTimeout(400);await nav('עיר');
 let g=await st();assert.equal(g.faction,f);const a0=g.army.length,gold0=g.gold;
 await p.locator('.utile').first().tap();await p.getByRole('button',{name:'מקס'}).tap();await p.locator('.primary').tap();await p.waitForTimeout(400);
 g=await st();assert(g.army.length<=6&&g.gold<=gold0);const spent=gold0-g.gold;
 await p.locator('.hit-silo').tap();await p.locator('.primary').tap();await p.waitForTimeout(300);await p.locator('.sheetx').tap().catch(()=>{});
 g=await st();const silo=g.silo||0;
 await nav('מפה');await p.getByRole('button',{name:'סיום יום',exact:true}).tap();await p.getByRole('button',{name:'אישור',exact:true}).tap();await p.waitForTimeout(700);
 const g2=await st();console.log('dialog:',(await p.locator('dialog[open]').innerText().catch(()=>'none')).replace(/\s+/g,' ').slice(0,200));await nav('עיר');
 await p.locator('.hit-barracks').tap();console.log('barracks sheet:',(await p.locator('.sheetbox').innerText()).replace(/\s+/g,' ').slice(0,200),await p.locator('.primary').isDisabled());await p.locator('.primary').tap({timeout:3000}).catch(()=>{});await p.waitForTimeout(300);await p.locator('.sheetx').tap().catch(()=>{});
 assert((await st()).buildings.barracks>=1,'barracks built next day');
 for(const n of ['עיר','מפקד','צבא','כלכלה'])await nav(n),await p.waitForTimeout(250);
 await p.screenshot({path:`/downloads/o/n-f-${f}.png`});
 const over=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 console.log(f,'army',a0,'->',g.army.length,'gold spent',spent,'silo',silo,'day',g.day,'->',g2.day,'overflowX',over);
 assert.equal(g2.day,g.day+1);assert.equal(silo,1);assert(!over);
 await ctx.close();}
console.log('errors',errs.length?errs:'none');await b.close();proc?.kill();process.exit(errs.length?1:0);
