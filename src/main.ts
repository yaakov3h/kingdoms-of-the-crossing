import {rosters,townNames,buildingPrerequisites} from './roster';
import { campaignRules, terrainCatalog } from './catalog';
import Phaser from 'phaser';
import { mountPaired, unmountPaired } from './paired-ui';
import { Game, Action, create, createCampaign, movementCost, routeCost, normalize, apply, active, faction, factions, worldSize, routeTo, economy, buildings, specialSites, pyro, ability, trades, heroNames, equipment, treasuryCosts, mineCosts, siloCosts, siloYield } from './engine';
import { Save, listSaves, putSave, exportSave, importSave } from './storage';
import { KingdomScene } from './scene';
import { img, art } from './art';
import './style.css';
const app = document.querySelector<HTMLDivElement>('#app')!;
let current: Save | null = null, screen = 'home', profile = 'שחקן 1', selection: string = '', power = false;
let game: Phaser.Game | null = null;
let followNextView = false;
let renderedSaveId: string | null = null;
const cameraViews = new Map<string, {
    x: number;
    y: number;
    zoom: number;
    width?:number;
}>();
let scene: KingdomScene | null = null;
let cityDetail: string | null = null;
let sheet:{t:string,k?:any}|null=null,sheetQty=1;
const N=(x:any)=>'\u2066'+x+'\u2069';
const ARTSET:Record<string,Record<string,string>>={mars:{center:'citadel',barracks:'site-mars',workshop:'factory',observatory:'gravity',sanctuary:'sanctuary'},crystal:{center:'site-crystal-city',barracks:'hatchery',workshop:'factory',observatory:'site-beacon',sanctuary:'sanctuary'},grove:{center:'site-grove',barracks:'site-grove',workshop:'ruin',observatory:'site-beacon',sanctuary:'sanctuary'},tide:{center:'base',barracks:'site-camp',workshop:'factory',observatory:'gravity',sanctuary:'sanctuary'}};
const artFor=(f:string,k:string)=>ARTSET[f]?.[k]||'base';
const SILO_NAME='מחסן המשאבים';
const ICO:any={gold:'🪙',ore:'⛏️',crystal:'💎'};
function closeSheet(){sheet=null;sheetQty=1;render();}
let selectedCell: number | null = null;
let walking=false,walkToken=0;
let travelHint='';
let refreshWalkingMap:(()=>void)|null=null;
let toastTimer:ReturnType<typeof setTimeout>|undefined;
let saveStatus = 'לא נבחרה מערכה';
let message = 'מסע בין ארבע ממלכות מקוריות. שמירה אוטומטית במכשיר ויצוא גיבוי.';
const ICONRE=/[\u{1F000}-\u{1FAFF}\u2B50\u26CF\u2699\u2696\uFE0F]/gu;
const ICONMAP:Record<string,string>={'\u{1FA99}':'gold','\u26CF':'ore','\u{1F48E}':'crystal','\u{1F3AF}':'range','\u{1F6E1}':'shield','\u2B50':'star'};
function fillText(e:HTMLElement,text:string){if(!ICONRE.test(text)){e.textContent=text;return;}ICONRE.lastIndex=0;let last=0;for(const m of text.matchAll(ICONRE)){e.append(text.slice(last,m.index));const n=ICONMAP[m[0]];if(n){const i=document.createElement('i');i.className='ic ic-'+n;e.append(i);}last=m.index!+m[0].length;}e.append(text.slice(last).replace(/^\s+/,m=>m));}
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) => { const e = document.createElement(tag); if (text)
    fillText(e,text); if (cls)
    e.className = cls; return e; };
const button = (text: string, fn: () => void, cls = '') => { const b = el('button', text, cls); b.type = 'button'; b.onclick = fn; return b; };
const paragraph = (s: string) => el('p', s);
const g = () => current!.game;
function say(s: string) { message = s;if(app.classList.contains('map-mode')){document.querySelector('.map-toast')?.remove();const toast=el('div',s,'map-toast');toast.role='alert';app.append(toast);clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.remove(),4500);} const n = document.querySelector('.notice'); if (n)
    n.textContent = s; }
