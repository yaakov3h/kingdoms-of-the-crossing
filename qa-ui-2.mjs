import{chromium}from'@playwright/test';import{spawn}from'node:child_process';import assert from'node:assert/strict';import fs from'node:fs';
const proc=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5194'],{stdio:'pipe'});
for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:5194');break}catch{await new Promise(r=>setTimeout(r,100))}}
const b=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const K='kingdom-independent.saves.v1';const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
const st=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k))[0].game,K);const nav=n=>p.getByRole('navigation').getByRole('button',{name:n,exact:true}).tap();
await p.goto('http://127.0.0.1:5194');await p.getByRole('button',{name:'מערכה חדשה',exact:true}).tap();await p.getByRole('button',{name:'יצירת מערכה נפרדת'}).tap();await p.waitForTimeout(600);
await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));const g=s[0].game;g.gold=200;g.ore=60;g.crystal=30;localStorage.setItem(k,JSON.stringify(s));},K);
await p.reload();await p.getByRole('button',{name:'פתיחה',exact:true}).tap();await p.waitForTimeout(400);await nav('עיר');
// silo then reload persistence
await p.locator('.hit-silo').tap();await p.locator('.primary').tap();await p.waitForTimeout(200);await p.locator('.sheetx').tap();
await p.reload();await p.getByRole('button',{name:'פתיחה',exact:true}).tap();await p.waitForTimeout(400);await nav('עיר');
console.log('silo badge after reload:',await p.locator('.hit-silo').innerText(),'| state silo',(await st()).silo);
// hire hero, fill army, transfer
await p.locator('.palace').tap();await p.getByRole('button',{name:/גיבור נוסף/}).tap();await p.waitForTimeout(250);await p.locator('.sheetx').tap();
await nav('מפקד');await p.waitForTimeout(300);
let g=await st();const before=[g.heroes[0].army.length,g.heroes[1].army.length];console.log('armies before',before,'active',g.activeHero);
await p.locator('.utile').first().tap();await p.waitForTimeout(200);await p.getByRole('button',{name:'אישור',exact:true}).tap();await p.waitForTimeout(300);
g=await st();console.log('armies after',[g.heroes[0].army.length,g.heroes[1].army.length]);
assert.equal(g.heroes[1].army.length,before[1]+1);
await p.screenshot({path:'/downloads/o/t-transfer.png'});await nav('עיר');await p.waitForTimeout(300);await p.screenshot({path:'/downloads/o/n-city-badges.png'});
// legacy
const fx=JSON.parse(fs.readFileSync('test-fixtures/legacy-v6.json','utf8'));fx.profile='שחקן 1';
await p.evaluate(([k,f])=>localStorage.setItem(k,JSON.stringify([f])),[K,fx]);await p.reload();await p.getByRole('button',{name:'פתיחה',exact:true}).tap();await p.waitForTimeout(500);await nav('עיר');await p.waitForTimeout(300);
await p.screenshot({path:'/downloads/o/t-legacy-city.png'});console.log('legacy rev',(await st()).rulesRevision);
for(const n of ['מפקד','צבא','כלכלה'])await nav(n),await p.waitForTimeout(250);
console.log('errors',errs.length?errs:'none');await b.close();proc.kill();
