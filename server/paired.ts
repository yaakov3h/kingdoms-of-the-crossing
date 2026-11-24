/** Independent shared-world rules for exactly two human armies. No AI-player wrapper. */
import { create, factions, recruitUnit, Unit, buildings, specialSites, pyro, ability, trades, treasuryCosts, mineCosts, equipment } from '../src/engine';
export type Mode = 'cooperative' | 'versus';
export type Commander = {
    id: string;
    name: string;
    pos: number;
    ap: number;
    maxAp: number;
    army: Unit[];
    equipment?: 'lens' | 'shield' | 'coil';
};
export type Player = {
    id: string;
    name: string;
    faction: string;
    pos: number;
    ap: number;
    gold: number;
    ore: number;
    crystal: number;
    level: number;
    treasury: number;
    heroes: Commander[];
    activeHero: string;
    relics: string[];
    equipment?: 'lens' | 'shield' | 'coil';
    buildings: Record<string, number>;
    army: Unit[];
    seen: number[];
    defeated: boolean;
};
export type Site = {
    id: number;
    type: string;
    resource?: string;
    guard: number;
    incomeLevel?: number;
    stock?: number;
    owner: string | null;
    done: boolean;
};
export type Duel = {
    site: number;
    attacker: string;
    defender: string | null;
    turn: string;
    round: number;
    units: (Unit & {
        owner: string;
    })[];
    siege: boolean;
    remoteDefense?: boolean;
};
export type SharedGame = {
    schema: 1;
    mode: Mode;
    seed: number;
    size: number;
    day: number;
    players: Player[];
    turn: string;
    terrain: number[];
    sites: Site[];
    battle: Duel | null;
    winner: string | null;
    log: string[];
};
export type SharedAction = {
    kind: 'move' | 'visit' | 'recruit' | 'heal' | 'upgrade' | 'endTurn' | 'march' | 'strike' | 'retreat' | 'build' | 'cityRecruit' | 'ability' | 'treasury' | 'trade' | 'improveMine' | 'siteRecruit' | 'auto' | 'equip' | 'hireHero' | 'selectHero' | 'transfer';
    hero?: string;
    target?: number;
    unit?: string;
    enemy?: string;
    unitKind?: number;
};
const living = (p: Player) => p.army.filter(u => u.hp > 0);
const distance = (a: number, b: number, w: number) => Math.abs(a % w - b % w) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
const near = (a: number, b: number, w: number) => Math.max(Math.abs(a % w - b % w), Math.abs(Math.floor(a / w) - Math.floor(b / w))) <= 1;
const reveal = (g: SharedGame, p: Player) => { p.seen = Array.from(new Set([...p.seen, ...g.terrain.map((_, i) => i).filter(i => near(i, p.pos, g.size))])); };
const base = (g: SharedGame, p: Player) => g.players.indexOf(p) === 0 ? 0 : g.size * g.size - 1;
function income(g: SharedGame, p: Player) { p.gold += 2 + (p.treasury || 0) * 2; p.ore++; p.crystal += p.treasury || 0; for (const s of g.sites.filter(s => s.type === 'mine' && s.owner === p.id)) {
    if (s.resource === 'crystal')
        p.crystal += 1 + (s.incomeLevel || 0);
    else if (s.resource === 'ore')
        p.ore += 2 + (s.incomeLevel || 0);
    else
        p.gold += 2 + (s.incomeLevel || 0);
} }
export function createShared(seed: number, mode: Mode, people: {
    id: string;
    name: string;
    faction: string;
}[]): SharedGame {
    if (!['cooperative', 'versus'].includes(mode) || people.length !== 2 || people[0].id === people[1].id || people.some(p => !p.id || !p.name || p.name.length > 60 || !factions.some(f => f.id === p.faction)))
        throw Error('INVALID_PLAYERS');
    const original = create(seed, people[0].faction, 18, 1);
    const g: SharedGame = { schema: 1, mode, seed, size: 18, day: 1, players: [], turn: people[0].id, terrain: original.terrain, sites: original.sites.filter(s => s.id !== 0 && s.type !== 'gate').map(s => ({ id: s.id, type: s.type, resource: s.resource, guard: s.guard, ...(s.stock !== undefined ? { stock: s.stock } : {}), owner: null, done: false })), battle: null, winner: null, log: [] };
    g.players = people.map((p, i) => ({ ...p, pos: i ? 323 : 0, ap: 3, gold: 12, ore: 4, crystal: 0, level: 0, treasury: 0, heroes: [], activeHero: p.id + '-hero-0', relics: [], buildings: { barracks: 0, workshop: 0, observatory: 0, sanctuary: 0 }, army: [0, 1, 2].map((kind, j) => ({ ...recruitUnit({ faction: p.faction, level: 0 }, kind, p.id + '-' + j), hp: recruitUnit({ faction: p.faction, level: 0 }, kind, '').hp + 2, max: recruitUnit({ faction: p.faction, level: 0 }, kind, '').max + 2 })), seen: [0, 323], defeated: false }));
    for (const p of g.players) {
        p.heroes = [{ id: p.activeHero, name: p.name + ' · מפקד ראשי', pos: p.pos, ap: p.ap, maxAp: 3, army: p.army }];
        g.sites.push({ id: base(g, p), type: 'base', owner: p.id, guard: 0, done: false });
        reveal(g, p);
    }
    g.sites = g.sites.filter(s => s.id !== 306);
    g.sites.push({ id: 306, type: 'citadel', guard: 3, owner: null, done: false });
    return g;
}
function equipped(p: Player, units: Unit[]) { return units.map(u => ({ ...u, baseDamage: u.damage, baseRange: u.range, damage: u.damage + (p.equipment === 'coil' ? 1 : 0), range: u.range + (p.equipment === 'lens' && u.range > 1 ? 1 : 0) })); }
function cleanUnits(units: Unit[]) { return units.map(({ baseDamage, baseRange, used, charge, ...u }) => ({ ...u, damage: baseDamage ?? u.damage, range: baseRange ?? u.range, side: 0, pos: 0 })); }
function start(g: SharedGame, p: Player, site: number, other: Player | null, siege = false) { if (!living(p).length)
    throw Error('NO_ARMY'); if (other && !living(other).length && !siege) {
    if (siege) {
        other.defeated = true;
        g.winner = p.id;
    }
    else {
        other.pos = base(g, other);
        p.pos = site;
        reveal(g, p);
    }
    p.ap--;
    return;
} const guard = g.sites.find(s => s.id === site)?.guard || 1; const remoteDefense = !!(other && siege && other.pos !== site); const defending = remoteDefense ? [0, 1].map((kind, i) => ({ ...recruitUnit({ faction: other!.faction, level: other!.level }, kind, 'guard-' + other!.id + '-' + i), hp: 12 + other!.level * 2, max: 12 + other!.level * 2 })) : other && siege && !living(other).length ? [0, 1].map((kind, i) => recruitUnit({ faction: other.faction, level: other.level }, kind, 'guard-' + other.id + '-' + i)) : other ? living(other) : []; const units = [...equipped(p, living(p)).map((u, i) => ({ ...u, owner: p.id, side: 0, used: false, charge: 0, pos: [6, 12, 18, 0, 24, 7][i] })), ...(other ? (remoteDefense ? defending : equipped(other, defending)).map((u, i) => ({ ...u, owner: other.id, side: 1, used: false, charge: 0, pos: [11, 17, 23, 5, 29, 10][i] })) : Array.from({ length: Math.min(4, guard + 1) }, (_, i) => ({ id: 'neutral-' + i, kind: i % 3, name: 'שומר האתר', owner: 'neutral', side: 1, pos: [11, 17, 23, 5][i], hp: 7 + guard * 2, max: 7 + guard * 2, range: i === 1 ? 2 : 1, damage: 2 })))]; g.battle = { site, attacker: p.id, defender: other?.id || null, turn: p.id, round: 1, units, siege, remoteDefense }; }
function reward(g: SharedGame, p: Player, n: number) { const s = g.sites.find(s => s.id === n); if (!s)
    return; const note = (text: string) => { g.log.unshift(p.name + ': ' + text); g.log = g.log.slice(0, 20); }; if (s.type === 'mine') {
    s.owner = p.id;
    s.done = true;
    s.guard = 0;
    p.ore += 3;
    note('מכרה נכבש בתא ' + s.id + '. הכנסה ביום המשותף הבא.');
    return;
} if (s.done)
    return; s.done = true; s.owner = p.id; if (specialSites[s.type]) {
    s.guard = 0;
    s.stock ??= 2;
    note('אתר גיוס שוחרר. המלאי מתחדש כל שלושה ימים.');
}
else if (s.type === 'citadel' && g.mode === 'cooperative') {
    g.winner = 'team';
    note('מצודת היעד נכבשה. הצוות ניצח בניסוי הזה.');
}
else if (s.type === 'spring') {
    for (const u of living(p))
        u.hp = Math.min(u.max, u.hp + 6);
    note('המעיין ריפא עד6חיים לכל שורד.');
}
else if (s.type === 'beacon' || s.type === 'quest') {
    if (s.type === 'beacon')
        p.crystal += 2;
    else {
        p.gold += 8;
        p.ore += 2;
    }
    const r = s.type === 'beacon' ? 4 : 3;
    p.seen = Array.from(new Set([...p.seen, ...g.terrain.map((_, i) => i).filter(i => Math.max(Math.abs(i % g.size - p.pos % g.size), Math.abs(Math.floor(i / g.size) - Math.floor(p.pos / g.size))) <= r)]));
    note('הסביבה נחשפה סביב האתר.');
}
else if (s.type === 'camp') {
    p.gold += 7;
    p.ore += 3;
    note('מחנה נמצא:7זהב3עפרות.');
}
else if (s.type === 'cache') {
    p.gold += 4;
    p.crystal += 4 + (p.faction === 'crystal' ? 2 : 0);
    note('אוצר המצפה נאסף.');
}
else if (s.type === 'ruin') {
    p.gold += 10;
    p.crystal += 5;
    note('החורבה טוהרה:10זהב5גבישים.');
}
else if (s.type === 'relic') {
    p.relics ??= [];
    const item = ['lens', 'shield', 'coil'].find(item => !p.relics.includes(item));
    if (item) {
        p.relics.push(item);
        note('נמצא ציוד: ' + equipment[item].name + '. אפשר לצייד במסך הצבא.');
    }
    else {
        p.gold += 7;
        note('אוסף הציוד הושלם. נמצאו7זהב.');
    }
}
else {
    p.gold += 7;
    p.crystal += 2;
    note('האתר הושלם.');
} }
function settle(g: SharedGame) {
    const b = g.battle!;
    const a = g.players.find(p => p.id === b.attacker)!, d = g.players.find(p => p.id === b.defender);
    const own = b.units.filter(u => u.owner === a.id && u.hp > 0), foes = b.units.filter(u => u.owner !== a.id && u.hp > 0);
    if (own.length && foes.length)
        return false;
    const clean = (units: typeof own) => cleanUnits(units.map(({ owner, ...u }) => u));
    a.army = clean(own);
    if (d && !b.remoteDefense)
        d.army = clean(foes);
    if (own.length) {
        if (d) {
            if (!b.remoteDefense)
                d.pos = base(g, d);
            if (b.siege) {
                d.defeated = true;
                g.winner = a.id;
            }
            else {
                d.gold += 5;
                d.ore += 2;
            }
        }
        else
            reward(g, a, b.site);
    }
    else {
        a.pos = base(g, a);
        a.gold += 5;
        a.ore += 2;
    }
    a.ap = Math.max(0, a.ap - 1);
    g.battle = null;
    g.log.unshift(own.length ? 'הקרב הסתיים בניצחון התוקף' : 'התוקף נסוג לבירה');
    return true;
}
function damage(target: Unit, raw: number, g: SharedGame) { const owner = (target as Unit & {
    owner: string;
}).owner; const reduction = (target.kind === 7 ? 2 : 0) + (!(g.battle?.remoteDefense && g.battle.defender === owner) && g.players.find(p => p.id === owner)?.equipment === 'shield' ? 1 : 0); if (target.kind === 7)
    target.charge = Math.min(6, (target.charge || 0) + 2); target.hp = Math.max(0, target.hp - Math.max(1, raw - reduction)); }