function modal(text: string, fn: () => void) { const d = el('dialog'), title = el('h2', 'אישור פעולה'); d.append(title, paragraph(text), button('אישור', () => { d.close(); d.remove(); fn(); }), button('ביטול', () => { d.close(); d.remove(); })); d.oncancel = () => d.remove(); app.append(d); d.showModal(); }
function persist(next: Game) { if (!current)
    return; const candidate = { ...current, updated: Date.now(), game: next }; try {
    putSave(candidate);
    current = candidate;
    saveStatus = 'נשמר במכשיר · ' + new Date(candidate.updated).toLocaleTimeString('he-IL');
}
catch (e) {
    current = candidate;
    saveStatus = 'השמירה נכשלה. אפשר לייצא לגיבוי';
    message = saveStatus + ': ' + String(e);say(message);
} }
function action(a: Action) { if(walking)return;try {
    const before = g();
    const n = apply(before, a);
    if (n.pos !== before.pos || n.activeHero !== before.activeHero || !!n.battle !== !!before.battle)
        followNextView = true;
    persist(n);
    message = n.log[0];
    if (n.battle)
        screen = 'map';
    render();
}
catch (e) {
    say(String(e).replace('Error: ', ''));
} }
function navigate(s: string) { sheet=null;sheetQty=1;walkToken++;walking=false;if (s === 'city')
    cityDetail = null; if (current?.game.battle && s !== 'home' && s !== 'map') {
    say('סיימו את הקרב או חזרו אליו דרך המפה');
    return;
} screen = s; selectedCell = null; render(); }
function download() { if (!current)
    return; const blob = new Blob([exportSave(current)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'kingdom-save-' + g().day + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
function page(title: string) { const p = el('section', undefined, 'page'), inner = el('div', undefined, 'inner'), bar = el('div', undefined, 'bar'); bar.append(el('h2', title), button(current ? 'חזרה למפה' : 'לתפריט', () => current ? navigate('map') : navigate('home'))); inner.append(bar); p.append(inner); return { p, inner }; }
function unitCard(u: any) { const d = el('article', undefined, 'card'); d.append(img(art(u.faction || g().faction, u.kind)), el('b', u.name), paragraph(`${u.hp}/${u.max} חיים · ${u.damage} נזק · טווח ${u.range}`)); const a = ability(g(), u); if (a)
    d.append(paragraph(a.name + ': ' + a.detail)); return d; }
function render() {
    if(walking&&screen==='map'&&refreshWalkingMap&&scene?.scene.isActive()&&!scene.state.battle&&!g().battle){refreshWalkingMap();return;}
    refreshWalkingMap=null;
    unmountPaired();
    if (renderedSaveId && scene?.cameras?.main && !scene.state?.battle) {
        const c = scene.cameras.main;
        cameraViews.set(renderedSaveId, { x: c.worldView.centerX, y: c.worldView.centerY, zoom: c.zoom, width:c.width });
    }
    game?.destroy(true);
    game = null;
    scene = null;
    app.replaceChildren();app.classList.toggle('map-mode',!!current&&screen==='map'&&!g().battle);
    const header = el('header'), brand = el('div');
    brand.append(el('h1', 'ממלכות המעבר'), el('p', screen === 'paired' ? 'פיתוח עצמאי · חדר זוגי מקומי' : 'אסטרטגיה ומסעות · גרסת סולו בבנייה'));
    header.append(brand);
    if (current && screen !== 'paired')
        header.append(button('תפריט', () => navigate('home')), Object.assign(button('סיום יום', () => modal('לסיים יום ולאפשר לממלכות המחשב לפעול?', () => action({ kind: 'endDay' }))), { disabled: !!g().battle }));
    const resources = el('div', undefined, 'resources');
    if (current && screen !== 'paired') {
        const e = economy(g()).total;
        resources.append(el('b', faction(g()).name), el('span', 'יום ' + g().day), el('span', '🪙 ' + g().gold + ' (+' + e.gold + ')'), el('span', '⛏️ ' + g().ore + ' (+' + e.ore + ')'), el('span', '💎 ' + g().crystal + ' (+' + e.crystal + ')'), el('span', saveStatus));
    }
    else
        resources.append(el('span', screen === 'paired' ? 'סביבת בדיקה בלבד. שרת מקומי, לא שירות אינטרנט.' : 'שמירות אישיות במכשיר. אין עדיין שירות רשת פעיל.'));
    const main = el('main');
    app.append(header, resources, main);
    const bottom = el('footer'), notice = el('div', screen === 'paired' ? 'חדרי בדיקה מקומיים בלבד. הסולו ושמירותיו נפרדים.' : message, 'notice');
    notice.role = 'status';
    bottom.append(notice);
    if (current && screen !== 'paired') {
        const nav = el('nav');
        nav.ariaLabel = 'מסכי המשחק';
        for (const [s, t] of [['map', g().battle ? 'קרב' : 'מפה'], ['city', 'עיר'], ['heroes', 'מפקד'], ['army', 'צבא'], ['economy', 'כלכלה']]) {
            const b = button(t, () => navigate(s), screen === s ? 'active' : '');
            b.disabled = !!g().battle && s !== 'map';
            nav.append(b);
        }
        bottom.append(nav);
    }
    app.append(bottom);
    if (screen === 'paired') {
        mountPaired(main, () => navigate('home'));
        return;
    }
    if(screen==='guide'){guide(main);return;}
    if (screen === 'setup') {
        setup(main);
        return;
    }
    if (screen === 'home' || !current) {
        home(main);
        return;
    }
    if (screen === 'map') {
        world(main);
        return;
    }
    if (screen === 'city') {
        city(main);
        return;
    }
    if (screen === 'heroes') {
        heroes(main);
        return;
    }
    if (screen === 'army') {
        if(g().rulesRevision===2){campaignArmy(main);return;}
        const { p, inner } = page('הצבא הפעיל');
        inner.append(paragraph(active(g()).name + ' · ' + active(g()).ap + '/' + active(g()).maxAp + ' פעולות'));
        const grid = el('div', undefined, 'units');
        g().army.forEach(u => grid.append(unitCard(u)));
        inner.append(grid);
        main.append(p);
        return;
    }
    if (screen === 'economy') {
        economyPage(main);
        return;
    }
}
function home(main: HTMLElement) { const { p, inner } = page('המערכות שלכם'); const image = img('city-' + (current?.game.faction || 'mars')); image.className = 'heroart'; inner.append(image); const label = el('label', 'פרופיל מקומי '), input = el('input'); input.value = profile; input.maxLength = 60; input.ariaLabel = 'שם פרופיל מקומי'; input.onchange = () => { profile = input.value.trim() || 'שחקן 1'; render(); }; label.append(input); inner.append(label, paragraph('הפרופיל מפריד שמירות בדפדפן, אינו חשבון מאובטח. לשמירה במחשב אחר השתמשו ביצוא ויבוא.')); const row = el('div', undefined, 'homeactions'); row.append(button('מערכה חדשה', () => { screen = 'setup'; render(); }), button('יבוא שמירה', () => { const f = el('input'); f.type = 'file'; f.accept = '.json,application/json'; f.onchange = async () => { try {
    const file = f.files?.[0];
    if (!file)
        return;
    const s = importSave(await file.text(), profile);
    putSave(s);
    current = s;
    saveStatus = 'שמירה יובאה למקום חדש';
    screen = 'map';
    render();
}
catch (e) {
    say(String(e));
} }; f.click(); })); if (current)
    row.append(button(g().battle ? 'המשך הקרב' : 'המשך משחק', () => navigate('map')), button('יצוא גיבוי', download)); inner.append(row); let saves: Save[] = []; try {
    saves = listSaves().filter(x => x.profile === profile);
}
catch (e) {
    inner.append(paragraph('לא ניתן לקרוא שמירות: ' + String(e)));
} for (const s of saves.sort((a, b) => b.updated - a.updated)) {
    const d = el('article', undefined, 'card save');
    d.append(paragraph(`${s.name} · ${factions.find(f => f.id === s.game.faction)?.name || ''} · יום ${s.game.day} · ${new Date(s.updated).toLocaleString('he-IL')}`), button('פתיחה', () => { try {
        current = { ...s, game: normalize(s.game) };
        saveStatus = 'נטען מהמכשיר';
        screen = 'map';
        render();
    }
    catch (e) {
        say(String(e));
    } }));
    inner.append(d);
} if (!saves.length)
    inner.append(paragraph('אין מערכות בפרופיל הזה. מערכה חדשה נשמרת בנפרד ואינה מוחקת מערכה קודמת.')); inner.append(button('ספר המסע, יחידות וחוקים',()=>navigate('guide')));
    const network = el('article', undefined, 'card'); network.append(el('h3', 'משחק זוגי ברשת'), paragraph('שמירה משותפת ומשחק עם אחרים יתווספו בשלב נפרד, בלי לפגוע במערכות הסולו.'), paragraph('החיבור הזוגי נשמר לשלב הבא. גרסת הסולו אינה תלויה בחשבון או בשרת.')); inner.append(network); main.append(p); }
function setup(main: HTMLElement) { const { p, inner } = page('מערכה חדשה'); let chosen = 'mars', opponents = 2, size:24|32 = 24; const choices = el('div', undefined, 'factions'), detail = el('div'); function show() { detail.replaceChildren(); for (const b of Array.from(choices.children))
    b.classList.toggle('active', (b as HTMLElement).dataset.faction === chosen); const f = factions.find(f => f.id === chosen)!; const image = img('city-' + chosen); image.className = 'heroart'; detail.append(image, el('h2', f.name), paragraph(f.bonus), paragraph('מפקדת: ' + heroNames[chosen][0])); const units = el('div', undefined, 'units'); create(1, chosen).army.forEach(u => { const d = el('div', undefined, 'card'); d.append(img(art(chosen, u.kind)), el('b', u.name), paragraph(`${u.max} חיים · ${u.damage} נזק · טווח ${u.range}`)); units.append(d); }); detail.append(units); } for (const f of factions) {
    const b = button('', () => { chosen = f.id; show(); });
    b.dataset.faction = f.id;
    b.append(img('hero-' + f.id), el('b', f.name), el('small', heroNames[f.id][0]));
    choices.append(b);
} inner.append(choices, detail); show(); const label = el('label', 'יריבי מחשב '), select = el('select'); for (const n of [1, 2]) {
    const o = el('option', String(n));
    o.value = String(n);
    o.selected = n === 2;
    select.append(o);
} select.onchange = () => opponents = Number(select.value); label.append(select); const sizeLabel=el('label','גודל העולם '),sizeSelect=el('select');sizeSelect.ariaLabel='גודל העולם';for(const n of [24,32] as const){const o=el('option',n+' × '+n);o.value=String(n);sizeSelect.append(o);}sizeSelect.onchange=()=>size=Number(sizeSelect.value) as 24|32;sizeLabel.append(sizeSelect);inner.append(sizeLabel);
    inner.append(label, paragraph('עולם אקראי גדול, נקודות תנועה לפי קרקע, צבאות עצמאיים וטירות לפיתוח. ניצחון בכיבוש בירות המחשב. שמירה מקומית נפרדת לכל מערכה.'), button('יצירת מערכה נפרדת', () => { const s: Save = { id: crypto.randomUUID(), profile, name: factions.find(f => f.id === chosen)!.name, updated: Date.now(), game: createCampaign(crypto.getRandomValues(new Uint32Array(1))[0], chosen, size, opponents) }; try {
    putSave(s);
    current = s;
    screen = 'map';
    saveStatus = 'נשמר במכשיר';
    message = 'המערכה התחילה. הקישו על יעד גלוי כדי לצעוד אליו.';
    render();
}
catch (e) {
    say('לא ניתן ליצור שמירה: ' + String(e));
} })); main.append(p); }

async function walkTo(target:number){
 if(walking||!current||g().battle||target===g().pos)return;travelHint='';
 const path=routeTo(g(),target);if(!path.length){say('אין מסלול גלוי ליעד. חקרו את שולי האזור המוכר.');return;}
 const token=++walkToken;walking=true;selectedCell=target;
 try{for(const next of path){
  if(token!==walkToken||!current||g().battle||g().lost)break;
  const enemy=g().rivals.some(r=>!r.defeated&&(r.capital===next||r.pos===next&&r.army.some(u=>u.hp>0)));if(active(g()).ap<(enemy?1:movementCost(g(),g().pos,next))){travelHint='התנועה להיום הסתיימה. סיימו יום להמשך.';break;}
  await new Promise(r=>setTimeout(r,150));if(token!==walkToken)break;
  const before=g(),after=apply(before,{kind:'move',target:next});persist(after);followNextView=true;message=after.log[0];render();
  if(after.battle||after.pos===target)break;
 }}catch(e){say(String(e).replace('Error: ',''));}finally{if(token===walkToken){walking=false;if(current&&screen==='map'){if(refreshWalkingMap&&!g().battle)refreshWalkingMap();else render();}}}
}

function world(main: HTMLElement) {
    const w = el('section', undefined, 'world'), canvas = el('div', undefined, 'canvas'), context = el('div', undefined, 'context'), tools = el('div', undefined, 'maptools');
    w.classList.toggle('battle-view',!!g().battle);canvas.ariaLabel = g().battle ? 'שדה הקרב' : 'מפת העולם';
    const mini=el('canvas');mini.className='minimap';mini.width=mini.height=112;mini.ariaLabel='מפת מסע כללית';const mc=mini.getContext('2d')!,mw=worldSize(g()),px=112/mw;mc.fillStyle='#071b23';mc.fillRect(0,0,112,112);for(const n of g().seen){mc.fillStyle='#'+terrainCatalog[g().terrain[n]].color.toString(16).padStart(6,'0');mc.fillRect(n%mw*px,Math.floor(n/mw)*px,px+1,px+1);}for(const h of g().heroes){mc.fillStyle=h.id===g().activeHero?'#ffe3a1':'#77dcdf';mc.fillRect(h.pos%mw*px-1,Math.floor(h.pos/mw)*px-1,4,4);}mini.onclick=e=>{const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*mw,y=(e.clientY-r.top)/r.height*mw;scene?.cameras.main.centerOn(x*80,y*80);};if(!g().battle)canvas.append(mini);
    const full=button('⛶',()=>{if(document.fullscreenElement)void document.exitFullscreen();else if(app.requestFullscreen)void app.requestFullscreen().catch(()=>say('הדפדפן לא מאפשר מסך מלא. אפשר להוסיף למסך הבית.'));else say('הדפדפן לא מאפשר מסך מלא. אפשר להוסיף למסך הבית.');},'fullscreen-toggle');full.ariaLabel='מסך מלא';tools.append(full,button('+', () => scene?.zoom(.15)), button('−', () => scene?.zoom(-.15)), button('מרכוז', () => scene?.center()));
    canvas.append(tools);
    w.append(canvas, context);
    main.append(w);
    function contextDraw() {
        context.replaceChildren();
        const a = active(g());
        if (g().finished)
            context.append(el('strong', 'ניצחון במערכה! כל בירות האויב נכבשו.'));
        if (g().lost)
            context.append(el('strong', 'המערכה הסתיימה. אפשר לפתוח שמירה אחרת או ליצור מערכה חדשה.'));
        if (g().battle) {
            const b = g().battle!;
            const selected = b.units.find(u => u.id === selection && u.side === 0 && u.hp > 0) || b.units.find(u => u.side === 0 && u.hp > 0);
            selection = selected?.id || '';
            if (scene)
                scene.selectedUnit = selection;
            context.append(paragraph(`${selected?.name || ''} · ${selected?.hp}/${selected?.max} חיים · נזק ${selected?.damage} · טווח ${selected?.range} · סבב ${b.round} · ${power ? 'בחרו אויב ליכולת' : 'אויבים באדום. בחרו משבצת סמוכה או אויב בטווח הכחול'}`));
            const picks=el('div',undefined,'battle-picks');for (const u of b.units.filter(u => u.side === 0 && u.hp > 0))
                picks.append(button(u.name, () => { selection = u.id; scene!.selectedUnit = u.id; scene!.draw(); contextDraw(); }, selection === u.id ? 'active' : ''));
            context.append(picks);if (selected && ability(g(), selected)&&!selected.used)
                context.append(button(ability(g(), selected)!.name, () => { if (ability(g(), selected)!.range === 0) {
                    action({ kind: 'ability', unit: selected.id });
                }
                else {
                    power = !power;
                    contextDraw();
                } }, power ? 'active' : ''));
            const targetLabel = el('label', 'תא קרב '), targetSelect = el('select');
            targetSelect.ariaLabel = 'תא יעד בקרב';
            for (let n = 0; n < 30; n++) {
                const o = el('option', 'שורה ' + (Math.floor(n / 6) + 1) + ' עמודה ' + (n % 6 + 1));
                o.value = String(n);
                targetSelect.append(o);
            }
            targetLabel.append(targetSelect);
            const keyboard=el('details',undefined,'keyboard-target'),summary=el('summary','בחירת יעד במקלדת');keyboard.append(summary,targetLabel,button('פקודה ליעד',()=>scene?.choose(Number(targetSelect.value))));context.append(keyboard);
            context.append(button('קרב אוטומטי', () => modal('פתרון הקרב ישמור גם אבדות. להמשיך?', () => action({ kind: 'auto' }))), button('נסיגה', () => modal('לסגת עם השורדים לבירה?', () => action({ kind: 'retreat' }))));
            return;
        }
        if(saveStatus.startsWith('השמירה נכשלה'))context.append(el('span',saveStatus,'travel-hint'));
        if(travelHint)context.append(el('span',travelHint,'travel-hint'));
        context.append(paragraph(`${a.name} · ${a.ap}/${a.maxAp} נקודות תנועה · יום ${g().day}`));
        if(g().rulesRevision===2){const terrain=terrainCatalog[g().terrain[g().pos]];context.append(el('small',terrain.name+' · '+(g().roads?.includes(g().pos)?'דרך סלולה':'קרקע טבעית')));}
        const at = g().sites.find(s => s.id === g().pos);
        if (at) {
            context.append(el('span', ({ base: 'בירה', gate: 'בירת אויב', mine: 'מכרה', cache: 'אוצר', quest: 'משימה', ruin: 'חורבה', factory: 'מפעל', sanctuary: 'גן מרפא', gravity: 'מגדל כבידה', hatchery: 'מדגרה', relic: 'שריד', camp: 'מחנה', spring: 'מעיין', beacon: 'משואה' })[at.type]));
            if (!at.done && !at.owner && at.type !== 'base')
                context.append(button(at.guard ? 'קרב באתר' : 'חקירת האתר', () => action({ kind: 'visit' })));
            if (at.type === 'base')
                context.append(button('כניסה לעיר', () => navigate('city')));
            if (at.owner && specialSites[at.type]) {
                const d = specialSites[at.type];
                context.append(button('גיוס ' + (g().rulesRevision===2?rosters[g().faction][d.kind].name:d.unit), () => action({ kind: 'siteRecruit', unitKind: d.kind })));
            }
        }
        if (selectedCell !== null && selectedCell !== g().pos) {
            const target = selectedCell, path = routeTo(g(), target);
            context.append(paragraph(`יעד ${target} · ${path.length} צעדים · ${routeCost(g(),path)} נקודות תנועה · ${terrainCatalog[g().terrain[target]].name}`));
            const near = g().rivals.find(r => !r.defeated && (r.capital === target || r.pos === target));
            if (near)
                context.append(button(near.capital === target ? 'הסתערות על העיר' : 'תקיפת הצבא', () => action({ kind: near.capital === target ? 'assault' : 'engage', target: near.capital === target ? target : near.id })));
            if(path.length)context.append(el('small',walking?'צועד במסלול שנבחר':'הקישו על היעד במפה כדי להמשיך'));
        }
    }
    renderedSaveId = current!.id;
    scene = new KingdomScene();
    scene.initialView = followNextView ? undefined : cameraViews.get(current!.id);
    followNextView = false;
    scene.state = g();scene.route=selectedCell!==null?routeTo(g(),selectedCell):[];
    scene.choose = n => { if (g().battle) {
        const u = g().battle!.units.find(u => u.hp > 0 && u.pos === n);
        if (u?.side === 0) {
            selection = u.id;
            scene!.selectedUnit = u.id;
            scene!.draw();
            contextDraw();
            return;
        }
        action({ kind: power ? 'ability' : u ? 'strike' : 'march', unit: selection, enemy: u?.id, target: n });
        power = false;
    }
    else {
        if(walking)return;const ownHero=g().heroes.find(h=>h.id!==g().activeHero&&h.pos===n);if(ownHero){action({kind:'selectHero',hero:ownHero.id});return;}
            const rival = g().rivals.find(r => !r.defeated && (r.pos === n || r.capital === n));
        if (rival && Math.max(Math.abs(n % worldSize(g()) - g().pos % worldSize(g())), Math.abs(Math.floor(n / worldSize(g())) - Math.floor(g().pos / worldSize(g())))) <= 1) {
            action({ kind: 'move', target: n });
            return;
        }
        if(walking)return;selectedCell=n;scene!.route=routeTo(g(),n);scene!.draw();contextDraw();void walkTo(n);
    } };
    contextDraw();
    game = new Phaser.Game({ type: Phaser.CANVAS, parent: canvas, backgroundColor: '#102b38', scale: { mode: Phaser.Scale.RESIZE, width: canvas.clientWidth, height: canvas.clientHeight }, scene: [scene], render: { antialias: true }, audio: { noAudio: true } });
    contextDraw();
    const observer = new ResizeObserver(() => { if (game && canvas.isConnected) {
        game.scale.resize(canvas.clientWidth, canvas.clientHeight);
    } });
    refreshWalkingMap=()=>{if(!scene)return;scene.route=selectedCell!==null?routeTo(g(),selectedCell):[];scene.setState(g());if(followNextView){scene.center();followNextView=false;}contextDraw();for(const n of g().seen){mc.fillStyle='#'+terrainCatalog[g().terrain[n]].color.toString(16).padStart(6,'0');mc.fillRect(n%mw*px,Math.floor(n/mw)*px,px+1,px+1);}for(const h of g().heroes){mc.fillStyle=h.id===g().activeHero?'#ffe3a1':'#77dcdf';mc.fillRect(h.pos%mw*px-1,Math.floor(h.pos/mw)*px-1,4,4);}};
    observer.observe(canvas);
    setTimeout(() => scene?.events?.once('shutdown', () => observer.disconnect()), 0);
}
function city(main: HTMLElement) {
    if(g().rulesRevision===2){campaignCity(main);return;} 
    if (cityDetail === null) {
        const section = el('section', undefined, 'cityscreen'), bar = el('div', undefined, 'citybar');
        bar.append(el('h2', faction(g()).name), button('חזרה למפה', () => navigate('map')));
        const field = el('div', undefined, 'cityfield'), panorama = el('div', undefined, 'panorama faction-' + g().faction);
        const picture = img('city-' + g().faction);
        picture.alt = 'עיר ' + faction(g()).name;
        panorama.append(picture);
        const enter = (key: string) => { cityDetail = key; render(); };
        const center = button('', () => enter('center'), 'cityhit palace');
        center.ariaLabel = 'מרכז העיר, גיוס וריפוי';
        center.append(el('span', 'מרכז העיר · ' + g().level));
        panorama.append(center);
        for (const [key, d] of Object.entries(buildings)) {
            const b = button('', () => enter(key), 'cityhit hit-' + key);
            b.ariaLabel = d.name + ' רמה ' + g().buildings[key] + ' מידע ושדרוג';
            b.append(el('span', d.name + ' · ' + g().buildings[key]));
            panorama.append(b);
        }
        field.append(panorama);
        section.append(bar, field, paragraph('בחרו מבנה בעיר למידע, שדרוג וגיוס. כל התמונה מוצגת ללא חיתוך.'));
        main.append(section);
        return;
    }
    const { p, inner } = page(cityDetail === 'center' ? 'מרכז העיר' : buildings[cityDetail].name);
    inner.prepend(button('חזרה לעיר', () => { cityDetail = null; render(); }));
    inner.append(paragraph(g().pos === 0 ? 'המשלחת בבירה' : 'לפעולות בעיר יש להחזיר את המשלחת לבירה.'));
    if (cityDetail === 'center') {
        inner.append(paragraph('שדרוג המרכז מחזק את הצבאות ב-2 חיים ומוסיף 2 לגיוסים חדשים.'), button('שדרוג מרכז ·10זהב5עפרות2גבישים', () => action({ kind: 'upgrade' })), button('ריפוי ·4זהב', () => action({ kind: 'heal' })), button('מפקד נוסף ·18זהב4עפרות2גבישים', () => action({ kind: 'hireHero' })), el('h3', 'גיוס מהיר'));
        for (const [k, name] of faction(g()).units.entries())
            inner.append(button(name + ' ·' + [5, 8, 7][k] + 'זהב2עפרות', () => action({ kind: 'recruit', unitKind: k })));
    }
    else {
        const key = cityDetail, d = buildings[key], level = g().buildings[key] || 0;
        const picture = img(d.art);
        picture.className = 'buildingportrait';
        inner.append(picture, el('h3', 'רמה ' + level + '/2'));
        d.unlock.forEach((t, i) => inner.append(paragraph('רמה ' + (i + 1) + ': ' + t)));
        if (level < 2) {
            const c = d.cost[level];
            inner.append(button('שדרוג ·' + c[0] + 'זהב ' + c[1] + 'עפרות ' + c[2] + 'גבישים', () => action({ kind: 'build', unit: key })));
        }
        const kind = key === 'workshop' ? 3 : key === 'sanctuary' ? 4 : key === 'observatory' ? 5 : 6;
        const unit = Object.values(specialSites).find(d => d.kind === kind)!;
        for (const u of [unit, ...(key === 'barracks' ? [pyro] : [])]) {
            inner.append(el('h3', u.unit), paragraph(u.gold + 'זהב ' + u.ore + 'עפרות ' + u.crystal + 'גבישים'), button('גיוס ' + u.unit, () => action({ kind: 'cityRecruit', unitKind: u.kind })));
        }
    }
    main.append(p);
}
function heroes(main: HTMLElement) { if(g().rulesRevision===2){campaignHeroes(main);return;} const { p, inner } = page('המפקדים והמשלחות'); for (const h of g().heroes) {
    const d = el('article', undefined, 'card');
    d.append(img('hero-' + g().faction), el('h3', h.name), paragraph(`דרגה ${h.rank || 1} · תא ${h.pos} · פעולות ${h.ap}/${h.maxAp} · צבא ${h.army.filter(u => u.hp > 0).length}/6`), button(h.id === g().activeHero ? 'המפקד הפעיל' : 'הפעלת המשלחת', () => action({ kind: 'selectHero', hero: h.id })));
    inner.append(d);
} const h = active(g()); for (const other of g().heroes.filter(x => x.id !== h.id && x.pos === h.pos)) {
    inner.append(el('h3', 'העברה אל ' + other.name));
    for (const u of g().army.filter(u => u.hp > 0))
        inner.append(button('העברת ' + u.name, () => modal('להעביר את היחידה למשלחת של ' + other.name + '?', () => action({ kind: 'transfer', hero: other.id, unit: u.id }))));
} inner.append(el('h3', 'שיפורי המפקד הפעיל')); for (const [key, name] of [['attack', 'התקפה'], ['defense', 'הגנה'], ['specialty', 'התמחות']])
    inner.append(button(name, () => modal('בחירת שיפור קבוע במערכה?', () => action({ kind: 'talent', unit: key })))); inner.append(el('h3', 'ציוד')); for (const r of g().relics)
    inner.append(button(equipment[r]?.name || r, () => action({ kind: 'equip', unit: r }))); inner.append(el('h3', 'מסורת ממלכה')); for (const [key, name] of [['arms', 'כוח'], ['bastion', 'מגן'], ['trade', 'סחר']])
    inner.append(button(name, () => modal('מסורת קבועה:16זהב6עפרות4גבישים ופעולה. להמשיך?', () => action({ kind: 'doctrine', unit: key })))); inner.append(el('h3', 'יומן')); g().log.forEach(t => inner.append(el('div', t, 'log'))); main.append(p); }
function economyPage(main: HTMLElement) { if(g().rulesRevision===2){campaignEconomy(main);return;} const { p, inner } = page('אוצר ושוק'), e = economy(g()); inner.append(paragraph(`הכנסה בסוף יום: ${e.total.gold} זהב · ${e.total.ore} עפרות · ${e.total.crystal} גבישים`)); const t = g().treasury || 0; inner.append(el('h3', 'אוצר הבירה ·רמה ' + t)); if (t < 2)
    inner.append(button('שדרוג ·' + treasuryCosts[t].join('/'), () => action({ kind: 'treasury' }))); if (g().lastIncome)
    inner.append(paragraph('גבייה אחרונה: יום ' + g().lastIncome!.day + ' · ' + g().lastIncome!.gold + ' זהב · ' + g().lastIncome!.ore + ' עפרות · ' + g().lastIncome!.crystal + ' גבישים')); for (const s of e.mines) {
    const d = el('article', undefined, 'card');
    d.append(el('h3', `מכרה ${{ gold: 'זהב', ore: 'עפרות', crystal: 'גבישים' }[s.resource || 'gold']} · תא ${s.id}`), paragraph('רמת שדרוג ' + (s.incomeLevel || 0)));
    if ((s.incomeLevel || 0) < 2)
        d.append(button('שדרוג במקום ·' + mineCosts[s.incomeLevel || 0].join('/'), () => action({ kind: 'improveMine' })));
    inner.append(d);
} inner.append(el('h3', 'שוק הבירה ·כל עסקה עולה פעולה')); for (const [k, t] of Object.entries(trades))
    inner.append(button(t.label, () => action({ kind: 'trade', unit: k }))); main.append(p); }
render();

function guide(main:HTMLElement){
 const {p,inner}=page('ספר המסע');
 inner.append(el('h3','היעד שלכם'),paragraph('בחרו ברית, חשפו עולם אקראי, כבשו מקורות הכנסה ופתחו עיר וצבא. הכניעו את בירות המחשב כדי לנצח. אפשר לסגת, להתחזק ולחזור. כל עולם חדש הוא שמירה נפרדת.'));
 const grid=el('div',undefined,'grid');
 for(const f of factions){const card=el('article',undefined,'card');card.append(img('hero-'+f.id),el('h3',f.name),paragraph(f.theme),paragraph(f.bonus),paragraph(rosters[f.id].map(u=>u.name).join(' · ')));grid.append(card);}inner.append(grid);
 inner.append(el('h3','תנועה וימים'),paragraph('במערכות החדשות לכל גיבור14נקודות תנועה ביום. סיירים מתמחים נעים מהר יותר. הליכה אפשרית בשמונה כיוונים. כביש חוסך מאמץ ואלכסון מוסיף נקודה. סיום יום מחדש תנועה, גובה הכנסה ומפעיל את ממלכות המחשב. אין שעון רץ בזמן שאתם לא משחקים.'));
 for(const t of terrainCatalog)inner.append(paragraph(t.name+': '+t.cost+' נקודות לפני הנחות. '+t.detail));
 inner.append(el('h3','משאבים'));for(const r of campaignRules.resources)inner.append(paragraph(r.name+': '+r.purpose));
 inner.append(el('h3','בניית עיר'));inner.append(paragraph('בונים מבנה אחד בכל יום. חצר האימונים נדרשת לסדנה ולגן המרפא. שניהם נדרשים למצפה. שדרוג מבנה לרמה2 דורש מרכז עיר ברמה1. בכל סיעה שמונה יחידות שונות, מלאי הגיוס מתחדש בתחילת שבוע.'));
 inner.append(el('h3','גיבורים וצבאות'),paragraph('כל גיבור מוביל צבא עצמאי, עד שש יחידות. העברה דורשת מפגש באותו תא. ניסיון מתקבל בניצחונות ובחקירת אתרים, שיפור דרגה וציוד משפיעים על הקרבות הבאים. התקפה על צבא או עיר אפשרית מכל שמונה המשבצות הסמוכות.'));
 inner.append(el('h3','שמירה ופרטיות'),paragraph('השמירה כאן בדפדפן ובמכשיר, לא ברשת ולא בריפו. מחיקת נתוני האתר עלולה למחוק אותה. יצאו קובץ גיבוי מהתפריט. יבוא מוסיף שמירה ואינו דורס קיימות. חיבור השרת והמשחק עם שחקנים אחרים נשמרים לשלב הבא.'));
 main.append(p);
}

function campaignCity(main:HTMLElement){
 const {p,inner}=page(townNames[g().faction].center),town=g(),names=townNames[town.faction],atHome=town.pos===0;
 const week=Math.floor((town.day-1)/7)+1,dayOfWeek=((town.day-1)%7)+1;
 const status=el('div',undefined,'statusrow');status.append(el('span','שבוע '+N(week)+' · יום '+N(dayOfWeek),'chip'),el('span',town.builtDay===town.day?'בנייה להיום: בוצעה':'בנייה להיום: פנויה','chip'));inner.append(status);
 if(!atHome){const away=el('div',undefined,'reason');away.append(el('span','🏰 '+active(town).name+' מחוץ לבירה. גיוס ובנייה רק כשהגיבור בעיר. '));const other=town.heroes.find(h=>h.pos===0&&h.id!==town.activeHero);if(other)away.append(button('להפעיל את '+other.name,()=>action({kind:'selectHero',hero:other.id})));else away.append(button('למפה',()=>navigate('map')));inner.append(away);}
 const panorama=el('div',undefined,'panorama faction-'+town.faction),image=img('city-'+town.faction);image.alt='תוכנית העיר '+names.center;panorama.append(image);
 for(const key of ['center',...Object.keys(buildings),'silo']){const hit=button('',()=>{sheet={t:'bld',k:key};sheetQty=1;render();},'cityhit '+(key==='center'?'palace':'hit-'+key));const nm=key==='silo'?SILO_NAME:names[key],lvl=key==='center'?town.level:key==='silo'?(town.silo||0):town.buildings[key];hit.ariaLabel='פרטי '+nm;hit.append(el('span',nm+' · '+lvl));panorama.append(hit);}
 inner.append(panorama,el('h3','צבא הגיבור'),slotsRow(town.army.filter(u=>u.hp>0)),el('h3','גיוס'));
 const strip=el('div',undefined,'ustrip');rosters[town.faction].forEach((_d,k)=>strip.append(unitTile(k,()=>{sheet={t:'unit',k};sheetQty=1;render();})));inner.append(strip);
 main.append(p);drawSheet();
}
function unlockedUnit(k:number){const t=g(),d=rosters[t.faction][k];return d.building==='center'||(t.buildings[d.building]||0)>=d.tier;}
function unitTile(k:number,onTap:()=>void){const t=g(),d=rosters[t.faction][k],ok=unlockedUnit(k),b=el('button',undefined,'utile'+(ok?'':' locked'));b.type='button';b.onclick=onTap;b.ariaLabel=d.name;
 b.append(img(art(t.faction,k)),el('span',ok?String(t.recruitmentStock?.[k]||0):'🔒','badge'),el('small',d.name));const c=chips(d);c.classList.add('mini');b.append(c);return b;}
function slotsRow(army:any[]){const row=el('div',undefined,'slots');for(let i=0;i<6;i++){const u=army[i];if(!u){row.append(el('div','+','slot empty'));continue;}const b=el('button',undefined,'slot');b.type='button';b.ariaLabel=u.name;b.onclick=()=>{sheet={t:'army',k:u.id};render();};b.append(img(art(u.faction||g().faction,u.kind)));const bar=el('span',undefined,'hpbar'),fill=el('i');fill.style.width=Math.max(4,Math.round(100*u.hp/u.max))+'%';bar.append(fill);b.append(bar);row.append(b);}return row;}
function chips(c:any,have?:any){const w=el('span',undefined,'chips');for(const k of ['gold','ore','crystal']){const v=c[k]||0;if(!v)continue;const s=el('span',ICO[k]+' '+v,'chip num');if(have&&have[k]<v)s.classList.add('short');w.append(s);}return w;}
function recruitMany(kind:number,n:number){if(walking)return;let cur=g(),done=0,err='';for(let i=0;i<n;i++){try{cur=apply(cur,{kind:'recruit',unitKind:kind});done++;}catch(e){err=String(e).replace('Error: ','');break;}}
 if(done){persist(cur);message=cur.log[0];sheet=null;sheetQty=1;render();say('גויסו '+done+' · '+rosters[cur.faction][kind].name+(err?' · '+err:''));}else say(err||'לא גויס');}
function drawSheet(){if(!sheet||!current)return;const town=g(),names=townNames[town.faction],atHome=town.pos===0,d=el('dialog',undefined,'sheet'),box=el('div',undefined,'sheetbox');
 const x=button('✕',()=>closeSheet(),'sheetx');x.ariaLabel='סגירה';box.append(x);
 if(sheet.t==='army'){const u=town.army.find(u=>u.id===sheet!.k)||town.heroes.flatMap(h=>h.army).find(u=>u.id===sheet!.k);if(u){const c=unitCard(u);c.classList.add('flat');box.append(c);}else sheet=null;}
 else if(sheet.t==='unit'){
  const k=sheet.k as number,r=rosters[town.faction][k],stock=town.recruitmentStock?.[k]||0,free=6-town.army.filter(u=>u.hp>0).length,ok=unlockedUnit(k);
  const cap=(c:number,h:number)=>c?Math.floor(h/c):99,afford=Math.min(cap(r.gold,town.gold),cap(r.ore,town.ore),cap(r.crystal,town.crystal)),max=Math.max(0,Math.min(stock,free,afford));
  const reason=!atHome?'הגיבור הפעיל מחוץ לבירה':!ok?'נדרש: '+names[r.building]+' רמה '+r.tier:stock<=0?'המלאי אזל. תגבורת מגיעה בתחילת כל שבוע':free<=0?'הצבא מלא (6/6)':afford<=0?'אין די משאבים':'';
  const qty=Math.min(Math.max(1,sheetQty),Math.max(1,max));
  box.append(el('h2',r.name,'sheettitle'));const pic=img(art(town.faction,k));pic.className='sheetpic';box.append(pic);
  const st=el('div',undefined,'statusrow');st.append(el('span','❤ '+r.hp,'chip stat num'),el('span','⚔ '+r.damage,'chip stat num'),el('span','🎯 '+r.range,'chip stat num'),el('span',r.role,'chip'),el('span','מלאי '+N(stock),'chip'),el('span','בשבוע '+N('+'+r.growth),'chip'));box.append(st);
  const step=el('div',undefined,'stepper');const minus=button('−',()=>{sheetQty=Math.max(1,qty-1);render();}),plus=button('+',()=>{sheetQty=Math.min(max,qty+1);render();}),all=button('מקס',()=>{sheetQty=Math.max(1,max);render();});minus.disabled=qty<=1;plus.disabled=qty>=max;all.disabled=max<=1;step.append(plus,el('b',String(qty)),minus,all);box.append(step);
  const tot=el('div',undefined,'totalrow');tot.append(el('span','סה"כ'),chips({gold:r.gold*qty,ore:r.ore*qty,crystal:r.crystal*qty},town));box.append(tot);
  if(reason)box.append(el('div','⚠ '+reason,'reason'));
  const go=button('גיוס ×'+qty,()=>recruitMany(k,qty),'primary');go.disabled=!!reason||max<1;box.append(go);
 }
 else if(sheet.t==='bld'&&sheet.k==='silo'){
  const lv=Math.min(2,town.silo||0);box.append(el('h2',SILO_NAME,'sheettitle'));const pic=img('mine');pic.className='sheetpic wide mine';box.append(pic);const pips=el('div',undefined,'pips');pips.append(el('span','●'.repeat(lv)+'○'.repeat(2-lv)),el('span',' רמה '+N(lv+'/2')));box.append(pips);
  const yl=(y:any)=>{const c=el('span',undefined,'chips');if(y.ore)c.append(el('span','⛏️ +'+y.ore,'chip num'));if(y.crystal)c.append(el('span','💎 +'+y.crystal,'chip num'));if(!y.ore&&!y.crystal)c.append(el('span','—','chip'));return c;};
  const now=el('div',undefined,'totalrow');now.append(el('span','הכנסה יומית עכשיו'),yl(siloYield[lv]));box.append(now);
  if(lv<2){const cost=siloCosts[lv],c={gold:cost[0],ore:cost[1],crystal:cost[2]},nx=el('div',undefined,'totalrow');nx.append(el('span','אחרי השדרוג'),yl(siloYield[lv+1]));box.append(nx);
   const reason=!atHome?'הגיבור הפעיל מחוץ לבירה':town.builtDay===town.day?'אפשר לבנות רק פעם אחת ביום':(lv===1&&town.level<1)?'לרמה 2 נדרש מרכז העיר ברמה 1':(town.gold<c.gold||town.ore<c.ore||town.crystal<c.crystal)?'אין די משאבים':'';
   const row=el('div',undefined,'totalrow');row.append(el('span',lv?'שדרוג':'בנייה'),chips(c,town));box.append(row);if(reason)box.append(el('div','⚠ '+reason,'reason'));const go=button((lv?'שדרוג ':'בנייה ')+SILO_NAME,()=>action({kind:'silo'}),'primary');go.disabled=!!reason;box.append(go);}
  else box.append(el('div','✔ הגיע לרמה המרבית','chip'));
 }
 else if(sheet.t==='bld'){
  const key=sheet.k as string,isC=key==='center',lv=isC?town.level:(town.buildings[key]||0),b=isC?null:buildings[key];
  box.append(el('h2',names[key],'sheettitle'));
  {const pic=img(artFor(town.faction,key));pic.className='sheetpic wide';box.append(pic);}
  const pips=el('div',undefined,'pips');pips.append(el('span','●'.repeat(lv)+'○'.repeat(2-lv)),el('span',' רמה '+N(lv+'/2')));box.append(pips);
  const reqs=isC?[]:buildingPrerequisites[key],missing=reqs.filter(r=>(town.buildings[r.key]||0)<r.level);
  if(reqs.length){const rr=el('div',undefined,'statusrow');for(const r of reqs)rr.append(el('span',((town.buildings[r.key]||0)>=r.level?'✔ ':'✖ ')+names[r.key]+' '+r.level,'chip'));box.append(rr);}
  if(lv<2){const cost=isC?[10,5,2]:b!.cost[lv],c={gold:cost[0],ore:cost[1],crystal:cost[2]};
   const reason=!atHome?'הגיבור הפעיל מחוץ לבירה':town.builtDay===town.day?'אפשר לבנות רק פעם אחת ביום':missing.length?'חסר: '+missing.map(r=>names[r.key]+' '+r.level).join(', '):(!isC&&lv===1&&town.level<1)?'לרמה 2 נדרש מרכז העיר ברמה 1':(town.gold<c.gold||town.ore<c.ore||town.crystal<c.crystal)?'אין די משאבים':'';
   const row=el('div',undefined,'totalrow');row.append(el('span',lv?'שדרוג':'בנייה'),chips(c,town));box.append(row);if(reason)box.append(el('div','⚠ '+reason,'reason'));
   const go=button((lv?'שדרוג ':'בנייה ')+names[key],()=>action(isC?{kind:'upgrade'}:{kind:'build',unit:key}),'primary');go.disabled=!!reason;box.append(go);}
  else box.append(el('div','✔ הגיע לרמה המרבית','chip'));
  if(isC){const h=town.gold<4?'אין די משאבים':!atHome?'הגיבור הפעיל מחוץ לבירה':'';const heal=button('❤ ריפוי הצבא · 🪙 4',()=>action({kind:'heal'}));heal.disabled=!!h;const hire=button('גיבור נוסף +',()=>action({kind:'hireHero'}));const hc={gold:18,ore:4,crystal:2};hire.disabled=!atHome||town.gold<18||town.ore<4||town.crystal<2;box.append(el('div',undefined,'gap'),heal,hire,chips(hc,town));}
  const us=rosters[town.faction].map((_d,k)=>k).filter(k=>rosters[town.faction][k].building===key);
  if(us.length){box.append(el('h3','גיוס'));const strip=el('div',undefined,'ustrip');us.forEach(k=>strip.append(unitTile(k,()=>{sheet={t:'unit',k};sheetQty=1;render();})));box.append(strip);}
 }
 d.append(box);d.oncancel=e=>{e.preventDefault();closeSheet();};d.addEventListener('click',e=>{if(e.target===d)closeSheet();});app.append(d);d.showModal();}
function campaignHeroes(main:HTMLElement){const {p,inner}=page('גיבורים'),town=g();
 for(const h of town.heroes){const card=el('article',undefined,'card herocard'+(h.id===town.activeHero?' activehero':''));const top=el('div',undefined,'herotop');top.append(img('hero-'+town.faction),el('div'));const info=top.lastElementChild as HTMLElement;info.append(el('h3',h.name),el('div',undefined,'statusrow'));const sr=info.lastElementChild as HTMLElement;sr.append(el('span','⭐ דרגה '+N(h.rank||1),'chip'),el('span','⚡ '+h.ap+'/'+h.maxAp,'chip num'),el('span',h.pos===0?'🏰 בעיר':'🗺 במסע','chip'));card.append(top,slotsRow(h.army.filter(u=>u.hp>0)));
  const b=button(h.id===town.activeHero?'✔ פעיל':'הפעלה',()=>action({kind:'selectHero',hero:h.id}),h.id===town.activeHero?'':'primary');b.disabled=h.id===town.activeHero;card.append(b);inner.append(card);}
 const h=active(town);for(const other of town.heroes.filter(x=>x.id!==h.id&&x.pos===h.pos)){inner.append(el('h3','העברת יחידה אל '+other.name));const row=el('div',undefined,'ustrip');for(const u of town.army.filter(u=>u.hp>0)){const b=el('button',undefined,'utile');b.type='button';b.append(img(art(u.faction||town.faction,u.kind)),el('small',u.name));b.onclick=()=>modal('להעביר את '+u.name+' אל '+other.name+'?',()=>action({kind:'transfer',hero:other.id,unit:u.id}));row.append(b);}inner.append(row);}
 const free=(h.rank||1)-1-(h.talents?.length||0);inner.append(el('h3','שיפורי '+h.name+' · נקודות פנויות: '+Math.max(0,free)));
 const tiles=el('div',undefined,'tiles');for(const [key,icon,name] of [['attack','⚔','התקפה'],['defense','🛡','הגנה'],['specialty','⭐','התמחות']]){const n=(h.talents||[]).filter(t=>t===key).length;const t=button(icon+' '+name+(n?' ×'+n:''),()=>modal('בחירת שיפור קבוע ('+name+')?',()=>action({kind:'talent',unit:key})),'tile');t.disabled=free<=0;tiles.append(t);}inner.append(tiles);
 if(town.relics.length){inner.append(el('h3','ציוד'));const t2=el('div',undefined,'tiles');for(const r of town.relics)t2.append(button('🎒 '+(equipment[r]?.name||r),()=>action({kind:'equip',unit:r}),'tile'));inner.append(t2);}
 inner.append(el('h3','מסורת הממלכה · '),chips({gold:16,ore:6,crystal:4},town));const t3=el('div',undefined,'tiles');for(const [key,icon,name] of [['arms','⚔','כוח'],['bastion','🛡','מגן'],['trade','💰','סחר']])t3.append(button(icon+' '+name,()=>modal('מסורת קבועה: 🪙16 ⛏6 💎4 ופעולה. להמשיך?',()=>action({kind:'doctrine',unit:key})),'tile'));inner.append(t3);
 const det=el('details');det.append(el('summary','יומן'));town.log.forEach(t=>det.append(el('div',t,'log')));inner.append(det);main.append(p);drawSheet();}
function campaignArmy(main:HTMLElement){const {p,inner}=page('הצבא'),town=g(),h=active(town);const st=el('div',undefined,'statusrow');st.append(el('span','🧙 '+h.name,'chip'),el('span','⚡ '+h.ap+'/'+h.maxAp,'chip num'),el('span','יחידות '+N(town.army.filter(u=>u.hp>0).length+'/6'),'chip'));inner.append(st);
 const grid=el('div',undefined,'armygrid');for(const u of town.army){const b=el('button',undefined,'utile army');b.type='button';b.append(img(art(u.faction||town.faction,u.kind)),el('small',u.name));const bar=el('span',undefined,'hpbar flat'),fill=el('i');fill.style.width=Math.max(4,Math.round(100*u.hp/u.max))+'%';bar.append(fill);const stt=el('span',undefined,'chips mini');stt.append(el('span','❤ '+u.hp+'/'+u.max,'chip num'),el('span','⚔ '+u.damage,'chip num'));b.append(bar,stt);b.onclick=()=>{sheet={t:'army',k:u.id};render();};grid.append(b);}inner.append(grid);main.append(p);drawSheet();}
function campaignEconomy(main:HTMLElement){const {p,inner}=page('אוצר ושוק'),town=g(),e=economy(town);
 const inc=el('div',undefined,'statusrow');inc.append(el('span','הכנסה ליום','chip'),chips(e.total));inner.append(inc);
 const t=town.treasury||0;inner.append(el('h3','אוצר הבירה · רמה '+N(t+'/2')));if(t<2){const c=treasuryCosts[t],cc={gold:c[0],ore:c[1],crystal:c[2]},b=button('שדרוג',()=>action({kind:'treasury'}),'tile');b.disabled=town.gold<cc.gold||town.ore<cc.ore||town.crystal<cc.crystal;const r=el('div',undefined,'totalrow');r.append(b,chips(cc,town));inner.append(r);}
 if(e.mines.length){inner.append(el('h3','⛏ מכרות'));for(const s of e.mines){const lv=s.incomeLevel||0,row=el('div',undefined,'totalrow');row.append(el('span',({gold:'🪙',ore:'⛏️',crystal:'💎'} as any)[s.resource||'gold']+' תא '+s.id+' · רמה '+lv));if(lv<2){const c=mineCosts[lv],cc={gold:c[0],ore:c[1],crystal:c[2]},b=button('שדרוג',()=>action({kind:'improveMine'}),'tile');b.disabled=town.gold<cc.gold||town.ore<cc.ore||town.crystal<cc.crystal;row.append(b,chips(cc,town));}inner.append(row);}}
 inner.append(el('h3','⚖ שוק · כל עסקה עולה פעולה'));const mk=el('div',undefined,'tiles');for(const [k,tr] of Object.entries(trades)){const b=button(tr.amount+' '+ICO[tr.from]+'  ←  '+tr.receive+' '+ICO[tr.to],()=>action({kind:'trade',unit:k}),'tile');b.ariaLabel=tr.label;mk.append(b);}inner.append(mk);main.append(p);}
