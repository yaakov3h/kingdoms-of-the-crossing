import { factions, buildings, specialSites, pyro, ability, Game, trades, treasuryCosts, mineCosts, equipment } from './engine';
import { img, art } from './art';
import type { Player, SharedGame, SharedAction } from '../server/paired';
const e = (tag: string, text = '', cls = '') => { const n = document.createElement(tag); n.textContent = text; n.className = cls; return n; };
const b = (text: string, fn: () => void) => { const n = document.createElement('button'); n.type = 'button'; n.textContent = text; n.onclick = fn; return n; };
export function pairedArmy(root: HTMLElement, p: Player, canAct: boolean, command: (a: SharedAction) => void) { const page = e('section', '', 'page'); page.append(e('h2', 'הצבא של ' + p.name), e('p', 'הצבא הזה שייך רק לשחקן הזה. יחידות שאבדו אינן חוזרות בריפוי.')); page.append(e('h3', 'המשלחות שלך')); for (const h of p.heroes || []) {
    const card = e('article', '', 'card'), select = b(h.id === p.activeHero ? 'המשלחת הפעילה' : 'הפעלת ' + h.name, () => command({ kind: 'selectHero', hero: h.id }));
    select.disabled = !canAct || h.id === p.activeHero;
    card.append(e('h3', h.name), e('p', 'תא ' + h.pos + ' · פעולות ' + h.ap + '/' + h.maxAp + ' · יחידות ' + h.army.filter(u => u.hp > 0).length), select);
    if (h.id !== p.activeHero && h.pos === p.pos)
        for (const u of p.army.filter(u => u.hp > 0)) {
            const transfer = b('העברת ' + u.name + ' אל ' + h.name, () => command({ kind: 'transfer', hero: h.id, unit: u.id }));
            transfer.disabled = !canAct || p.ap <= 0 || p.army.filter(u => u.hp > 0).length <= 1 || h.army.filter(u => u.hp > 0).length >= 6;
            card.append(transfer);
        }
    page.append(card);
} const grid = e('div', '', 'units'); for (const u of p.army.filter(u => u.hp > 0)) {
    const card = e('article', '', 'card');
    card.append(img(art(u.faction || p.faction, u.kind)), e('h3', u.name), e('p', u.hp + '/' + u.max + ' חיים · ' + u.damage + ' נזק · טווח ' + u.range));
    const skill = ability({ faction: p.faction } as Game, u);
    if (skill)
        card.append(e('p', skill.name + ': ' + skill.detail));
    grid.append(card);
} page.append(grid, e('h3', 'ציוד המשלחת')); if (!p.relics?.length)
    page.append(e('p', 'מצאו שרידים במפה כדי לפתוח ציוד.')); for (const key of p.relics || []) {
    const card = e('article', '', 'card'), item = equipment[key];
    const action = b(p.equipment === key ? 'מצויד' : 'ציוד ' + item.name, () => command({ kind: 'equip', unit: key }));
    const holder = p.heroes?.find(h => h.id !== p.activeHero && h.equipment === key);
    action.disabled = !canAct || p.ap <= 0 || p.equipment === key || !!holder;
    if (holder)
        card.append(e('p', 'בשימוש אצל ' + holder.name));
    card.append(e('h3', item.name), e('p', item.effect), action);
    page.append(card);
} root.append(page); }
export function pairedCity(root: HTMLElement, state: SharedGame, p: Player, canAct: boolean, detail: string | null, choose: (s: string | null) => void, command: (a: SharedAction) => void) {
    const home = state.players[0].id === p.id ? 0 : state.size * state.size - 1, available = canAct && p.pos === home && p.ap > 0 && !state.battle && !state.winner;
    const act = (text: string, action: SharedAction, cost: number[], extra = true) => { const n = b(text, () => command(action)); n.disabled = !available || !extra || p.gold < cost[0] || p.ore < cost[1] || p.crystal < cost[2]; return n; };
    if (detail === null) {
        const section = e('section', '', 'cityscreen'), bar = e('div', '', 'citybar');
        bar.append(e('h2', factions.find(f => f.id === p.faction)!.name), e('span', p.pos === home ? 'המשלחת בבירה' : 'המשלחת מחוץ לבירה'));
        const field = e('div', '', 'cityfield'), panorama = e('div', '', 'panorama faction-' + p.faction);
        panorama.append(img('city-' + p.faction));
        const center = b('', () => choose('center'));
        center.className = 'cityhit palace';
        center.ariaLabel = 'מרכז העיר הזוגית';
        center.append(e('span', 'מרכז · ' + p.level));
        panorama.append(center);
        for (const [key, d] of Object.entries(buildings)) {
            const hit = b('', () => choose(key));
            hit.className = 'cityhit hit-' + key;
            hit.ariaLabel = d.name + ' זוגי';
            hit.append(e('span', ({ barracks: 'משמר', workshop: 'סדנה', observatory: 'מכון', sanctuary: 'גן' } as Record<string, string>)[key] + ' · ' + (p.buildings?.[key] || 0)));
            panorama.append(hit);
        }
        field.append(panorama);
        section.append(bar, field, e('p', 'בחרו מבנה. שדרוג וגיוס זמינים רק בתור שלכם וכשהמשלחת בבירה.'));
        root.append(section);
        return;
    }
    const page = e('section', '', 'page'), inner = e('div', '', 'inner');
    inner.append(b('חזרה לעיר', () => choose(null)), e('h2', detail === 'center' ? 'מרכז העיר' : buildings[detail].name), e('p', available ? 'פעולות העיר יישמרו בחדר לאחר אישור השרת.' : !canAct ? 'ממתינים לתור שלכם. אפשר לעיין בעיר בלי לשנות אותה.' : p.pos !== home ? 'יש להחזיר את המשלחת לבירה.' : 'אין פעולות. סיימו תור במפה.'));
    if (detail === 'center') {
        inner.append(e('p', 'שדרוג המרכז מוסיף2חיים ליחידות הקיימות ולגיוסים חדשים.'), act('שדרוג מרכז ·10זהב5עפרות2גבישים', { kind: 'upgrade' }, [10, 5, 2], p.level < 2), act('מפקד נוסף ·18זהב4עפרות2גבישים', { kind: 'hireHero' }, [18, 4, 2], (p.heroes?.length || 1) < 3), act('ריפוי השורדים ·4זהב', { kind: 'heal' }, [4, 0, 0], p.army.some(u => u.hp > 0 && u.hp < u.max)), e('h3', 'גיוס יחידות בסיס'));
        for (const [k, name] of factions.find(f => f.id === p.faction)!.units.entries())
            inner.append(act(name + ' ·' + [5, 8, 7][k] + 'זהב2עפרות', { kind: 'recruit', unitKind: k }, [[5, 8, 7][k], 2, 0], p.army.filter(u => u.hp > 0).length < 6));
    }
    else {
        const d = buildings[detail], lv = p.buildings?.[detail] || 0;
        const pic = img(d.art);
        pic.className = 'buildingportrait';
        inner.append(pic, e('h3', 'רמה ' + lv + '/2'));
        d.unlock.forEach((t, i) => inner.append(e('p', 'רמה ' + (i + 1) + ': ' + t)));
        if (lv < 2)
            inner.append(act('שדרוג לרמה ' + (lv + 1) + ' ·' + d.cost[lv][0] + 'זהב ' + d.cost[lv][1] + 'עפרות ' + d.cost[lv][2] + 'גבישים', { kind: 'build', unit: detail }, d.cost[lv]));
        const kind = detail === 'workshop' ? 3 : detail === 'sanctuary' ? 4 : detail === 'observatory' ? 5 : 6, unit = Object.values(specialSites).find(d => d.kind === kind)!;
        for (const u of [unit, ...(detail === 'barracks' ? [pyro] : [])]) {
            const card = e('article', '', 'card');
            card.append(img(art(p.faction, u.kind)), e('h3', u.unit), e('p', u.hp + ' חיים · ' + u.damage + 'נזק · טווח ' + u.range), act('גיוס ' + u.unit + ' ·' + u.gold + 'זהב ' + u.ore + 'עפרות ' + u.crystal + 'גבישים', { kind: 'cityRecruit', unitKind: u.kind }, [u.gold, u.ore, u.crystal], lv >= (u.kind >= 6 ? 2 : 1) && p.army.filter(u => u.hp > 0).length < 6));
            inner.append(card);
        }
    }
    page.append(inner);
    root.append(page);
}
export function pairedEconomy(root: HTMLElement, state: SharedGame, p: Player, canAct: boolean, command: (a: SharedAction) => void) {
    const page = e('section', '', 'page'), inner = e('div', '', 'inner'), mines = state.sites.filter(s => s.type === 'mine' && s.owner === p.id), income = { gold: 2 + (p.treasury || 0) * 2, ore: 1, crystal: p.treasury || 0 };
    for (const s of mines) {
        const key = (s.resource || 'gold') as keyof typeof income;
        income[key] += (key === 'crystal' ? 1 : 2) + (s.incomeLevel || 0);
    }
    inner.append(e('h2', 'האוצר והשוק של ' + p.name), e('p', 'הכנסה בתחילת יום משותף חדש: ' + income.gold + 'זהב ' + income.ore + 'עפרות ' + income.crystal + 'גבישים'), e('p', 'הכנסה מתקבלת לשני השחקנים יחד אחרי ששניהם סיימו את תורם.'));
    const buttonAction = (text: string, a: SharedAction, cost: number[], available: boolean) => { const n = b(text, () => command(a)); n.disabled = !canAct || p.ap <= 0 || !!state.winner || !available || p.gold < cost[0] || p.ore < cost[1] || p.crystal < cost[2]; return n; };
    const home = p.pos === (state.players[0].id === p.id ? 0 : 323), lv = p.treasury || 0;
    inner.append(e('h3', 'אוצר הבירה · רמה ' + lv));
    if (lv < 2) {
        const c = treasuryCosts[lv];
        inner.append(buttonAction('שדרוג אוצר ·' + c.join('/'), { kind: 'treasury' }, c, home));
    }
    inner.append(e('h3', 'שוק הבירה · כל עסקה עולה פעולה'));
    for (const [key, t] of Object.entries(trades)) {
        const c = [0, 0, 0];
        c[['gold', 'ore', 'crystal'].indexOf(t.from)] = t.amount;
        inner.append(buttonAction(t.label, { kind: 'trade', unit: key }, c, home));
    }
    inner.append(e('h3', 'מכרות בשליטתכם'));
    for (const s of mines) {
        const card = e('article', '', 'card');
        card.append(e('h3', 'מכרה ' + ({ gold: 'זהב', ore: 'עפרות', crystal: 'גבישים' } as Record<string, string>)[s.resource || 'gold'] + ' · תא ' + s.id), e('p', 'רמת שדרוג ' + (s.incomeLevel || 0)));
        if ((s.incomeLevel || 0) < 2) {
            const c = mineCosts[s.incomeLevel || 0];
            card.append(buttonAction('שדרוג המכרה במקום ·' + c.join('/'), { kind: 'improveMine' }, c, p.pos === s.id));
        }
        inner.append(card);
    }
    page.append(inner);
    root.append(page);
}
