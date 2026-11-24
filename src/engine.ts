import { rosters, buildingPrerequisites } from './roster';
import { landscape, campaignRules, terrainCatalog } from './catalog';
export type Faction = {
    id: string;
    name: string;
    theme: string;
    units: string[];
    bonus: string;
    accent: string;
};
export const factions: Faction[] = [{ id: 'mars', name: 'משמר מאדים', theme: 'דינוזאורים, רובוטיקה וחוקרי חלל', units: ['סייר מאדים', 'דינו משוריין', 'רובוט הד'], bonus: 'לוחמי החזית מתחילים עם עוד 2 כוח.', accent: '#bb7956' }, { id: 'crystal', name: 'ברית הגבישים', theme: 'יצורים גבישיים ושומרי תהודה. פיירוקריסטל שייך לעולם המשותף, אינו אישור לפלג נפרד.', units: ['גשש מנסרה', 'שומר קוורץ', 'קשת תהודה'], bonus: 'המצפה מעניק עוד 2 גבישים.', accent: '#7aabad' }, { id: 'tide', name: 'שומרי הגאות', theme: 'ארכיפלג גאות וכבידה, שריון קובלט ומכונות גירוסקופיות. עולם רביעי מקורי.', units: ['נווט שונית', 'סרטן פלדה', 'קלע זרמים'], bonus: 'יחידות הטווח גורמות עוד נזק אחד.', accent: '#528d97' }, { id: 'grove', name: 'ברית היער הנע', theme: 'ספריית יער חיה, עצים נודדים וחרקי אור המשמרים זיכרונות. העולם של נועה.', units: ['גשש עלה', 'אלון נודד', 'קלע גחליליות'], bonus: 'כל צבא מתחיל עם עוד 2 כוח.', accent: '#799061' }];
export type Unit = {
    id: string;
    kind: number;
    name: string;
    side: number;
    pos: number;
    hp: number;
    max: number;
    range: number;
    damage: number;
    faction?: string;
    charge?: number;
    used?: boolean;
    baseDamage?: number;
    baseRange?: number;
};
export type Hero = {
    id: string;
    name: string;
    title: string;
    specialty: 'scout' | 'warden' | 'artificer';
    pos: number;
    army: Unit[];
    ap: number;
    maxAp: number;
    xp?: number;
    rank?: number;
    attack?: number;
    defense?: number;
    talents?: string[];
    equipment?: 'lens' | 'shield' | 'coil';
};
export type Site = {
    incomeLevel?: number;
    id: number;
    type: 'base' | 'mine' | 'cache' | 'quest' | 'ruin' | 'gate' | 'factory' | 'sanctuary' | 'gravity' | 'hatchery' | 'relic' | 'camp' | 'spring' | 'beacon';
    resource?: 'gold' | 'ore' | 'crystal';
    stock?: number;
    done: boolean;
    owner: boolean;
    guard: number;
};
export type Rival = {
    id: number;
    capital: number;
    faction: string;
    pos: number;
    gold: number;
    ore: number;
    level: number;
    army: Unit[];
    mines: number[];
    defeated: boolean;
    cooldown: number;
    turns: number;
    siegeDays: number;
};
export type Game = {
    rulesRevision?: 2; roads?: number[]; recruitmentStock?: number[]; builtDay?: number;
    treasury?: number;
    lastIncome?: {
        day: number;
        gold: number;
        ore: number;
        crystal: number;
    };
    version: 6;
    worldSize?: number;
    doctrine?: 'arms' | 'bastion' | 'trade';
    buildings: Record<string, number>;
    relics: string[];
    heroes: Hero[];
    activeHero: string;
    serial: number;
    rivals: Rival[];
    seed: number;
    faction: string;
    pos: number;
    seen: number[];
    terrain: number[];
    sites: Site[];
    gold: number;
    ore: number;
    crystal: number;
    day: number;
    level: number;
    army: Unit[];
    battle: null | {
        site: number;
        units: Unit[];
        selected: string;
        round: number;
        rival?: number;
        siege?: boolean;
        roaming?: boolean;
    };
    log: string[];
    quests: number;
    victories: number;
    finished: boolean;
    lost: boolean;
};
export const distance = (a: number, b: number, w = 10) => Math.abs(a % w - b % w) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
export const worldSize = (g: Pick<Game, 'terrain'>) => Math.round(Math.sqrt(g.terrain.length));
export const attackReach = (a: number, b: number, w = 10) => Math.max(Math.abs(a % w - b % w), Math.abs(Math.floor(a / w) - Math.floor(b / w))) <= 1;
export function rng(seed: number) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
export const faction = (g: Game) => factions.find(x => x.id === g.faction) || factions[0];
export function recruitUnit(g: Pick<Game, 'faction' | 'level'>, kind: number, id: string): Unit { const f = factions.find(x => x.id === g.faction) || factions[0]; const max = [8, 14, 7][kind] + g.level * 2 + (f.id === 'grove' ? 2 : 0) + (f.id === 'mars' && kind === 1 ? 2 : 0); return { id, kind, faction: f.id, name: f.units[kind], side: 0, pos: 0, hp: max, max, range: kind === 2 ? 3 : 1, damage: [3, 4, 2][kind] + (f.id === 'tide' && kind === 2 ? 1 : 0) }; }
const neighbors = (n: number, w = 10, max = 100) => [n - w, n + w, n - 1, n + 1].filter(x => x >= 0 && x < max && distance(n, x, w) === 1);
function reveal(g: Game, n: number, radius = 1) { g.seen = Array.from(new Set([...g.seen, ...Array.from({ length: g.terrain.length }, (_, i) => i).filter(i => Math.max(Math.abs(i % worldSize(g) - n % worldSize(g)), Math.abs(Math.floor(i / worldSize(g)) - Math.floor(n / worldSize(g)))) <= radius)])); }
function createBase(seed: number, f = 'mars', size = 18): Game { const r = rng(seed), last = size * size - 1, south = size * (size - 1); const g: Game = { version: 6, worldSize: size, buildings: { barracks: 0, workshop: 0, observatory: 0, sanctuary: 0 }, relics: [], heroes: [], activeHero: 'hero-0', serial: 10, rivals: factions.filter(x => x.id !== f).slice(0, 2).map((x, i) => ({ id: i, capital: [last, south][i], faction: x.id, pos: [last, south][i], gold: 12, ore: 4, level: 0, army: [], mines: [], defeated: false, cooldown: 0, turns: 0, siegeDays: 0 })), seed, faction: f, pos: 0, seen: [], terrain: Array.from({ length: size * size }, () => Math.floor(r() * 4)), sites: [{ id: 0, type: 'base', done: false, owner: true, guard: 0 }, { id: last, type: 'gate', done: false, owner: false, guard: 3 }, { id: south, type: 'gate', done: false, owner: false, guard: 3 }], gold: 12, ore: 4, crystal: 0, day: 1, level: 0, army: [], battle: null, log: ['הממלכה הוקמה. חקרו את האזור, כבשו מכרות ובנו צבא.'], quests: 0, victories: 0, finished: false, lost: false }; if (size > 10) {
    const regions = Array.from({ length: Math.ceil(size / 3) ** 2 }, () => Math.floor(r() * 4));
    g.terrain = g.terrain.map((t, n) => r() < .12 ? t : regions[Math.floor(n % size / 3) + Math.floor(Math.floor(n / size) / 3) * Math.ceil(size / 3)]);
} const used = new Set([0, 1, size, last, south]); for (const [type, count, guard] of [['mine', 9, 1], ['cache', 5, 0], ['quest', 3, 0], ['ruin', 3, 2], ['factory', 2, 1], ['sanctuary', 2, 1], ['gravity', 1, 2], ['hatchery', 1, 2], ['relic', 3, 1], ['camp', size > 10 ? 7 : 0, 0], ['spring', size > 10 ? 4 : 0, 0], ['beacon', size > 10 ? 4 : 0, 0]] as const) {
    for (let k = 0; k < (size > 10 && type === 'mine' ? 18 : size > 10 && type === 'cache' ? 9 : count); k++) {
        let n;
        do
            n = 2 + Math.floor(r() * (size * size - 4));
        while (used.has(n));
        used.add(n);
        g.sites.push({ id: n, type, done: false, owner: false, guard: type === 'mine' && k < 2 ? 0 : guard, ...(type === 'mine' ? { resource: (['gold', 'ore', 'crystal'] as const)[k % 3] } : {}), ...(['factory', 'sanctuary', 'gravity', 'hatchery'].includes(type) ? { stock: 2 } : {}) });
    }
} g.rivals.forEach(v => { v.army = [0, 1, 2].map((k, i) => ({ ...recruitUnit({ faction: v.faction, level: 0 }, k, 'rival-' + v.id + '-' + i), side: 1 })); }); g.army = [0, 1, 2].map((k, i) => recruitUnit(g, k, 'unit-' + i)); reveal(g, 0, size > 10 ? 3 : 1); g.seen.push(south, last); return g; }
export function economy(g: Game) { const level = g.treasury || 0; const base = { gold: 2 + level * 2, ore: 1, crystal: level }; const mines = g.sites.filter(s => s.type === 'mine' && s.owner && !g.rivals.some(r => !r.defeated && r.mines.includes(s.id))); const total = { ...base }; for (const s of mines)
    total[s.resource || 'gold'] += (s.resource === 'crystal' ? 1 : 2) + (s.incomeLevel || 0); return { base, mines, total }; }
