import {chromium}from'@playwright/test';import{spawn}from'node:child_process';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188'],{stdio:'pipe'});let browser;
try{for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:5188');break;}catch{await new Promise(r=>setTimeout(r,100));}}
browser=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5188');await p.getByRole('button',{name:'מערכה חדשה',exact:true}).click();await p.getByRole('button',{name:'יצירת מערכה נפרדת'}).click();await p.locator('.canvas canvas:not(.minimap)').waitFor();await p.waitForTimeout(300);
if(await p.getByRole('button',{name:'↘',exact:true}).count())throw Error('directional arrows still visible');
const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-independent.saves.v1'))[0].game);
const expected=await p.evaluate(async()=>{const{routeTo,routeCost}=await import('/src/engine.ts');const g=JSON.parse(localStorage.getItem('kingdom-independent.saves.v1'))[0].game,path=routeTo(g,50);return{path,cost:routeCost(g,path)}});
await p.locator('.canvas canvas:not(.minimap)').click({position:{x:200,y:200}});await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kingdom-independent.saves.v1'))[0].game.pos===50);await p.waitForTimeout(400);
const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-independent.saves.v1'))[0].game);if(after.heroes[0].ap!==before.heroes[0].ap-expected.cost)throw Error('not exact weighted shortest path cost');await p.screenshot({path:'/downloads/solo-route-390.png'});
await p.reload();await p.getByRole('button',{name:'פתיחה',exact:true}).click();await p.setViewportSize({width:320,height:700});await p.waitForTimeout(500);await p.screenshot({path:'/downloads/solo-travel-320.png'});
if(errors.length)throw Error(errors.join(';'));console.log('PASS map click traverses full shortest weighted route, exact AP charge, no arrows, reload320');
}finally{await browser?.close();server.kill();}
