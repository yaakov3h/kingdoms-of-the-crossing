import{chromium}from'@playwright/test';import{spawn}from'node:child_process';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5192'],{stdio:'pipe'});let browser;
try{for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:5192');break;}catch{await new Promise(r=>setTimeout(r,100));}}
browser=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5192');
for(const [i,f]of['mars','crystal','tide','grove'].entries()){
 await p.evaluate(async({f,i})=>{const{createCampaign}=await import('/src/engine.ts');const game=createCampaign(44+i,f,32,2);localStorage.setItem('kingdom-independent.saves.v1',JSON.stringify([{id:'visual-'+f,profile:'שחקן 1',name:f,updated:Date.now(),game}]))},{f,i});
 for(const width of[320,390,1280]){await p.setViewportSize({width,height:width===1280?900:844});await p.reload();await p.getByRole('button',{name:'פתיחה',exact:true}).click();await p.locator('.canvas canvas:not(.minimap)').waitFor();await p.waitForTimeout(600);await p.screenshot({path:`/downloads/matrix-${f}-map-${width}.png`});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('overflow map '+f+width);
 await p.getByRole('navigation').getByRole('button',{name:'עיר',exact:true}).click();await p.screenshot({path:`/downloads/matrix-${f}-town-${width}.png`});await p.getByRole('heading',{name:'חצרות הגיוס'}).scrollIntoViewIfNeeded();await p.screenshot({path:`/downloads/matrix-${f}-roster-${width}.png`});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('overflow town '+f+width);
 }
}
if(errors.length)throw Error(errors.join(';'));console.log('PASS 4 factions x 320/390/1280 map/town/roster, no page errors or horizontal overflow');
}finally{await browser?.close();server.kill()}