export const treasuryCosts = [[12, 6, 0], [24, 10, 4]];
export const mineCosts = [[8, 4, 0], [14, 6, 2]];
export const trades: Record<string, {
    label: string;
    from: 'gold' | 'ore' | 'crystal';
    amount: number;
    to: 'gold' | 'ore' | 'crystal';
    receive: number;
}> = { ore: { label: 'קניית 2 עפרות: 4 זהב', from: 'gold', amount: 4, to: 'ore', receive: 2 }, crystal: { label: 'קניית גביש: 6 זהב', from: 'gold', amount: 6, to: 'crystal', receive: 1 }, sellOre: { label: 'מכירת 2 עפרות: זהב אחד', from: 'ore', amount: 2, to: 'gold', receive: 1 }, sellCrystal: { label: 'מכירת גביש: 2 זהב', from: 'crystal', amount: 1, to: 'gold', receive: 2 } };
function income(g: Game) { if(g.rulesRevision===2 && (g.day-1)%7===0){g.recruitmentStock=rosters[g.faction].map((d,k)=>Math.min(20,(g.recruitmentStock?.[k]||0)+d.growth+Number(g.buildings.barracks>=2)));}
 const n = economy(g).total; g.gold += n.gold; g.ore += n.ore; g.crystal += n.crystal; g.lastIncome = { day: g.day, ...n }; if (g.day % 3 === 0)
    for (const s of g.sites.filter(s => s.stock !== undefined))
        s.stock = Math.min(3, s.stock! + 1); }
function addlog(g: Game, m: string) { g.log = [m, ...g.log].slice(0, 8); }
function startBattle(g: Game, site: Site) { const friendly = equipped(g, g.army.filter(x => x.hp > 0)).map((u, i) => ({ ...u, pos: [6, 12, 18, 0, 24, 7][i] })); if (!friendly.length)
    throw Error('אין יחידות פעילות. חזרו למרכז כדי לגייס.'); const number = site.type === 'gate' ? 4 : site.guard + 1; const enemy = Array.from({ length: number }, (_, i): Unit => ({ id: 'enemy-' + i, kind: i % 3, name: ['זקיף בזלת', 'רחפן אבק', 'שומר רכס'][i % 3], side: 1, pos: [11, 17, 23, 5][i], hp: 7 + site.guard * 2, max: 7 + site.guard * 2, range: i % 3 === 1 ? 2 : 1, damage: 2 + Number(site.type === 'gate') })); g.battle = { site: site.id, units: [...friendly, ...enemy], selected: friendly[0].id, round: 1 }; addlog(g, 'הקרב החל. כל פקודה שלכם נענית בפעולה של יחידת אויב אחת, בסבב מתחלף.'); }
