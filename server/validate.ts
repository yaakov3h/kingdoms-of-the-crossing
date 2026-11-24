import type { SharedGame } from './paired';
export function validateShared(g: SharedGame) {
    const fail = () => { throw Error('STATE_INVARIANT'); }, integer = (n: unknown, min = 0, max = 1e9) => Number.isInteger(n) && Number(n) >= min && Number(n) <= max;
    if (!g || g.schema !== 1 || !['cooperative', 'versus'].includes(g.mode) || g.size !== 18 || g.terrain.length !== 324 || g.terrain.some(n => !integer(n, 0, 3)) || !integer(g.day, 1) || g.players.length !== 2)
        fail();
    const ids = new Set(g.players.map(p => p.id));
    if (ids.size !== 2 || !ids.has(g.turn))
        fail();
    const armyIds = new Set<string>();
    for (const p of g.players) {
        if (!p.id || typeof p.name !== 'string' || p.name.length > 60 || !['mars', 'crystal', 'tide', 'grove'].includes(p.faction) || !integer(p.pos, 0, 323) || !integer(p.ap, 0, 3) || !integer(p.gold) || !integer(p.ore) || !integer(p.crystal) || !integer(p.level, 0, 2) || !integer(p.treasury || 0, 0, 2) || typeof p.defeated !== 'boolean' || p.seen.some(n => !integer(n, 0, 323)) || p.army.length > 6 || (p.relics && (!Array.isArray(p.relics) || p.relics.length > 3 || p.relics.some(r => !['lens', 'shield', 'coil'].includes(r)))) || (p.equipment !== undefined && (!['lens', 'shield', 'coil'].includes(p.equipment) || !p.relics?.includes(p.equipment))))
            fail();
        if (!p.heroes?.length || p.heroes.length > 3 || !p.heroes.some(h => h.id === p.activeHero))
            fail();
        const commanderIds = new Set<string>(), ownedUnits = new Set<string>(), equipped = new Set<string>();
        for (const h of p.heroes) {
            if (typeof h.id !== 'string' || !h.id || typeof h.name !== 'string' || !h.name || commanderIds.has(h.id) || !integer(h.pos, 0, 323) || !integer(h.ap, 0, h.maxAp) || !integer(h.maxAp, 1, 4) || h.army.length > 6)
                fail();
            commanderIds.add(h.id);
            if (h.equipment !== undefined) {
                if (!['lens', 'shield', 'coil'].includes(h.equipment) || !p.relics?.includes(h.equipment) || equipped.has(h.equipment))
                    fail();
                equipped.add(h.equipment);
            }
            for (const u of h.army) {
                if (ownedUnits.has(u.id) || armyIds.has(u.id) || typeof u.id !== 'string' || !integer(u.hp) || !integer(u.max, 1) || u.hp > u.max || !integer(u.damage) || !integer(u.range, 0, 10) || !integer(u.kind, 0, 7))
                    fail();
                ownedUnits.add(u.id);
                armyIds.add(u.id);
            }
        }
        const active = p.heroes.find(h => h.id === p.activeHero)!;
        if (active.pos !== p.pos || active.ap !== p.ap || active.equipment !== p.equipment || JSON.stringify(active.army) !== JSON.stringify(p.army))
            fail();
        for (const lv of Object.values(p.buildings || {}))
            if (!integer(lv, 0, 2))
                fail();
        for (const u of p.army) {
            if (!integer(u.hp) || !integer(u.max, 1) || u.hp > u.max || !integer(u.damage) || !integer(u.range, 0, 10) || !integer(u.kind, 0, 7))
                fail();
        }
    }
    const sites = new Set<number>();
    for (const s of g.sites) {
        if (!integer(s.id, 0, 323) || sites.has(s.id) || !integer(s.guard, 0, 10) || !integer(s.incomeLevel || 0, 0, 2) || !integer(s.stock || 0, 0, 3) || (s.owner !== null && !ids.has(s.owner)) || typeof s.done !== 'boolean')
            fail();
        sites.add(s.id);
    }
    if (g.winner !== null && g.winner !== 'team' && !ids.has(g.winner))
        fail();
    if (g.battle) {
        const b = g.battle, occupied = new Set<number>(), unitIds = new Set<string>();
        if (!ids.has(b.attacker) || (b.defender !== null && !ids.has(b.defender)) || !ids.has(b.turn) || !integer(b.site, 0, 323) || !integer(b.round, 1) || b.units.length > 12)
            fail();
        for (const u of b.units) {
            if (unitIds.has(u.id) || (!ids.has(u.owner) && u.owner !== 'neutral') || !integer(u.pos, 0, 29) || !integer(u.hp) || !integer(u.max, 1) || u.hp > u.max || !integer(u.damage) || !integer(u.range, 0, 10))
                fail();
            if (u.hp > 0) {
                if (occupied.has(u.pos))
                    fail();
                occupied.add(u.pos);
            }
            unitIds.add(u.id);
        }
    }
    return g;
}
