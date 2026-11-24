import { normalize, Game } from './engine';
export type Save = {
    id: string;
    profile: string;
    name: string;
    updated: number;
    game: Game;
};
const KEY = 'kingdom-independent.saves.v1';
const invalid = () => { throw Error('קובץ השמירה אינו תקין. השמירות הקיימות לא שונו'); };
const record = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: any, max = 200) => typeof v === 'string' && v.length <= max;
const integer = (v: any, min = 0, max = 1e9) => Number.isInteger(v) && v >= min && v <= max;
const list = (v: any, max = 2000) => Array.isArray(v) && v.length <= max;
const optionalInt = (v: any, max = 1e9) => v === undefined || integer(v, 0, max);
const faction = (v: any) => ['mars', 'crystal', 'tide', 'grove'].includes(v);
export function validateGame(value: unknown): Game {
    const g = value as any;
    if (!record(g) || g.version !== 6 || !list(g.terrain, 1024) || ![100, 324, 576, 1024].includes(g.terrain.length) || !g.terrain.every((x: any) => integer(x, 0, 3)) || !faction(g.faction))
        invalid();
    if (g.rulesRevision !== undefined && g.rulesRevision !== 2) invalid();
    const cells = g.terrain.length, pos = (n: any) => integer(n, 0, cells - 1);
    if(g.builtDay!==undefined&&!integer(g.builtDay,1,g.day))invalid();
    if(g.recruitmentStock!==undefined&&(!list(g.recruitmentStock,8)||g.recruitmentStock.length!==8||!g.recruitmentStock.every((n:any)=>integer(n,0,20))))invalid();
    if (g.roads !== undefined && (!list(g.roads, cells) || !g.roads.every(pos))) invalid();
    const units = (a: any, battle = false) => { if (!list(a, battle ? 12 : 6))
        invalid(); const ids = new Set(); const occupied = new Set(); for (const u of a) {
        if (!record(u) || !text(u.id, 100) || !u.id || ids.has(u.id) || !text(u.name) || !integer(u.kind, 0, 7) || !integer(u.side, 0, 1) || !integer(u.pos, 0, battle ? 29 : cells - 1) || !integer(u.hp) || !integer(u.max, 1) || u.hp > u.max || !integer(u.damage) || !integer(u.range, 0, 10) || (u.faction !== undefined && !faction(u.faction)) || !optionalInt(u.charge, 6) || !optionalInt(u.baseDamage) || !optionalInt(u.baseRange, 10) || (u.used !== undefined && typeof u.used !== 'boolean'))
            invalid();
        if (battle && u.hp > 0) {
            if (occupied.has(u.pos))
                invalid();
            occupied.add(u.pos);
        }
        ids.add(u.id);
    } };
    if (!pos(g.pos) || !integer(g.seed, 0, 4294967295) || !integer(g.day, 1) || !integer(g.level, 0, 2) || !integer(g.gold) || !integer(g.ore) || !integer(g.crystal) || !integer(g.serial) || !integer(g.quests) || !integer(g.victories) || typeof g.finished !== 'boolean' || typeof g.lost !== 'boolean' || !optionalInt(g.treasury, 2))
        invalid();
    if (!list(g.seen, cells) || !g.seen.every(pos) || !list(g.log, 100) || !g.log.every((x: any) => text(x, 1000)) || !list(g.relics, 20) || !g.relics.every((x: any) => ['lens', 'shield', 'coil'].includes(x)) || !record(g.buildings) || !['barracks', 'workshop', 'observatory', 'sanctuary'].every(k => integer(g.buildings[k], 0, 2)))
        invalid();
    if (g.doctrine !== undefined && !['arms', 'bastion', 'trade'].includes(g.doctrine))
        invalid();
    if (!list(g.heroes, 3) || !g.heroes.length || !text(g.activeHero, 100))
        invalid();
    const heroIds = new Set();
    const unitIds = new Set();
    for (const h of g.heroes) {
        if (!record(h) || !text(h.id, 100) || !h.id || heroIds.has(h.id) || !text(h.name) || !text(h.title) || !['scout', 'warden', 'artificer'].includes(h.specialty) || !pos(h.pos) || !integer(h.ap, 0, 20) || !integer(h.maxAp, 1, 20) || h.ap > h.maxAp || !optionalInt(h.xp) || !optionalInt(h.rank, 100) || !optionalInt(h.attack, 100) || !optionalInt(h.defense, 100) || (h.talents !== undefined && (!list(h.talents, 20) || !h.talents.every((x: any) => ['attack', 'defense', 'specialty'].includes(x)))) || (h.equipment !== undefined && !['lens', 'shield', 'coil'].includes(h.equipment)))
            invalid();
        units(h.army);
        for (const u of h.army) {
            if (unitIds.has(u.id))
                invalid();
            unitIds.add(u.id);
        }
        heroIds.add(h.id);
    }
    if (!heroIds.has(g.activeHero))
        invalid();
    units(g.army);
    if (!list(g.sites, cells))
        invalid();
    const siteIds = new Set();
    for (const s of g.sites) {
        if (!record(s) || !pos(s.id) || siteIds.has(s.id) || !['base', 'mine', 'cache', 'quest', 'ruin', 'gate', 'factory', 'sanctuary', 'gravity', 'hatchery', 'relic', 'camp', 'spring', 'beacon'].includes(s.type) || typeof s.done !== 'boolean' || typeof s.owner !== 'boolean' || !integer(s.guard, 0, 10) || !optionalInt(s.incomeLevel, 2) || !optionalInt(s.stock, 10) || (s.type === 'mine' && !['gold', 'ore', 'crystal'].includes(s.resource)))
            invalid();
        siteIds.add(s.id);
    }
    if (!list(g.rivals, 2))
        invalid();
    const rivals = new Set();
    for (const r of g.rivals) {
        if (!record(r) || !integer(r.id, 0, 2) || rivals.has(r.id) || !pos(r.capital) || !pos(r.pos) || !faction(r.faction) || !integer(r.gold) || !integer(r.ore) || !integer(r.level, 0, 2) || !integer(r.cooldown) || !integer(r.turns) || !integer(r.siegeDays) || typeof r.defeated !== 'boolean' || !list(r.mines, cells) || !r.mines.every(pos))
            invalid();
        units(r.army);
        rivals.add(r.id);
    }
    if (g.battle !== null) {
        const b = g.battle;
        if (!record(b) || !pos(b.site) || !integer(b.round, 1) || !text(b.selected, 100) || (b.rival !== undefined && !rivals.has(b.rival)) || (b.siege !== undefined && typeof b.siege !== 'boolean') || (b.roaming !== undefined && typeof b.roaming !== 'boolean'))
            invalid();
        units(b.units, true);
    }
    if (g.lastIncome !== undefined) {
        const i = g.lastIncome;
        if (!record(i) || !integer(i.day, 1) || !integer(i.gold) || !integer(i.ore) || !integer(i.crystal))
            invalid();
    }
    return normalize(structuredClone(g));
}
export function listSaves(): Save[] { const raw = localStorage.getItem(KEY); if (!raw)
    return []; if (raw.length > 20 * 1024 * 1024)
    throw Error('רשימת השמירות גדולה מדי'); const v = JSON.parse(raw); if (!list(v, 100))
    throw Error('רשימת השמירות פגומה. לא תוחלף אוטומטית'); const ids = new Set(); for (const s of v) {
    if (!record(s) || !text(s.id, 100) || ids.has(s.id) || !text(s.profile, 60) || !text(s.name, 200) || !integer(s.updated, 0, 1e15))
        invalid();
    s.game = validateGame(s.game);
    ids.add(s.id);
} return v; }
export function putSave(s: Save) { const game = validateGame(s.game), all = listSaves(), i = all.findIndex(x => x.id === s.id), candidate = { ...s, game }; if (i >= 0)
    all[i] = candidate;
else
    all.push(candidate); localStorage.setItem(KEY, JSON.stringify(all)); }
export function exportSave(s: Save) { return JSON.stringify({ format: 'kingdom-independent', version: 1, save: { ...s, game: validateGame(s.game) } }); }
export function importSave(raw: string, profile: string): Save { if (raw.length > 1024 * 1024)
    throw Error('קובץ גדול מדי'); const v = JSON.parse(raw); if (!record(v))
    invalid(); if (v.format === 'kingdom-independent' && v.version !== 1)
    throw Error('גרסת שמירה לא נתמכת'); const candidate = v.format === 'kingdom-independent' ? v.save?.game : v; const game = validateGame(candidate); return { id: crypto.randomUUID(), profile, name: 'יבוא · יום ' + game.day, updated: Date.now(), game }; }