export type Action = {
    hero?: string;
    kind: string;
    target?: number;
    unit?: string;
    enemy?: string;
    unitKind?: number;
};
function core(old: Game, a: Action): Game {
    const g: Game = JSON.parse(JSON.stringify(old));
    if (g.lost)
        throw Error('מרכז הממלכה נכבש. התחילו מערכה חדשה.');
    if (g.battle) {
        const result = a.kind === 'auto' ? autoBattle(g) : combat(g, a);
        if (!result.battle)
            stripEquipment(result);
        return result;
    }
    const at = g.sites.find(s => s.id === g.pos);
    if (a.kind === 'assault') {
        const r = g.rivals.find(r => r.capital === a.target && !r.defeated);
        if (!r || !attackReach(g.pos, r.capital, worldSize(g)))
            throw Error('התקרבו למשבצת שמסביב לעיר, כולל אלכסון');
        if (!g.army.some(u => u.hp > 0))
            throw Error('אין צבא פעיל. גייסו במרכז');
        rivalBattle(g, r, true);
        return g;
    }
    if (a.kind === 'engage') {
        const r = g.rivals.find(r => r.id === a.target && !r.defeated);
        if (!r || !attackReach(g.pos, r.pos, worldSize(g)))
            throw Error('התקרבו עד משבצת אחת לצבא המחשב');
        if (!g.army.some(u => u.hp > 0))
            throw Error('אין צבא פעיל. גייסו במרכז');
        rivalBattle(g, r, false);
        if (!g.battle)
            throw Error('לצבא המחשב אין יחידות פעילות כרגע');
        return g;
    }
    if (a.kind === 'move') {
        const n = a.target!;
        const city = g.rivals.find(r => !r.defeated && r.capital === n);
        const enemy = g.rivals.find(r => !r.defeated && r.pos === n && r.army.some(u => u.hp > 0));
        if (city || enemy) {
            if (!attackReach(g.pos, n, worldSize(g)))
                throw Error('התקרבו לאחת משמונה המשבצות סביב האויב');
            if (!g.army.some(u => u.hp > 0))
                throw Error('אין צבא פעיל. גייסו במרכז');
            reveal(g, n);
            rivalBattle(g, (city || enemy)!, !!city);
            return g;
        }
        if (!(g.rulesRevision === 2 ? worldNeighbors(g.pos, worldSize(g)) : neighbors(g.pos, worldSize(g), g.terrain.length)).includes(n))
            throw Error('בחרו משבצת צמודה לתנועה');
        const cost = movementCost(g, g.pos, n);
        if (active(g).ap < cost) throw Error('אין די נקודות תנועה ליעד. סיימו יום או בחרו דרך קלה יותר');
        g.pos = n;
        advance(g, cost);
        reveal(g, n, g.level >= 2 ? 2 : 1);
        if (!g.battle)
            addlog(g, 'המשלחת התקדמה. נותרו ' + active(g).ap + ' פעולות היום.');
    }
    else if (a.kind === 'visit') {
        if (!at)
            throw Error('אין כאן אתר');
        if (at.type === 'base') {
            addlog(g, 'מרכז הממלכה. אפשר לגייס, לשדרג ולרפא.');
            return g;
        }
        if (at.done || at.owner)
            throw Error('האתר כבר הושלם או נמצא בבעלותכם');
        if (at.type === 'gate') {
            const r = g.rivals.find(r => r.capital === at.id)!;
            if (r.defeated)
                throw Error('ממלכת היריב כבר נכבשה');
            rivalBattle(g, r, true);
            return g;
        }
        if (at.guard > 0) {
            startBattle(g, at);
            return g;
        }
        resolve(g, at);
        advance(g);
    }
    else if (['recruit', 'upgrade', 'heal'].includes(a.kind)) {
        if (g.pos !== 0 && !g.sites.some(s => s.id === g.pos && s.type === 'gate' && s.done))
            throw Error('הפעולה זמינה במרכז שלכם או בבירה שנכבשה בלבד');
        if (a.kind === 'recruit') {
            const k = a.unitKind!;
            if (![0, 1, 2].includes(k))
                throw Error('סוג יחידה לא תקין');
            if (g.army.filter(u => u.hp > 0).length >= 6)
                throw Error('הצבא מלא, עד שש יחידות');
            const price = [5, 8, 7][k];
            if (g.gold < price || g.ore < 2)
                throw Error('אין די משאבים לגיוס');
            g.gold -= price;
            g.ore -= 2;
            g.army = g.army.filter(x => x.hp > 0);
            g.army.push(recruitUnit(g, k, 'unit-' + g.serial++));
            addlog(g, 'גויסה יחידה: ' + faction(g).units[k]);
        }
        else if (a.kind === 'upgrade') {
            if (g.level >= 2)
                throw Error('המרכז ברמה המרבית');
            if (g.gold < 10 || g.ore < 5 || g.crystal < 2)
                throw Error('נדרשים 10 זהב, 5 עפרות ושני גבישים');
            g.gold -= 10;
            g.ore -= 5;
            g.crystal -= 2;
            g.level++;
            g.army.filter(u => u.hp > 0).forEach(u => { u.max += 2; u.hp += 2; });
            addlog(g, g.level === 1 ? 'המרכז שודרג. לכל היחידות נוספו 2 כוח.' : 'מרכז רמה 2: עוד 2 כוח וחקירה ברדיוס כפול.');
        }
        else {
            if (g.gold < 4)
                throw Error('נדרשים 4 זהב לריפוי');
            if (!g.army.some(u => u.hp > 0 && u.hp < u.max))
                throw Error('היחידות הפעילות כבר בריאות');
            g.gold -= 4;
            g.army.filter(u => u.hp > 0).forEach(u => u.hp = u.max);
            addlog(g, 'היחידות הפעילות החלימו. יחידות שאבדו לא קמו לתחייה.');
        }
        advance(g);
    }
    else if (a.kind === 'wait') {
        if (!g.sites.some(s => s.type === 'mine' && s.owner))
            throw Error('כבשו מכרה כדי להפיק הכנסה');
        advance(g);
        addlog(g, 'יום המתנה. המכרות הפיקו משאבים.');
    }
    else
        throw Error('פעולה לא זמינה');
    if (!g.battle && !g.lost && g.pos !== 0) {
        const r = g.rivals.find(r => !r.defeated && g.pos === r.pos && g.day > r.cooldown);
        if (r)
            rivalBattle(g, r, false);
    }
    return g;
}
function resolve(g: Game, s: Site) { if (s.type === 'camp') {
    s.done = true;
    g.gold += 7;
    g.ore += 3;
    addlog(g, 'מחנה משלחת נמצא: 7 זהב ו-3 עפרות.');
}
else if (s.type === 'spring') {
    s.done = true;
    for (const u of g.army.filter(u => u.hp > 0))
        u.hp = Math.min(u.max, u.hp + 6);
    addlog(g, 'מעיין כוכבים: עד 6 חיים הושבו לכל שורד.');
}
else if (s.type === 'beacon') {
    s.done = true;
    g.crystal += 2;
    reveal(g, g.pos, 4);
    addlog(g, 'מגדל אות התעורר: 2 גבישים והסביבה נחשפה ברדיוס 4.');
}
else if (s.type === 'mine') {
    g.rivals.forEach(r => r.mines = r.mines.filter(n => n !== s.id));
    s.owner = true;
    s.done = true;
    g.ore += 3;
    addlog(g, 'מכרה נכבש. ההכנסה תתקבל בסיום יום: ' + (s.resource === 'crystal' ? 'גביש אחד' : s.resource === 'ore' ? 'שתי עפרות' : 'שני זהב') + '.');
}
else if (['factory', 'sanctuary', 'gravity', 'hatchery'].includes(s.type)) {
    s.done = true;
    s.owner = true;
    s.guard = 0;
    addlog(g, 'אתר גיוס שוחרר. אפשר לגייס מהמלאי תמורת משאבים; יחידה חדשה כל שלושה ימים, עד שלוש.');
}
else if (s.type === 'relic') {
    s.done = true;
    const relic = ['lens', 'shield', 'coil'][g.relics.length % 3];
    if (!g.relics.includes(relic))
        g.relics.push(relic);
    addlog(g, 'נמצא ציוד קדום. אפשר לצייד את הגיבור בלשונית הממלכה והציוד.');
}
else if (s.type === 'cache') {
    s.done = true;
    const c = 4 + (g.faction === 'crystal' ? 2 : 0);
    g.crystal += c;
    g.gold += 4;
    addlog(g, 'מצפה נחשף: ' + c + ' גבישים ו-4 זהב.');
}
else if (s.type === 'quest') {
    s.done = true;
    g.quests++;
    g.gold += 8;
    g.ore += 2;
    reveal(g, g.pos, 3);
    addlog(g, 'משימת הסקר הושלמה: 8 זהב, 2 עפרות וחשיפת הסביבה.');
}
else if (s.type === 'ruin') {
    s.done = true;
    g.crystal += 5;
    g.gold += 10;
    addlog(g, 'החורבה טוהרה: 10 זהב ו-5 גבישים.');
}
else if (s.type === 'gate') {
    s.done = true;
    g.finished = true;
    g.gold += 20;
    addlog(g, 'מצודת המעבר נכבשה. הממלכה ניצחה במערכה הזאת. אפשר להמשיך לחקור.');
} }
function combat(g: Game, a: Action): Game {
    const b = g.battle!;
    if (a.kind === 'retreat') {
        if (b.rival !== undefined) {
            const r = g.rivals[b.rival];
            if (b.roaming)
                r.army = b.units.filter(u => u.side === 1 && u.hp > 0 && !u.id.startsWith('garrison-'));
            r.cooldown = g.day + 5;
        }
        g.army = b.units.filter(u => u.side === 0).map(u => ({ ...u }));
        g.pos = 0;
        g.battle = null;
        advance(g);
        addlog(g, 'נסגתם למרכז עם היחידות ששרדו.');
        return g;
    }
    const u = b.units.find(u => u.id === a.unit && u.side === 0 && u.hp > 0);
    if (!u)
        throw Error('בחרו יחידה פעילה');
    if (a.kind === 'march') {
        if (!neighbors(u.pos, 6, 30).includes(a.target!) || b.units.some(x => x.hp > 0 && x.pos === a.target))
            throw Error('בחרו עמדה סמוכה ופנויה');
        u.pos = a.target!;
    }
    else if (a.kind === 'strike') {
        const e = b.units.find(x => x.id === a.enemy && x.side === 1 && x.hp > 0);
        if (!e || distance(u.pos, e.pos, 6) > u.range)
            throw Error('האויב מחוץ לטווח');
        hit(g, u, e, u.damage);
    }
    else if (a.kind === 'ability') {
        useAbility(g, u, a.enemy);
    }
    else
        throw Error('פקודת קרב לא תקינה');
    if (!b.units.some(u => u.side === 1 && u.hp > 0)) {
        g.army = b.units.filter(u => u.side === 0);
        g.battle = null;
        g.victories++;
        if (b.rival !== undefined) {
            const r = g.rivals[b.rival];
            r.army = [];
            r.pos = r.capital;
            r.cooldown = g.day + 8;
            if (b.siege) {
                r.defeated = true;
                r.mines = [];
                g.finished = g.rivals.every(r => r.defeated);
                g.sites.find(s => s.id === r.capital)!.done = true;
                addlog(g, g.finished ? 'כל ממלכות המחשב נכבשו. ניצחתם במערכה!' : 'ממלכת ' + factions.find(f => f.id === r.faction)!.name + ' נכבשה. נותרה ממלכה אחת.');
            }
            else
                addlog(g, 'צבא המחשב הובס. ממלכתו תנסה לבנות צבא חדש.');
        }
        else
            resolve(g, g.sites.find(s => s.id === b.site)!);
        advance(g);
        addlog(g, 'ניצחון בקרב. ' + g.log[0]);
        return g;
    }
    const enemies = b.units.filter(x => x.side === 1 && x.hp > 0);
    const responder = enemies[(b.round - 1) % enemies.length];
    for (const e of responder ? [responder] : []) {
        const targets = b.units.filter(x => x.side === 0 && x.hp > 0).sort((x, y) => distance(e.pos, x.pos, 6) - distance(e.pos, y.pos, 6));
        const t = targets[0];
        if (!t)
            break;
        if (distance(e.pos, t.pos, 6) <= e.range)
            hit(g, e, t, e.damage);
        else {
            const ns = neighbors(e.pos, 6, 30).filter(n => !b.units.some(x => x.hp > 0 && x.pos === n)).sort((x, y) => distance(x, t.pos, 6) - distance(y, t.pos, 6));
            if (ns.length)
                e.pos = ns[0];
        }
    }
    b.round++;
    addlog(g, 'סבב ' + b.round + ': ' + u.name + ' פעל, והאויב השיב.');
    if (!b.units.some(u => u.side === 0 && u.hp > 0)) {
        if (b.rival !== undefined) {
            const r = g.rivals[b.rival];
            if (b.roaming)
                r.army = b.units.filter(u => u.side === 1 && u.hp > 0 && !u.id.startsWith('garrison-'));
            r.cooldown = g.day + 6;
        }
        g.army = [];
        g.battle = null;
        g.pos = 0;
        g.gold += 5;
        g.ore += 2;
        advance(g);
        addlog(g, 'הצבא הובס ונסוג למרכז. מענק חירום חד-קרבי: 5 זהב ו-2 עפרות לגיוס מחדש.');
    }
    return g;
}
function rivalUnit(g:Game,r:Rival,k:number,id:string){return g.rulesRevision===2?campaignUnit({...g,faction:r.faction,level:r.level},k,id):recruitUnit({faction:r.faction,level:r.level},k,id);}
function rivalBattle(g: Game, r: Rival, siege: boolean) {
    const own = g.army.filter(u => u.hp > 0);
    if (!own.length) {
        addlog(g, 'צבא המחשב נמצא בקרבתכם. גייסו במרכז לפני יציאה.');
        return;
    }
    let foes = (siege && r.pos !== r.capital ? [] : r.army).filter(u => u.hp > 0).map(u => ({ ...u }));
    if (siege) {
        const guard = [0, 1].map((k, i) => ({ ...rivalUnit(g,r,k,'garrison-' + r.id + '-' + i), side: 1 }));
        foes = [...foes, ...guard].slice(0, 6);
    }
    if (!foes.length)
        return;
    g.battle = { site: siege ? r.capital : r.pos, units: [...equipped(g, own).map((u, i) => ({ ...u, pos: [6, 12, 18, 0, 24, 7][i] })), ...foes.map((u, i) => ({ ...u, side: 1, pos: [11, 17, 23, 5, 29, 10][i] }))], selected: own[0].id, round: 1, rival: r.id, siege, roaming: !siege || r.pos === r.capital };
    addlog(g, siege ? 'המצור על מרכז ממלכת המחשב החל.' : 'מפגש עם הצבא הנע של המחשב. הקרב החל.');
}
function advance(g: Game, cost = 1) { const h = g.heroes.find(h => h.id === g.activeHero); if (h)
    h.ap = Math.max(0, h.ap - cost); }
