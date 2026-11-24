import {chromium}from'@playwright/test';import{spawn}from'node:child_process';import fs from'node:fs';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184'],{stdio:'pipe'});let browser;
try{
 for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:5184');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5184');await page.getByRole('button',{name:'ספר המסע, יחידות וחוקים'}).click();await page.getByRole('heading',{name:'ספר המסע'}).waitFor();await page.screenshot({path:'/downloads/solo-guide-390.png'});await page.getByRole('button',{name:'לתפריט'}).click();
 await page.getByRole('button',{name:'מערכה חדשה',exact:true}).click();await page.getByLabel('גודל העולם').selectOption('32');await page.getByRole('button',{name:'יצירת מערכה נפרדת'}).click();await page.locator('.canvas canvas:not(.minimap)').waitFor();await page.waitForTimeout(600);
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-independent.saves.v1'))[0]);if(state.game.terrain.length!==1024||state.game.heroes[0].ap!==14)throw Error('wrong new world');
 for(let d=0;d<2;d++){await page.getByRole('button',{name:'סיום יום',exact:true}).click();await page.getByRole('button',{name:'אישור',exact:true}).click();}
 await page.getByRole('navigation').getByRole('button',{name:'עיר',exact:true}).click();await page.screenshot({path:'/downloads/solo-town-390.png'});
 await page.getByRole('button',{name:'בנייה ·12 זהב · 5 עפרות · 0 גבישים',exact:true}).click();await page.screenshot({path:'/downloads/solo-town-built-390.png'});
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('kingdom-independent.saves.v1'))[0]);if(state.game.buildings.barracks!==1||state.game.builtDay!==3)throw Error('build not saved');
 await page.reload();await page.getByRole('button',{name:'פתיחה',exact:true}).click();await page.getByRole('navigation').getByRole('button',{name:'מפה',exact:true}).click();await page.waitForTimeout(400);await page.screenshot({path:'/downloads/solo-map-390.png'});
 await page.setViewportSize({width:320,height:700});await page.getByRole('navigation').getByRole('button',{name:'עיר',exact:true}).click();await page.screenshot({path:'/downloads/solo-town-320.png'});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('horizontal overflow');
 await page.setViewportSize({width:1280,height:900});await page.getByRole('navigation').getByRole('button',{name:'מפה',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:'/downloads/solo-map-1280.png'});
 if(errors.length)throw Error(errors.join(';'));console.log('PASS solo handbook,32world,town prerequisite/build/save/reload,320no-overflow and390/1280 map screenshots');
}finally{await browser?.close();server.kill();}