function neutralReply(g: SharedGame) { const b = g.battle!; const enemies = b.units.filter(u => u.owner === 'neutral' && u.hp > 0), u = enemies[(b.round - 1) % enemies.length]; if (!u)
    return; const target = b.units.filter(v => v.owner !== 'neutral' && v.hp > 0).sort((a, c) => distance(u.pos, a.pos, 6) - distance(u.pos, c.pos, 6))[0]; if (!target)
    return; if (distance(u.pos, target.pos, 6) <= u.range)
    damage(target, u.damage, g);
else {
    const next = [u.pos - 6, u.pos + 6, u.pos - 1, u.pos + 1].filter(n => n >= 0 && n < 30 && distance(n, u.pos, 6) === 1 && !b.units.some(v => v.hp > 0 && v.pos === n)).sort((a, c) => distance(a, target.pos, 6) - distance(c, target.pos, 6))[0];
    if (next !== undefined)
        u.pos = next;
} b.round++; settle(g); }
function applyCore(old: SharedGame, actor: string, action: SharedAction): SharedGame {
    const g = structuredClone(old), p = g.players.find(p => p.id === actor);
    if (!p || p.defeated)
        throw Error('FORBIDDEN');
    if (g.winner)
        throw Error('GAME_FINISHED');
    if (!action || typeof action.kind !== 'string')
        throw Error('INVALID_ACTION');
    if (g.battle && action.kind === 'auto') {
        if (g.battle.defender || g.battle.attacker !== actor)
            throw Error('AUTO_NEUTRAL_ONLY');
        let next = g;
        for (let step = 0; next.battle && step < 1000; step++) {
            const b = next.battle, own = b.units.filter(u => u.owner === actor && u.hp > 0), foes = b.units.filter(u => u.owner !== actor && u.hp > 0);
            let choice: SharedAction | undefined;
            for (const u of own) {
                const e = foes.find(e => distance(u.pos, e.pos, 6) <= u.range);
                if (e) {
                    choice = { kind: 'strike', unit: u.id, enemy: e.id };
                    break;
                }
            }
            if (!choice) {
                let best: {
                    u: Unit;
                    n: number;
                    d: number;
                } | undefined;
                for (const u of own)
                    for (const n of [u.pos - 6, u.pos + 6, u.pos - 1, u.pos + 1]) {
                        if (n < 0 || n >= 30 || distance(n, u.pos, 6) !== 1 || b.units.some(x => x.hp > 0 && x.pos === n))
                            continue;
                        const d = Math.min(...foes.map(e => distance(n, e.pos, 6)));
                        if (!best || d < best.d)
                            best = { u, n, d };
                    }
                if (best)
                    choice = { kind: 'march', unit: best.u.id, target: best.n };
            }
            if (!choice)
                throw Error('AUTO_BLOCKED');
            next = applyShared(next, actor, choice);
        }
        if (next.battle)
            throw Error('AUTO_LIMIT');
        return next;
    }
    if (g.battle) {
        const b = g.battle;
        if (b.turn !== actor)
            throw Error('WAIT_FOR_BATTLE_TURN');
        if (action.kind === 'retreat') {
            const a = g.players.find(x => x.id === b.attacker)!, d = g.players.find(x => x.id === b.defender);
            if (actor !== a.id)
                throw Error('ONLY_ATTACKER_RETREATS');
            a.army = cleanUnits(b.units.filter(u => u.owner === a.id && u.hp > 0).map(({ owner, ...u }) => u));
            a.pos = base(g, a);
            a.ap = Math.max(0, a.ap - 1);
            if (d && !b.remoteDefense)
                d.army = cleanUnits(b.units.filter(u => u.owner === d.id && u.hp > 0).map(({ owner, ...u }) => u));
            g.battle = null;
            return g;
        }
        const u = b.units.find(u => u.id === action.unit && u.owner === actor && u.hp > 0);
        if (!u)
            throw Error('INVALID_UNIT');
        if (action.kind === 'march') {
            const n = action.target!;
            if (!Number.isInteger(n) || n < 0 || n >= 30 || distance(n, u.pos, 6) !== 1 || b.units.some(x => x.hp > 0 && x.pos === n))
                throw Error('INVALID_MOVE');
            u.pos = n;
        }
        else if (action.kind === 'strike') {
            const e = b.units.find(e => e.id === action.enemy && e.owner !== actor && e.hp > 0);
            if (!e || distance(e.pos, u.pos, 6) > u.range)
                throw Error('OUT_OF_RANGE');
            damage(e, u.damage, g);
        }
        else if (action.kind === 'ability') {
            const d = ability({ faction: p.faction } as any, u);
            if (!d || u.used)
                throw Error('ABILITY_UNAVAILABLE');
            if (d.range === 0) {
                if (u.hp >= u.max)
                    throw Error('ALREADY_HEALTHY');
                u.hp = Math.min(u.max, u.hp + 6);
            }
            else {
                const e = b.units.find(e => e.id === action.enemy && e.owner !== actor && e.hp > 0);
                if (!e || distance(e.pos, u.pos, 6) > d.range)
                    throw Error('OUT_OF_RANGE');
                const f = u.faction || p.faction;
                damage(e, u.kind === 7 ? 3 + (u.charge || 0) : u.damage + (f === 'mars' ? 3 : f === 'crystal' ? 4 : 2), g);
                if (f === 'tide' && u.kind === 2 && e.hp > 0) {
                    const n = [e.pos - 6, e.pos + 6, e.pos - 1, e.pos + 1].find(n => n >= 0 && n < 30 && distance(n, e.pos, 6) === 1 && distance(n, u.pos, 6) > distance(e.pos, u.pos, 6) && !b.units.some(x => x.hp > 0 && x.pos === n));
                    if (n !== undefined)
                        e.pos = n;
                }
            }
            u.used = true;
            u.charge = 0;
        }
        else
            throw Error('INVALID_BATTLE_ACTION');
        if (!settle(g)) {
            if (b.defender) {
                b.turn = actor === b.attacker ? b.defender : b.attacker;
                b.round++;
            }
            else
                neutralReply(g);
        }
        return g;
    }
    if (g.turn !== actor)
        throw Error('NOT_YOUR_TURN');
    if (action.kind === 'selectHero') {
        const hero = p.heroes.find(h => h.id === action.hero);
        if (!hero)
            throw Error('HERO_NOT_FOUND');
        syncCommander(p);
        selectCommander(p, hero);
        return g;
    }
    if (action.kind === 'endTurn') {
        const next = g.players[(g.players.indexOf(p) + 1) % 2];
        g.turn = next.id;
        if (g.turn === g.players[0].id) {
            g.day++;
            for (const player of g.players)
                income(g, player);
            if (g.day % 3 === 0)
                for (const site of g.sites)
                    if (site.stock !== undefined)
                        site.stock = Math.min(3, site.stock + 1);
        }
        for (const hero of next.heroes)
            hero.ap = hero.maxAp;
        const current = next.heroes.find(h => h.id === next.activeHero)!;
        next.ap = current.ap;
        return g;
    }
    if (p.ap <= 0)
        throw Error('NO_ACTIONS');
    if (action.kind === 'hireHero') {
        if (p.pos !== base(g, p))
            throw Error('RETURN_TO_BASE');
        if (p.heroes.length >= 3)
            throw Error('HERO_LIMIT');
        if (p.gold < 18 || p.ore < 4 || p.crystal < 2)
            throw Error('NO_RESOURCES');
        p.gold -= 18;
        p.ore -= 4;
        p.crystal -= 2;
        const id = p.id + '-hero-' + p.heroes.length;
        p.heroes.push({ id, name: p.name + ' · מפקד ' + (p.heroes.length + 1), pos: p.pos, ap: 3, maxAp: 3, army: [recruitUnit({ faction: p.faction, level: p.level }, 0, id + '-scout')] });
        p.ap--;
    }
    else if (action.kind === 'transfer') {
        const receiver = p.heroes.find(h => h.id === action.hero), unit = p.army.find(u => u.id === action.unit && u.hp > 0);
        if (!receiver || receiver.id === p.activeHero || receiver.pos !== p.pos || !unit)
            throw Error('INVALID_TRANSFER');
        if (living(p).length <= 1 || receiver.army.filter(u => u.hp > 0).length >= 6)
            throw Error('ARMY_CAPACITY');
        p.army = p.army.filter(u => u.id !== unit.id);
        receiver.army.push(unit);
        p.ap--;
    }
    else if (action.kind === 'equip') {
        const item = action.unit!;
        if (!['lens', 'shield', 'coil'].includes(item) || !p.relics?.includes(item) || p.equipment === item)
            throw Error('INVALID_EQUIPMENT');
        if (p.heroes.some(h => h.id !== p.activeHero && h.equipment === item))
            throw Error('EQUIPMENT_IN_USE');
        p.equipment = item as Player['equipment'];
        p.ap--;
        g.log.unshift(p.name + ': צויד ' + equipment[item].name + '. השפעה מהקרב הבא.');
    }
    else if (action.kind === 'move') {
        const n = action.target!;
        if (!Number.isInteger(n) || n < 0 || n >= g.terrain.length)
            throw Error('INVALID_MOVE');
        const other = g.players.find(x => x.id !== actor && !x.defeated && (x.heroes.some(h => h.pos === n) || base(g, x) === n));
        if (other && g.mode === 'versus') {
            if (!near(p.pos, n, g.size))
                throw Error('OUT_OF_RANGE');
            const defending = other.heroes.find(h => h.pos === n);
            if (defending) {
                syncCommander(other);
                selectCommander(other, defending);
            }
            start(g, p, n, other, n === base(g, other));
            return g;
        }
        if (other?.heroes.some(h => h.pos === n))
            throw Error('ALLY_OCCUPIES_TILE');
        if (distance(n, p.pos, g.size) !== 1)
            throw Error('INVALID_MOVE');
        p.pos = n;
        p.ap--;
        reveal(g, p);
    }
    else if (action.kind === 'visit') {
        const s = g.sites.find(s => s.id === p.pos);
        if (!s || s.type === 'base' || (s.done && !(s.type === 'mine' && s.owner !== actor && g.mode === 'versus')))
            throw Error('NO_SITE');
        if (s.guard > 0) {
            start(g, p, s.id, null);
            return g;
        }
        reward(g, p, s.id);
        p.ap--;
    }
    else if (action.kind === 'siteRecruit') {
        const s = g.sites.find(s => s.id === p.pos && s.owner === actor), d = s && (action.unitKind === 7 && s.type === 'hatchery' ? pyro : specialSites[s.type]);
        if (!s || !d || !s.stock)
            throw Error('SITE_UNAVAILABLE');
        if (living(p).length >= 6)
            throw Error('ARMY_FULL');
        if (p.gold < d.gold || p.ore < d.ore || p.crystal < d.crystal)
            throw Error('NO_RESOURCES');
        p.gold -= d.gold;
        p.ore -= d.ore;
        p.crystal -= d.crystal;
        s.stock--;
        p.army = living(p);
        const hp = d.hp + p.level * 2;
        p.army.push({ id: p.activeHero + '-site-' + g.day + '-' + p.ap + '-' + p.army.length, kind: d.kind, name: d.unit, faction: p.faction, side: 0, pos: 0, hp, max: hp, damage: d.damage, range: d.range });
        p.ap--;
        g.log.unshift(p.name + ': גויסה ' + d.unit + ' באתר.');
    }
    else if (['treasury', 'trade', 'improveMine'].includes(action.kind)) {
        if (action.kind === 'improveMine') {
            const s = g.sites.find(s => s.id === p.pos && s.type === 'mine' && s.owner === actor);
            if (!s)
                throw Error('RETURN_TO_MINE');
            const c = mineCosts[s.incomeLevel || 0];
            if (!c)
                throw Error('MAX_LEVEL');
            if (p.gold < c[0] || p.ore < c[1] || p.crystal < c[2])
                throw Error('NO_RESOURCES');
            p.gold -= c[0];
            p.ore -= c[1];
            p.crystal -= c[2];
            s.incomeLevel = (s.incomeLevel || 0) + 1;
        }
        else {
            if (p.pos !== base(g, p))
                throw Error('RETURN_TO_BASE');
            if (action.kind === 'trade') {
                const t = trades[action.unit!];
                if (!t)
                    throw Error('INVALID_TRADE');
                if (p[t.from] < t.amount)
                    throw Error('NO_RESOURCES');
                p[t.from] -= t.amount;
                p[t.to] += t.receive;
            }
            else {
                const c = treasuryCosts[p.treasury || 0];
                if (!c)
                    throw Error('MAX_LEVEL');
                if (p.gold < c[0] || p.ore < c[1] || p.crystal < c[2])
                    throw Error('NO_RESOURCES');
                p.gold -= c[0];
                p.ore -= c[1];
                p.crystal -= c[2];
                p.treasury = (p.treasury || 0) + 1;
            }
        }
        p.ap--;
    }
    else if (action.kind === 'build' || action.kind === 'cityRecruit') {
        if (p.pos !== base(g, p))
            throw Error('RETURN_TO_BASE');
        p.buildings ??= { barracks: 0, workshop: 0, observatory: 0, sanctuary: 0 };
        if (action.kind === 'build') {
            const key = action.unit!, d = buildings[key];
            if (!d)
                throw Error('INVALID_BUILDING');
            const lv = p.buildings[key] || 0, c = d.cost[lv];
            if (!c)
                throw Error('MAX_LEVEL');
            if (p.gold < c[0] || p.ore < c[1] || p.crystal < c[2])
                throw Error('NO_RESOURCES');
            p.gold -= c[0];
            p.ore -= c[1];
            p.crystal -= c[2];
            p.buildings[key] = lv + 1;
        }
        else {
            const kind = action.unitKind!, d = [...Object.values(specialSites), pyro].find(d => d.kind === kind), key = kind === 3 ? 'workshop' : kind === 4 ? 'sanctuary' : kind === 5 ? 'observatory' : 'barracks';
            if (!d || (p.buildings[key] || 0) < (kind >= 6 ? 2 : 1))
                throw Error('BUILDING_LOCKED');
            if (living(p).length >= 6)
                throw Error('ARMY_FULL');
            if (p.gold < d.gold || p.ore < d.ore || p.crystal < d.crystal)
                throw Error('NO_RESOURCES');
            p.gold -= d.gold;
            p.ore -= d.ore;
            p.crystal -= d.crystal;
            const hp = d.hp + p.level * 2 + (p.buildings[key] >= 2 ? 2 : 0);
            p.army = living(p);
            p.army.push({ id: p.activeHero + '-special-' + g.day + '-' + p.ap + '-' + p.army.length, kind: d.kind, name: d.unit, faction: p.faction, side: 0, pos: 0, hp, max: hp, damage: d.damage + (p.buildings[key] >= 2 ? 1 : 0), range: d.range });
        }
        p.ap--;
    }
    else if (['recruit', 'heal', 'upgrade'].includes(action.kind)) {
        if (p.pos !== base(g, p))
            throw Error('RETURN_TO_BASE');
        if (action.kind === 'recruit') {
            const kind = action.unitKind!;
            if (![0, 1, 2].includes(kind) || living(p).length >= 6)
                throw Error('INVALID_RECRUIT');
            const cost = [5, 8, 7][kind];
            if (p.gold < cost || p.ore < 2)
                throw Error('NO_RESOURCES');
            p.gold -= cost;
            p.ore -= 2;
            p.army = living(p);
            const u = recruitUnit({ faction: p.faction, level: p.level }, kind, p.activeHero + '-day' + g.day + '-ap' + p.ap + '-n' + p.army.length);
            if (p.buildings?.barracks >= 1) {
                u.hp += 2;
                u.max += 2;
            }
            if (p.buildings?.barracks >= 2)
                u.damage++;
            p.army.push(u);
        }
        else if (action.kind === 'heal') {
            if (p.gold < 4 || !living(p).some(u => u.hp < u.max))
                throw Error('CANNOT_HEAL');
            p.gold -= 4;
            p.army = living(p).map(u => ({ ...u, hp: u.max }));
        }
        else {
            if (p.level >= 2 || p.gold < 10 || p.ore < 5 || p.crystal < 2)
                throw Error('CANNOT_UPGRADE');
            p.gold -= 10;
            p.ore -= 5;
            p.crystal -= 2;
            p.level++;
            p.army.forEach(u => { u.hp += 2; u.max += 2; });
            for (const h of p.heroes.filter(h => h.id !== p.activeHero))
                for (const u of h.army) {
                    u.hp += 2;
                    u.max += 2;
                }
        }
        p.ap--;
    }
    else
        throw Error('INVALID_ACTION');
    g.log = g.log.slice(0, 20);
    return g;
}
function ensureCommanders(p: Player) { if (!p.heroes?.length) {
    p.activeHero = p.id + '-hero-0';
    p.heroes = [{ id: p.activeHero, name: p.name + ' · מפקד ראשי', pos: p.pos, ap: p.ap, maxAp: 3, army: p.army, equipment: p.equipment }];
} }
function syncCommander(p: Player) { ensureCommanders(p); const h = p.heroes.find(h => h.id === p.activeHero)!; h.pos = p.pos; h.ap = p.ap; h.army = p.army; h.equipment = p.equipment; }
function selectCommander(p: Player, h: Commander) { p.activeHero = h.id; p.pos = h.pos; p.ap = h.ap; p.army = h.army; p.equipment = h.equipment; }
export function applyShared(old: SharedGame, actor: string, action: SharedAction): SharedGame { const prepared = structuredClone(old); for (const p of prepared.players)
    syncCommander(p); const result = applyCore(prepared, actor, action); for (const p of result.players)
    syncCommander(p); return result; }