function worldDay(g: Game) {
    g.day++;
    income(g);
    if (g.battle || g.lost)
        return;
    // Both kingdoms receive their economy before either can start a battle.
    for (const r of g.rivals.filter(r => !r.defeated)) {
        r.turns++;
        r.gold += 1 + r.mines.length;
        r.ore += r.mines.length + Number(g.day % 3 === 0);
        if (g.day % 5 === 0 && r.gold >= 10 && r.ore >= 4 && r.level < 1) {
            r.gold -= 10;
            r.ore -= 4;
            r.level++;
            r.army.forEach(u => { u.hp += 2; u.max += 2; });
        }
        if (r.pos === r.capital) {
            if (r.army.some(u => u.hp < u.max) && r.gold >= 4) {
                r.gold -= 4;
                r.army.forEach(u => u.hp = u.max);
            }
            if (r.army.length < 6 && r.gold >= 8 && r.ore >= 2) {
                r.gold -= 8;
                r.ore -= 2;
                r.army.push({ ...rivalUnit(g,r,g.rulesRevision===2&&r.level>0&&r.turns>20?3+r.turns%5:r.turns%3,'rival-' + r.id + '-recruit-' + r.turns), side: 1 });
            }
        }
    }
    for (const r of g.rivals.filter(r => !r.defeated)) {
        if (!r.army.length || g.day <= r.cooldown || g.day % 2 === 0)
            continue;
        let target: number;
        const weak = r.army.reduce((a, u) => a + u.hp, 0) < 14;
        if (weak || (r.army.length < 4 && r.gold >= 8 && r.ore >= 2))
            target = r.capital;
        else if (g.day > 180 * worldSize(g) / 10 && r.army.length >= 4)
            target = 0;
        else {
            const goals = g.sites.filter(s => s.type === 'mine' && !r.mines.includes(s.id)).sort((a, b) => distance(r.pos, a.id, worldSize(g)) - distance(r.pos, b.id, worldSize(g)));
            const expedition = g.heroes.filter(h => h.pos !== 0 && h.army.some(u => u.hp > 0)).sort((a, b) => distance(r.pos, a.pos, worldSize(g)) - distance(r.pos, b.pos, worldSize(g)))[0];
            target = g.day > 35 * worldSize(g) / 10 && expedition ? expedition.pos : (goals[0]?.id ?? r.capital);
        }
        if (r.pos !== target) {
            const ns = neighbors(r.pos, worldSize(g), g.terrain.length).sort((a, b) => distance(a, target, worldSize(g)) - distance(b, target, worldSize(g)));
            r.pos = ns[0];
        }
        const site = g.sites.find(s => s.id === r.pos && s.type === 'mine');
        if (site && !r.mines.includes(site.id)) {
            const strength = r.army.reduce((a, u) => a + u.hp, 0);
            if (strength >= site.guard * 12 + 10) {
                if (site.guard > 0)
                    r.army.forEach(u => u.hp = Math.max(1, u.hp - site.guard));
                site.owner = false;
                site.guard = 0;
                site.done = false;
                g.rivals.forEach(other => other.mines = other.mines.filter(n => n !== site.id));
                r.mines.push(site.id);
                addlog(g, 'מחשב ' + (r.id + 1) + ': מכרה בתא ' + site.id + ' עבר לשליטת ' + factions.find(f => f.id === r.faction)!.name + '.');
            }
        }
        if (r.pos === 0 && r.army.length >= 4) {
            r.siegeDays++;
            addlog(g, 'מרכזכם במצור של מחשב ' + (r.id + 1) + '. נותרו ' + (4 - r.siegeDays) + ' תורי תנועה עד לכיבוש.');
            if (r.siegeDays >= 4) {
                g.lost = true;
                addlog(g, 'ממלכת המחשב כבשה את המרכז. המערכה הסתיימה בהפסד.');
            }
            else if (g.pos === 0 && !g.battle)
                rivalBattle(g, r, false);
        }
        else
            r.siegeDays = 0;
        if (!g.battle && !g.lost && g.day > r.cooldown) {
            const contacted = g.heroes.find(h => h.pos === r.pos && (h.pos !== 0 || r.siegeDays > 0) && h.army.some(u => u.hp > 0));
            if (contacted) {
                sync(g);
                select(g, contacted);
                rivalBattle(g, r, false);
            }
        }
    }
}
function autoBattle(g: Game): Game { const start = g.army.filter(u => u.hp > 0).length; for (let turn = 0; g.battle && turn < 1200; turn++) {
    const b = g.battle, us = b.units.filter(u => u.side === 0 && u.hp > 0), es = b.units.filter(u => u.side === 1 && u.hp > 0);
    let action: Action | undefined;
    for (const u of us) {
        const d = ability(g, u);
        if (!d || u.used)
            continue;
        if (d.range === 0 && u.hp < u.max) {
            action = { kind: 'ability', unit: u.id };
            break;
        }
        const target = es.filter(e => distance(u.pos, e.pos, 6) <= d.range).sort((a, b) => a.hp - b.hp)[0];
        if (d.range > 0 && target) {
            action = { kind: 'ability', unit: u.id, enemy: target.id };
            break;
        }
    }
    if (!action)
        for (const u of [...us].sort((a, b) => b.damage - a.damage)) {
            const e = es.filter(e => distance(u.pos, e.pos, 6) <= u.range).sort((a, b) => a.hp - b.hp)[0];
            if (e) {
                action = { kind: 'strike', unit: u.id, enemy: e.id };
                break;
            }
        }
    if (!action) {
        let best: {
            d: number;
            u: Unit;
            n: number;
        } | undefined;
        for (const u of us)
            for (const n of neighbors(u.pos, 6, 30)) {
                if (b.units.some(x => x.hp > 0 && x.pos === n))
                    continue;
                const d = Math.min(...es.map(e => distance(n, e.pos, 6)));
                if (!best || d < best.d)
                    best = { d, u, n };
            }
        if (best)
            action = { kind: 'march', unit: best.u.id, target: best.n };
    }
    if (!action)
        throw Error('אין הכרעה אוטומטית זמינה. המשיכו ידנית או נסוגו.');
    combat(g, action);
} if (g.battle)
    throw Error('הקרב האוטומטי לא הוכרע. המשיכו ידנית או נסוגו.'); const survivors = g.army.filter(u => u.hp > 0).length; addlog(g, 'קרב אוטומטי הושלם. שרדו ' + survivors + ' מתוך ' + start + ' יחידות. ' + g.log[0]); return g; }
