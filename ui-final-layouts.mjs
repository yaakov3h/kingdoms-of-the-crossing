import{chromium}from'@playwright/test';import{spawn}from'node:child_process';import assert from'node:assert/strict';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5195'],{stdio:'pipe'});let browser;
try{for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:5195');break;}catch{await new Promise(r=>setTimeout(r,100));}}
browser=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5195');
await p.evaluate(async()=>{const{createCampaign}=await import('/src/engine.ts');const game=createCampaign(1,'crystal',32,2);localStorage.setItem('kingdom-independent.saves.v1',JSON.stringify([{id:'layouts',profile:'שחקן 1',name:'layouts',updated:1,game}]))});
for(const width of[320,390,1280]){await p.setViewportSize({width,height:width===1280?900:740});await p.reload();await p.screenshot({path:`/downloads/final-home-${width}.png`});await p.getByRole('button',{name:'פתיחה',exact:true}).click();await p.waitForTimeout(500);
 for(const [name,key]of[['מפה','map'],['עיר','city'],['מפקד','heroes'],['צבא','army'],['כלכלה','economy']]){await p.getByRole('navigation').getByRole('button',{name,exact:true}).click();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,key+' overflow');await p.screenshot({path:`/downloads/final-${key}-${width}.png`});const pane=p.locator('.page');if(await pane.count()){await pane.evaluate(e=>e.scrollTop=e.scrollHeight);await p.screenshot({path:`/downloads/final-${key}-bottom-${width}.png`});}}
 await p.getByRole('button',{name:'תפריט',exact:true}).click();await p.getByRole('button',{name:'מערכה חדשה',exact:true}).click();await p.screenshot({path:`/downloads/final-setup-${width}.png`});await p.locator('.page').evaluate(e=>e.scrollTop=e.scrollHeight);await p.screenshot({path:`/downloads/final-setup-bottom-${width}.png`});
}
assert.deepEqual(errors,[]);console.log('PASS final home/setup/map/town/hero/army/economy,3 widths, scroll endpoints, no page errors or horizontal overflow');
}finally{await browser?.close();server.kill()}