export const heroNames: Record<string, string[]> = { mars: ['תמר אופק', 'ארד גלגל', 'נרי שביט'], crystal: ['ליר מנסרה', 'אורן קוורץ', 'תיאה תהודה'], grove: ['עדה שורש', 'רון עלווה', 'נויה גחליל'], tide: ['מירה גאות', 'קאי ירחון', 'זיו מסלול'] };
export const specialSites: Record<string, {
    name: string;
    unit: string;
    kind: number;
    gold: number;
    ore: number;
    crystal: number;
    hp: number;
    damage: number;
    range: number;
}> = { factory: { name: 'מפעל גלגלי השחר', unit: 'טריצרטופס מכני', kind: 3, gold: 10, ore: 4, crystal: 0, hp: 20, damage: 5, range: 1 }, sanctuary: { name: 'חורשת כנפי הזיכרון', unit: 'עש גחליליות', kind: 4, gold: 8, ore: 0, crystal: 3, hp: 10, damage: 3, range: 3 }, gravity: { name: 'מספנת הירח הצף', unit: 'מנטת כבידה', kind: 5, gold: 10, ore: 2, crystal: 3, hp: 13, damage: 4, range: 2 }, hatchery: { name: 'מדגרת המנסרות', unit: 'ארמדיל קוורץ', kind: 6, gold: 8, ore: 3, crystal: 2, hp: 22, damage: 4, range: 1 } };
export const pyro = { name: 'מדגרת המנסרות', unit: 'פיירוקריסטל', kind: 7, gold: 18, ore: 5, crystal: 6, hp: 24, damage: 4, range: 1 };
function sync(g: Game) { const h = g.heroes.find(h => h.id === g.activeHero)!; h.pos = g.pos; h.army = g.army; for (const x of g.heroes.filter(x => x.id !== g.activeHero))
    x.army = x.army.filter(u => u.hp > 0); }
function select(g: Game, h: Hero) { g.activeHero = h.id; g.pos = h.pos; g.army = h.army; }
export function active(g: Game) { return g.heroes.find(h => h.id === g.activeHero)!; }
export function create(seed: number, f = 'mars', size = 18, opponents = 2): Game { if (![1, 2].includes(opponents))
    throw Error('בחרו יריב אחד או שניים'); const g = createBase(seed, f, size); g.rivals = g.rivals.slice(0, opponents); g.sites = g.sites.filter(s => s.type !== 'gate' || g.rivals.some(r => r.capital === s.id)); g.army.forEach(u => { u.hp += 2; u.max += 2; }); g.heroes = [{ id: 'hero-0', name: heroNames[f][0], title: 'מגינת המצפה', specialty: 'warden', pos: 0, army: g.army, ap: 3, maxAp: 3 }]; return g; }
function actCore(old: Game, a: Action): Game {
    let g: Game = JSON.parse(JSON.stringify(old));
    normalize(g);
    sync(g);
    if (g.lost)
        throw Error('הממלכה נפלה. התחילו מערכה חדשה.');
    if (a.kind === 'selectHero') {
        if (g.battle)
            throw Error('סיימו את הקרב לפני החלפת משלחת');
        const h = g.heroes.find(h => h.id === a.hero);
        if (!h)
            throw Error('גיבור לא נמצא');
        select(g, h);
        return g;
    }
    if (a.kind === 'endDay') {
        if (g.battle)
            throw Error('סיימו את הקרב לפני סיום היום');
        for (const h of g.heroes)
            h.ap = h.maxAp;
        worldDay(g);
        sync(g);
        if (!g.battle && !g.lost) {
            for (const h of g.heroes) {
                const r = g.rivals.find(r => !r.defeated && r.pos === h.pos && (h.pos !== 0 || r.siegeDays > 0) && g.day > r.cooldown);
                if (r && h.army.some(u => u.hp > 0)) {
                    select(g, h);
                    rivalBattle(g, r, false);
                    break;
                }
            }
        }
        if (!g.battle)
            addlog(g, 'יום ' + g.day + ': התקבלו ' + g.lastIncome!.gold + ' זהב, ' + g.lastIncome!.ore + ' עפרות, ' + g.lastIncome!.crystal + ' גבישים. התנועה חודשה.');
        return g;
    }
    const h = active(g);
    if (a.kind === 'talent') {
        if (g.battle)
            throw Error('דרגות בוחרים מחוץ לקרב');
        const k = a.unit!;
        if (!['attack', 'defense', 'specialty'].includes(k) || (h.talents?.length || 0) >= (h.rank || 1) - 1)
            throw Error('אין נקודת דרגה פנויה');
        if (k === 'specialty' && h.specialty === 'scout' && specialtyLevel(h) >= 1)
            throw Error('התמחות הסייר כבר ברדיוס המרבי');
        h.talents!.push(k);
        if (k === 'attack')
            h.attack = (h.attack || 0) + 1;
        if (k === 'defense')
            h.defense = (h.defense || 0) + 1;
        addlog(g, 'נבחר שיפור דרגה: ' + (k === 'attack' ? 'התקפה' : k === 'defense' ? 'הגנה' : 'התמחות') + '. תקף מהקרב או הגיוס הבא.');
        return g;
    }
    if (!g.battle && h.ap <= 0)
        throw Error('לגיבור אין פעולות היום. בחרו משלחת אחרת או סיימו יום.');
    if (['treasury', 'improveMine', 'trade'].includes(a.kind)) {
        if (g.battle)
            throw Error('פעולות כלכלה אינן זמינות בקרב');
        if (a.kind === 'treasury') {
            if (g.pos !== 0)
                throw Error('שדרוג האוצר בבירה בלבד');
            const lv = g.treasury || 0, c = treasuryCosts[lv];
            if (!c)
                throw Error('האוצר ברמה המרבית');
            if (g.gold < c[0] || g.ore < c[1] || g.crystal < c[2])
                throw Error('אין די משאבים לשדרוג');
            g.gold -= c[0];
            g.ore -= c[1];
            g.crystal -= c[2];
            g.treasury = lv + 1;
            addlog(g, 'האוצר שודרג לרמה ' + g.treasury + '. התפוקה החדשה תתקבל בסיום היום הבא.');
        }
        else if (a.kind === 'improveMine') {
            const s = economy(g).mines.find(s => s.id === g.pos);
            if (!s)
                throw Error('יש להגיע למכרה שבשליטתכם');
            const lv = s.incomeLevel || 0, c = mineCosts[lv];
            if (!c)
                throw Error('המכרה ברמה המרבית');
            if (g.gold < c[0] || g.ore < c[1] || g.crystal < c[2])
                throw Error('אין די משאבים לשדרוג');
            g.gold -= c[0];
            g.ore -= c[1];
            g.crystal -= c[2];
            s.incomeLevel = lv + 1;
            addlog(g, 'המכרה שודרג. עוד יחידת משאב בכל סיום יום.');
        }
        else {
            if (g.pos !== 0)
                throw Error('סחר זמין בשוק הבירה בלבד');
            const t = trades[a.unit!];
            if (!t)
                throw Error('עסקה לא תקינה');
            if (g[t.from] < t.amount)
                throw Error('אין די משאבים למסחר');
            g[t.from] -= t.amount;
            g[t.to] += t.receive;
            addlog(g, 'הסחר הושלם: נמסרו ' + t.amount + ' ' + ({ gold: 'זהב', ore: 'עפרות', crystal: 'גבישים' }[t.from]) + ' והתקבלו ' + t.receive + ' ' + ({ gold: 'זהב', ore: 'עפרות', crystal: 'גבישים' }[t.to]) + '.');
        }
        advance(g);
        sync(g);
        return g;
    }
    if (a.kind === 'doctrine') {
        if (g.battle || g.pos !== 0 || g.doctrine)
            throw Error('תורת ממלכה בוחרים פעם אחת בבירה');
        if (!['arms', 'bastion', 'trade'].includes(a.unit!))
            throw Error('בחירה לא תקינה');
        if (g.level < 1 || g.gold < 16 || g.ore < 6 || g.crystal < 4)
            throw Error('נדרשים מרכז רמה 1, 16 זהב, 6 עפרות ו-4 גבישים');
        g.gold -= 16;
        g.ore -= 6;
        g.crystal -= 4;
        g.doctrine = a.unit as Game['doctrine'];
        advance(g);
        addlog(g, 'נבחרה תורת ממלכה: ' + doctrines[g.doctrine!].name + '. יתר התורות נסגרו למערכה הזאת.');
        return g;
    }
    if (a.kind === 'build') {
        if (g.battle || g.pos !== 0)
            throw Error('מבנים משדרגים במסך עיר הבירה');
        const key = a.unit!;
        const d = buildings[key];
        if (!d)
            throw Error('מבנה לא נמצא');
        const level = g.buildings[key];
        if (level >= 2)
            throw Error('המבנה ברמה המרבית');
        if(g.rulesRevision===2){if(g.builtDay===g.day)throw Error('אפשר לבנות או לשדרג מבנה אחד ביום');const missing=buildingPrerequisites[key].find(r=>(g.buildings[r.key]||0)<r.level);if(missing)throw Error('מבנה נדרש: '+buildings[missing.key].name+' רמה '+missing.level);if(level===1&&g.level<1)throw Error('לרמה השנייה נדרש מרכז עיר רמה 1');}
        const cost = d.cost[level];
        if (g.gold < cost[0] || g.ore < cost[1] || g.crystal < cost[2])
            throw Error('אין די משאבים לבנייה');
        g.gold -= cost[0];
        g.ore -= cost[1];
        g.crystal -= cost[2];
        g.buildings[key]++;
        if(g.rulesRevision===2)g.builtDay=g.day;
        advance(g);
        sync(g);
        addlog(g, d.name + ' שודרג לרמה ' + g.buildings[key] + '. ' + d.unlock[level]);
        return g;
    }
    if (a.kind === 'equip') {
        if (g.battle)
            throw Error('אין החלפת ציוד בקרב');
        const item = a.unit!;
        if (!['lens', 'shield', 'coil'].includes(item) || !g.relics.includes(item))
            throw Error('ציוד לא נמצא');
        if (g.heroes.some(x => x.id !== h.id && x.equipment === item))
            throw Error('הציוד בשימוש אצל גיבור אחר');
        if (h.equipment === item)
            throw Error('הציוד כבר מצויד');
        h.equipment = item as Hero['equipment'];
        advance(g);
        sync(g);
        addlog(g, 'הציוד הוצמד לגיבור. ההשפעה חלה בכל קרב חדש עד להחלפתו.');
        return g;
    }
    if(g.rulesRevision===2 && ['cityRecruit','recruit'].includes(a.kind)){
        const kind=a.unitKind!,d=rosters[g.faction]?.[kind];if(g.battle||g.pos!==0||!d)throw Error('גיוס במרכז העיר בלבד');
        if(d.building!=='center'&&(g.buildings[d.building]||0)<d.tier)throw Error('שדרגו את מבנה הגיוס תחילה');
        if(!g.recruitmentStock?.[kind])throw Error('המלאי אזל. תגבורת מגיעה בתחילת כל שבוע');
        if(g.army.filter(u=>u.hp>0).length>=6)throw Error('הצבא מלא, עד שש יחידות');
        if(g.gold<d.gold||g.ore<d.ore||g.crystal<d.crystal)throw Error('אין די משאבים לגיוס');
        g.gold-=d.gold;g.ore-=d.ore;g.crystal-=d.crystal;g.recruitmentStock[kind]--;
        g.army=g.army.filter(u=>u.hp>0);g.army.push(campaignUnit(g,kind,'unit-'+g.serial++));
        advance(g);sync(g);addlog(g,'גויסה '+d.name+'. מלאי נותר: '+g.recruitmentStock[kind]);return g;
    }
    if (a.kind === 'cityRecruit') {
        if (g.battle || g.pos !== 0)
            throw Error('גיוס עיר זמין בבירה');
        const kind = a.unitKind!;
        const d = [...Object.values(specialSites), pyro].find(d => d.kind === kind);
        const key = kind === 3 ? 'workshop' : kind === 4 ? 'sanctuary' : kind === 5 ? 'observatory' : 'barracks';
        if (!d || g.buildings[key] < (kind >= 6 ? 2 : 1))
            throw Error('שדרגו את מבנה הגיוס תחילה');
        if (g.gold < d.gold || g.ore < d.ore || g.crystal < d.crystal)
            throw Error('אין די משאבים');
        if (g.army.filter(u => u.hp > 0).length >= 6)
            throw Error('הצבא מלא');
        g.gold -= d.gold;
        g.ore -= d.ore;
        g.crystal -= d.crystal;
        const bonus = g.buildings[key] >= 2 ? 2 : 0, max = d.hp + g.level * 2 + (h.specialty === 'warden' ? 2 + specialtyLevel(h) * 2 : 0) + bonus;
        g.army = g.army.filter(u => u.hp > 0);
        g.army.push({ id: 'unit-' + g.serial++, kind, name: d.unit, side: 0, pos: 0, hp: max, max, damage: d.damage + (g.buildings[key] >= 2 ? 1 : 0), range: d.range });
        advance(g);
        sync(g);
        addlog(g, 'גויסה ' + d.unit + ' במבנה העיר.');
        return g;
    }
    if (a.kind === 'upgrade' && g.rulesRevision===2 && g.builtDay===g.day)throw Error('אפשר לבנות או לשדרג מבנה אחד ביום');
    if (a.kind === 'hireHero') {
        if (g.battle || g.pos !== 0)
            throw Error('גיבורים מגייסים במצפה הבירה בלבד');
        if (g.heroes.length >= 3)
            throw Error('עד שלושה גיבורים במערכה');
        if (g.gold < 18 || g.ore < 4 || g.crystal < 2)
            throw Error('נדרשים 18 זהב, 4 עפרות ו-2 גבישים');
        g.gold -= 18;
        g.ore -= 4;
        g.crystal -= 2;
        const i = g.heroes.length;
        const unit = g.rulesRevision===2 ? campaignUnit(g,0,'unit-'+g.serial++) : recruitUnit(g, 0, 'unit-' + g.serial++);
        g.heroes.push({ id: 'hero-' + i, name: heroNames[g.faction][i], title: i === 1 ? 'סיירת דרכי הכוכבים' : 'אומן המכונות', specialty: i === 1 ? 'scout' : 'artificer', pos: 0, army: [unit], ap: g.rulesRevision === 2 ? (i === 1 ? 18 : 14) : (i === 1 ? 4 : 3), maxAp: g.rulesRevision === 2 ? (i === 1 ? 18 : 14) : (i === 1 ? 4 : 3) });
        advance(g);
        addlog(g, 'גיבור חדש גויס עם יחידת סיור. בחרו בכרטיס שלו להפעלת משלחת נפרדת.');
        sync(g);
        return g;
    }
    if (a.kind === 'transfer') {
        if (g.battle)
            throw Error('אין העברת יחידות בקרב');
        const to = g.heroes.find(x => x.id === a.hero);
        const u = g.army.find(u => u.id === a.unit && u.hp > 0);
        if (!to || to.id === h.id || to.pos !== g.pos || !u)
            throw Error('העברה רק לגיבור אחר באותו תא');
        if (to.army.filter(u => u.hp > 0).length >= 6)
            throw Error('הצבא המקבל מלא');
        if (g.army.filter(u => u.hp > 0).length <= 1)
            throw Error('השאירו לפחות יחידה אחת במשלחת');
        g.army = g.army.filter(x => x.id !== u.id);
        to.army.push(u);
        advance(g);
        sync(g);
        addlog(g, 'היחידה הועברה לצבא של ' + to.name + '.');
        return g;
    }
    if (a.kind === 'siteRecruit') {
        const s = g.sites.find(s => s.id === g.pos);
        const d = s && (a.unitKind === 7 && s.type === 'hatchery' ? pyro : specialSites[s.type]);
        if (g.battle || !s?.owner || !d)
            throw Error('יש לשחרר אתר גיוס ולהגיע אליו');
        if (!s.stock)
            throw Error('המלאי אזל. יחידה מתחדשת כל שלושה ימים');
        if (g.army.filter(u => u.hp > 0).length >= 6)
            throw Error('הצבא מלא');
        const cost = Math.max(1, d.gold - (h.specialty === 'artificer' ? 2 + specialtyLevel(h) : 0));
        if (g.gold < cost || g.ore < d.ore || g.crystal < d.crystal)
            throw Error('אין די משאבים לגיוס באתר');
        g.gold -= cost;
        g.ore -= d.ore;
        g.crystal -= d.crystal;
        s.stock--;
        const max = d.hp + g.level * 2 + (h.specialty === 'warden' ? 2 + specialtyLevel(h) * 2 : 0);
        g.army = g.army.filter(u => u.hp > 0);
        const recruited=g.rulesRevision===2?campaignUnit(g,d.kind,'unit-'+g.serial++):{ id: 'unit-' + g.serial++, kind: d.kind, name: d.unit, side: 0, pos: 0, hp: max, max, range: d.range, damage: d.damage };
        g.army.push(recruited);
        advance(g);
        sync(g);
        addlog(g, 'גויסה ' + d.unit + ' לצבא של ' + h.name + '.');
        return g;
    }
    if (a.kind === 'wait')
        throw Error('בחרו סיום יום להפעלת כל המכרות והמשלחות');
    const before = g.army.map(u => u.id), won = g.victories, completed = g.sites.filter(s => s.done).length;
    g = core(g, a);
    if (g.victories > won)
        gainXP(g, 12);
    else if (!g.battle && g.sites.filter(s => s.done).length > completed)
        gainXP(g, 6);
    if (a.kind === 'recruit') {
        for (const u of g.army.filter(u => !before.includes(u.id))) {
            const bonus = (h.specialty === 'warden' ? 2 + specialtyLevel(h) * 2 : 0) + (g.buildings.barracks >= 1 ? 2 : 0);
            u.hp += bonus;
            u.max += bonus;
            if (g.buildings.barracks >= 2)
                u.damage++;
        }
    }
    if (a.kind === 'upgrade') {
        if(g.rulesRevision===2)g.builtDay=g.day;
        for (const other of g.heroes.filter(x => x.id !== g.activeHero))
            for (const u of other.army.filter(u => u.hp > 0)) {
                u.hp += 2;
                u.max += 2;
            }
    }
    if (a.kind === 'move')
        reveal(g, g.pos, h.specialty === 'scout' ? 2 + Number(specialtyLevel(h) > 0) : g.level >= 2 ? 2 : 1);
    sync(g);
    return g;
}
export const buildings: Record<string, {
    name: string;
    art: string;
    cost: number[][];
    unlock: string[];
}> = { barracks: { name: 'בית משמר המצפה', art: 'base', cost: [[12, 5, 0], [18, 8, 4]], unlock: ['יחידות בסיס שתגייסו מעתה מקבלות 2 כוח נוספים.', 'פותח ארמדיל קוורץ ופיירוקריסטל בעיר; יחידות בסיס חדשות מקבלות גם עוד נזק אחד.'] }, workshop: { name: 'סדנת גלגלי השחר', art: 'factory', cost: [[14, 6, 2], [20, 10, 4]], unlock: ['פותחת גיוס טריצרטופס מכני בעיר.', 'טריצרטופסים חדשים בעיר מקבלים 2 כוח ונזק אחד נוספים.'] }, observatory: { name: 'מכון הכבידה', art: 'gravity', cost: [[12, 4, 5], [20, 8, 7]], unlock: ['פותח גיוס מנטת כבידה בעיר.', 'מנטות חדשות בעיר מקבלות 2 כוח ונזק אחד נוספים.'] }, sanctuary: { name: 'גן זיכרונות חי', art: 'sanctuary', cost: [[10, 3, 4], [18, 6, 6]], unlock: ['פותח גיוס עש גחליליות בעיר.', 'עשים חדשים בעיר מקבלים 2 כוח ונזק אחד נוספים.'] } };
export const equipment: Record<string, {
    name: string;
    effect: string;
}> = { lens: { name: 'עדשת הכוכבים', effect: 'עוד טווח אחד לכל יחידות הטווח של הגיבור בכל קרב חדש עד להחלפתו.' }, shield: { name: 'לוח מנסרה', effect: 'מפחית נזק אויב אחד מכל פגיעה ביחידות הגיבור, עד מינימום 1.' }, coil: { name: 'סליל הד', effect: 'מוסיף נזק אחד לכל יחידות הגיבור בכל קרב חדש עד להחלפתו.' } };
function equipped(g: Game, army: Unit[]): Unit[] { const item = active(g).equipment; return army.map(u => ({ ...u, range: u.range + (item === 'lens' && u.range > 1 ? 1 : 0), baseDamage: u.damage, baseRange: u.range, used: false, charge: 0, damage: u.damage + (item === 'coil' ? 1 : 0) + (active(g).attack || 0) })); }
function stripEquipment(g: Game) { for (const u of g.army) {
    if (u.baseDamage !== undefined)
        u.damage = u.baseDamage;
    else if (active(g).equipment === 'coil')
        u.damage--;
    if (u.baseRange !== undefined)
        u.range = u.baseRange;
    else if (active(g).equipment === 'lens' && u.range > 1)
        u.range--;
    delete u.baseDamage;
    delete u.baseRange;
    delete u.used;
    delete u.charge;
} }
export const xpThresholds = [0, 18, 45, 85, 140];
export const doctrines = { arms: { name: 'מסורת החנית', effect: 'כל גיוס חדש מקבל נזק אחד נוסף; ללא הנחה או תוספת חיים.' }, bastion: { name: 'מסורת המצודה', effect: 'כל גיוס חדש מקבל 4 חיים נוספים; ללא נזק נוסף או הנחה.' }, trade: { name: 'ברית הסוחרים', effect: 'כל גיוס יחידה מחזיר 2 זהב אחרי תשלום המחיר המלא; ללא בונוס חיים או נזק.' } };
export const specialtyLevel = (h: Hero) => (h.talents || []).filter(t => t === 'specialty').length;
export function normalize(g: Game) { for (const h of g.heroes) {
    h.xp ??= 0;
    h.rank ??= 1;
    h.attack ??= 0;
    h.defense ??= 0;
    h.talents ??= [];
} return g; }
function gainXP(g: Game, amount: number) { const h = active(g); h.xp = (h.xp || 0) + amount; const prev = h.rank || 1; h.rank = 1 + xpThresholds.slice(1).filter(n => h.xp! >= n).length; if (h.rank > prev)
    addlog(g, h.name + ' עלה לדרגה ' + h.rank + '! בחרו שיפור בכרטיס המפקד.'); }
export function apply(old: Game, a: Action): Game { const ids = new Set(old.heroes.flatMap(h => h.army.map(u => u.id))); const g = actCore(old, a); normalize(g); if (['recruit', 'siteRecruit', 'cityRecruit'].includes(a.kind)) {
    for (const u of g.army.filter(u => !ids.has(u.id))) {
        if (g.doctrine === 'arms')
            u.damage++;
        if (g.doctrine === 'bastion') {
            u.hp += 4;
            u.max += 4;
        }
        if (g.doctrine === 'trade')
            g.gold += 2;
    }
    sync(g);
} return g; }
function hit(g: Game, source: Unit, target: Unit, raw: number) { let reduction = target.side === 0 ? (active(g).defense || 0) + (active(g).equipment === 'shield' ? 1 : 0) : 0; if (target.kind === 7 && (g.rulesRevision!==2 || (target.faction||g.faction)==='crystal')) {
    reduction += 2;
    target.charge = Math.min(6, (target.charge || 0) + 2);
} const damage = Math.max(1, raw - reduction); target.hp = Math.max(0, target.hp - damage); }
export function ability(g: Game, u: Unit) { if(g.rulesRevision===2){const f=u.faction||g.faction;
 if(u.kind===0)return{name:'פריצת סייר',detail:'פגיעה מדויקת של נזק רגיל ועוד 2, בטווח2, פעם בקרב.',range:2};
 if(u.kind===1||u.kind===6)return{name:'התאוששות מגן',detail:'משיב עד6חיים ליחידה עצמה, פעם בקרב. אינו מחיה יחידות.',range:0};
 if(u.kind===3)return{name:'פריצת שריון',detail:'מכת פריצה סמוכה, עוד4נזק, פעם בקרב.',range:1};
 if(u.kind===4)return{name:'פעימת שיקום',detail:'היחידה משקמת עד6חיים לעצמה, פעם בקרב.',range:0};
 if(u.kind===5)return{name:'מטח מכוון',detail:'ירי ארוך בטווח5 ועוד3נזק, פעם בקרב.',range:5};
 if(u.kind===7&&f!=='crystal')return{name:f==='mars'?'שאגת רקס':f==='grove'?'התפרצות חופה':'גל ירח',detail:'מכת עילית בטווח2 עם עוד5נזק, פעם בקרב.',range:2};
 } if (u.kind === 7)
    return { name: 'יריקת גבישים', detail: 'טווח 3, נזק 3 ועוד המטען שנאגר (עד 6). כל פגיעה בדרקון מופחתת ב-2 ומטעינה 2. יריקה אחת בקרב, בלי אש.', range: 3 }; if (u.kind !== 2)
    return null; const f = u.faction || g.faction; return f === 'mars' ? { name: 'פעימת הד', detail: 'ירי בטווח 4 עם 3 נזק נוספים, פעם אחת ליחידה בקרב.', range: 4 } : f === 'crystal' ? { name: 'שבר תהודה', detail: 'ירי בטווח 3 עם 4 נזק נוספים, פעם אחת ליחידה בקרב.', range: 3 } : f === 'grove' ? { name: 'פריחת זיכרון', detail: 'מרפאת את היחידה הנבחרת ב-6 חיים, בלי להחיות אבדות. פעם אחת בקרב.', range: 0 } : { name: 'גל כבידה', detail: 'ירי בטווח 3 עם 2 נזק נוספים ודחיפת האויב תא פנוי אחד. פעם אחת בקרב.', range: 3 }; }
function useAbility(g: Game, u: Unit, id?: string) { const d = ability(g, u); if (!d || u.used)
    throw Error('היכולת לא זמינה או כבר נוצלה בקרב'); if (d.range === 0) {
    if (u.hp >= u.max)
        throw Error('היחידה כבר בריאה');
    u.hp = Math.min(u.max, u.hp + 6);
}
else {
    const e = g.battle!.units.find(x => x.id === id && x.side === 1 && x.hp > 0);
    if (!e || distance(u.pos, e.pos, 6) > d.range)
        throw Error('בחרו אויב בטווח היכולת');
    const f = u.faction || g.faction;
    const crystalDragon=u.kind===7&&(g.rulesRevision!==2||f==='crystal');
 const bonus=g.rulesRevision===2&&u.kind!==2?({0:2,3:4,5:3,7:5} as Record<number,number>)[u.kind]||0:(f==='mars'?3:f==='crystal'?4:2);
 hit(g,u,e,crystalDragon?3+(u.charge||0)+(active(g).attack||0):u.damage+bonus);
    if (f === 'tide' && u.kind === 2 && e.hp > 0) {
        const free = neighbors(e.pos, 6, 30).filter(n => !g.battle!.units.some(x => x.hp > 0 && x.pos === n) && distance(n, u.pos, 6) > distance(e.pos, u.pos, 6));
        if (free.length)
            e.pos = free[0];
    }
} u.used = true; u.charge = 0; }
export function worldNeighbors(n: number, size: number): number[] {
    const x = n % size, y = Math.floor(n / size), result: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= size || y + dy < 0 || y + dy >= size) continue;
        result.push((y + dy) * size + x + dx);
    }
    return result;
}
export function movementCost(g: Game, from: number, to: number): number {
    if (g.rulesRevision !== 2) return 1;
    const road = g.roads?.includes(to), diagonal = from % worldSize(g) !== to % worldSize(g) && Math.floor(from / worldSize(g)) !== Math.floor(to / worldSize(g));
    const base = road ? 2 : terrainCatalog[g.terrain[to]].cost;
    return Math.max(2, base + Number(diagonal) - Number(active(g).specialty === 'scout' && !road));
}
export function createCampaign(seed: number, f = 'mars', size: 24 | 32 = 24, opponents = 2): Game {
    const g = create(seed, f, size, opponents), map = landscape(seed, size);
    g.rulesRevision = 2; g.terrain = map.terrain; g.roads = map.roads;
    g.recruitmentStock=rosters[f].map(d=>d.growth);
    const reserved=[{id:2,resource:'gold' as const},{id:size*2+1,resource:'ore' as const},{id:size*3+3,resource:'crystal' as const}];
    for(const site of reserved){g.sites=g.sites.filter(s=>s.id!==site.id);g.sites.push({...site,type:'mine',done:false,owner:false,guard:site.resource==='crystal'?1:0});}
    const extra=Math.floor((size*size-324)/22);let random=rng(seed^9128);for(let i=0;i<extra;i++){const id=Math.floor(random()*size*size);if(g.sites.some(s=>s.id===id))continue;g.sites.push({id,type:i%3===0?'cache':i%3===1?'camp':'ruin',done:false,owner:false,guard:i%3===2?2:0});}
    reveal(g,0,5);g.army=[0,1,2].map((k)=>campaignUnit(g,k,'unit-'+k));active(g).army=g.army;
    for(const r of g.rivals)r.army=[0,1,2].map(k=>({...campaignUnit({...g,faction:r.faction},k,'rival-'+r.id+'-'+k),side:1}));
    active(g).ap = active(g).maxAp = campaignRules.dailyMovement;
    return g;
}
// Weighted Dijkstra over discovered cells. Enemy cells can end, never cross, a route.
export function routeTo(g: Game, target: number): number[] {
    const w = worldSize(g);
    if (target < 0 || target >= g.terrain.length || !g.seen.includes(target)) return [];
    const pending = new Set([g.pos]), prev = new Map<number, number>(), dist = new Map([[g.pos, 0]]), seen = new Set(g.seen);
    while (pending.size) {
        const n = [...pending].reduce((a, b) => dist.get(a)! < dist.get(b)! ? a : b);
        pending.delete(n); if (n === target) break;
        if (n !== g.pos && g.rivals.some(r => !r.defeated && (r.capital === n || r.pos === n && r.army.some(u => u.hp > 0)))) continue;
        for (const k of g.rulesRevision === 2 ? worldNeighbors(n, w) : neighbors(n, w, g.terrain.length)) {
            if (!seen.has(k)) continue;
            const d = dist.get(n)! + movementCost(g, n, k);
            if (d < (dist.get(k) ?? Infinity)) { dist.set(k, d); prev.set(k, n); pending.add(k); }
        }
    }
    if (!prev.has(target)) return [];
    const result: number[] = [];
    for (let n = target; n !== g.pos; n = prev.get(n)!) result.unshift(n);
    return result;
}
export function routeCost(g: Game, path: number[]): number { let from = g.pos, total = 0; for (const to of path) { total += movementCost(g, from, to); from = to; } return total; }

export function campaignUnit(g:Game,kind:number,id:string):Unit{
 const d=rosters[g.faction][kind],h=g.heroes?.find(h=>h.id===g.activeHero),bonus=g.level*2+(h?.specialty==='warden'?2:0),max=d.hp+bonus;
 return {id,kind,name:d.name,faction:g.faction,side:0,pos:0,hp:max,max,damage:d.damage+Number((g.buildings[d.building]||0)>=2),range:d.range};
}
