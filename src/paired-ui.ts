import { pairedCity, pairedArmy, pairedEconomy } from './paired-panels';
import Phaser from 'phaser';
import { KingdomScene } from './scene';
import { Game, factions, buildings, specialSites, pyro, ability } from './engine';
import type { SharedGame, SharedAction } from '../server/paired';
type Session = {
    roomId: string;
    accessToken: string;
    player: string;
};
type Snapshot = {
    version: number;
    player: string;
    status: string;
    game: SharedGame | null;
};
const KEY = 'kingdom-independent.room.v1';
let activeGame: Phaser.Game | null = null;
let disposePanel: (() => void) | null = null;
function destroyCanvas() { activeGame?.destroy(true); activeGame = null; }
export function unmountPaired() { disposePanel?.(); disposePanel = null; destroyCanvas(); }
const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); e.textContent = text; e.className = cls; return e; };
const button = (text: string, fn: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = fn; return b; };
export function mountPaired(root: HTMLElement, leave: () => void) {
    let disposed = false;
    disposePanel = () => { disposed = true; };
    let pending: {
        id: string;
        expectedVersion: number;
        action: SharedAction;
    } | null = null;
    let session: Session | null = null, snapshot: Snapshot | null = null, message = 'בדיקת פיתוח בלבד. אין כרגע שרת באינטרנט. חוקי הזוגי עדיין אינם מלאים.', busy = false, selected = '', target: number | null = null;
    let scene: KingdomScene | null = null;
    let cameraView: {
        x: number;
        y: number;
        zoom: number;
    } | undefined, lastPosition: number | undefined;
    let generation = 0, managementOpen = false, tab = 'map', cityDetail: string | null = null;
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved && /^[a-f0-9]{32}$/.test(saved.roomId) && /^[a-f0-9]{64}$/.test(saved.accessToken) && ['p1', 'p2'].includes(saved.player)) {
            session = saved;
            pending = JSON.parse(localStorage.getItem(KEY + '.pending.' + saved.roomId) || 'null');
        }
    }
    catch {
        message = 'נתוני החדר המקומיים לא נקראו';
    }
    const base = '/api/rooms';
    async function request(path: string, body?: unknown, auth = true) { const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000); try {
        const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session && auth ? { Authorization: 'Bearer ' + session.accessToken } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal });
        const type = response.headers.get('content-type');
        if (!type?.includes('application/json'))
            throw Error('שרת המשחק הזוגי אינו מחובר. הסולו נפרד וממשיך לעבוד.');
        const data = await response.json();
        if (!response.ok) {
            if (data.error === 'STALE_VERSION') {
                await refresh();
                throw Object.assign(Error('התקבל מצב חדש מהשרת. בחרו פעולה מחדש, לא בוצעה דריסה.'), { responseStatus: response.status });
            }
            throw Object.assign(Error(({ FORBIDDEN: 'אין הרשאה לחדר הזה', NOT_YOUR_TURN: 'ממתינים לתור השחקן השני', WAIT_FOR_BATTLE_TURN: 'ממתינים לפקודת הקרב של השחקן השני', OUT_OF_RANGE: 'היעד מחוץ לטווח', NO_ACTIONS: 'אין פעולות. סיימו תור', NO_RESOURCES: 'אין די משאבים', INVALID_MOVE: 'בחרו משבצת סמוכה ופנויה', ALLY_OCCUPIES_TILE: 'הצבא של השותף נמצא בתא הזה', RETURN_TO_BASE: 'יש לחזור לבירה', CANNOT_HEAL: 'אין צורך בריפוי או שאין די משאבים', RATE_LIMITED: 'יותר מדי בקשות לחדר. המתינו דקה ונסו שוב', ROOM_STORAGE_LIMIT: 'החדר הגיע למגבלת האחסון. הפעולה לא נשמרה', DEPLOYMENT_NOT_ENABLED: 'שירות האינטרנט עדיין לא הופעל. אפשר לבדוק מקומית בלבד' })[data.error as string] || 'הפעולה לא בוצעה: ' + data.error), { responseStatus: response.status });
        }
        return data;
    }
    catch (e) {
        if (e instanceof TypeError)
            throw Error('אין חיבור לשרת זוגי. הסולו לא הושפע.');
        throw e;
    }
    finally {
        clearTimeout(timeout);
    } }
    async function task(fn: () => Promise<void>) { if (busy)
        return; busy = true; root.setAttribute('aria-busy', 'true'); for (const n of Array.from(root.querySelectorAll('button')))
        n.disabled = true; try {
        await fn();
    }
    catch (e) {
        message = e instanceof Error ? e.message : String(e);
    }
    finally {
        busy = false;
        root.removeAttribute('aria-busy');
        if (!disposed)
            draw();
    } }
    async function refresh() { if (!session)
        return; const next = await request(base + '/' + session.roomId); snapshot = next; }
    async function sendPending() { if (!session || !pending)
        return; const key = KEY + '.pending.' + session.roomId; try {
        snapshot = await request(base + '/' + session.roomId + '/command', pending);
        localStorage.removeItem(key);
        pending = null;
        message = 'הפעולה נשמרה בחדר · גרסה ' + snapshot!.version;
        target = null;
    }
    catch (e) {
        if ((e as any).responseStatus && (e as any).responseStatus !== 429) {
            localStorage.removeItem(key);
            pending = null;
        }
        else
            message = 'תוצאת הפעולה עדיין לא אומתה. נסו שוב עם אותו מזהה כדי לא לבצע פעמיים.';
        throw e;
    } }
    async function command(action: SharedAction) { if (!session || !snapshot?.game || pending)
        return; await task(async () => { pending = { id: crypto.randomUUID(), expectedVersion: snapshot!.version, action }; try {
        localStorage.setItem(KEY + '.pending.' + session!.roomId, JSON.stringify(pending));
    }
    catch {
        pending = null;
        throw Error('אין אפשרות לשמור את מזהה הפעולה. לא נשלחה פקודה.');
    } await sendPending(); }); }
    async function bootstrap() { const raw = localStorage.getItem(KEY + '.bootstrap'); if (!raw)
        return; const setup = JSON.parse(raw); const result = await request(base + '/' + setup.roomId + '/' + setup.operation, setup.body, false); store({ roomId: setup.roomId, accessToken: setup.body.accessToken, player: setup.operation === 'create' ? 'p1' : 'p2' }); if (setup.operation === 'create')
        sessionStorage.setItem('kingdom-invite', JSON.stringify({ roomId: setup.roomId, inviteToken: setup.body.inviteToken })); snapshot = setup.operation === 'create' ? null : result; localStorage.removeItem(KEY + '.bootstrap'); await refresh(); message = 'החדר והגישה נשמרו ואומתו מול השרת.'; }
    function store(next: Session) { try {
        localStorage.setItem(KEY, JSON.stringify(next));
        session = next;
    }
    catch {
        throw Error('אין אפשרות לשמור את מפתח החדר במכשיר. עצרנו לפני יציאה מהמסך.');
    } }
    function field(parent: HTMLElement, name: string, type = 'text') { const label = document.createElement('label'); label.textContent = name; const i = document.createElement('input'); i.type = type; i.maxLength = 100; i.ariaLabel = name; label.append(i); parent.append(label); return i; }
    function saveAccess() { if (!session)
        return; const raw = JSON.stringify({ format: 'kingdom-room-access', version: 1, ...session }); const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = 'kingdom-room-private-access.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); message = 'נוצר קובץ גישה פרטי. הוא מאפשר שליטה בשחקן, שמרו אותו לעצמכם ואל תשלחו בצ׳אט.'; draw(); }
    async function rotateAccess() { if (!session)
        return; if (pending)
        throw Error('יש לאמת תחילה את הפעולה הממתינה.'); if (!confirm('להחליף את מפתח הגישה? קבצי הגישה והמכשירים הקודמים של השחקן הזה יאבדו גישה. יש לגבות קובץ חדש אחרי ההחלפה.'))
        return; const nextToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''), old = session; const next = { ...old, accessToken: nextToken }; localStorage.setItem(KEY + '.rotation', JSON.stringify(next)); try {
        await request(base + '/' + old.roomId + '/rotate', { nextToken });
        store(next);
        localStorage.removeItem(KEY + '.rotation');
        message = 'מפתח הגישה הוחלף. המפתחות הקודמים בוטלו. הורידו גיבוי פרטי חדש.';
    }
    catch (e) {
        session = next;
        try {
            await refresh();
            store(next);
            localStorage.removeItem(KEY + '.rotation');
            message = 'החלפת הגישה אומתה אחרי ניתוק. הורידו גיבוי פרטי חדש.';
        }
        catch {
            session = old;
            throw e;
        }
    } }
    function restoreAccess() { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.onchange = () => void task(async () => { const file = input.files?.[0]; if (!file)
        return; if (file.size > 5000)
        throw Error('קובץ גישה גדול מדי'); const value = JSON.parse(await file.text()); if (value.format !== 'kingdom-room-access' || value.version !== 1 || !/^[a-f0-9]{32}$/.test(value.roomId) || !/^[a-f0-9]{64}$/.test(value.accessToken) || !['p1', 'p2'].includes(value.player))
        throw Error('קובץ גישה לא תקין'); const previous = session, previousSnapshot = snapshot; session = { roomId: value.roomId, accessToken: value.accessToken, player: value.player }; try {
        await refresh();
        if (snapshot!.player !== value.player)
            throw Error('קובץ שחקן לא תואם');
        store(session);
        pending = JSON.parse(localStorage.getItem(KEY + '.pending.' + session.roomId) || 'null');
        message = 'הגישה שוחזרה מהקובץ והמצב אומת מול השרת.';
    }
    catch (e) {
        session = previous;
        snapshot = previousSnapshot;
        throw e;
    } }); input.click(); }
    function faction(parent: HTMLElement, label: string) { const l = document.createElement('label'); l.textContent = label; const select = document.createElement('select'); select.ariaLabel = label; for (const f of factions) {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.name;
        select.append(option);
    } l.append(select); parent.append(l); return select; }
    function draw() {
        if (disposed)
            return;
        if (scene?.cameras?.main && !scene.state?.battle) {
            const c = scene.cameras.main;
            cameraView = { x: c.worldView.centerX, y: c.worldView.centerY, zoom: c.zoom };
        }
        scene = null;
        generation++;
        destroyCanvas();
        root.replaceChildren();
        const section = el('section', '', 'paired'), bar = el('div', '', 'bar');
        bar.append(el('h2', 'חדר זוגי · פיתוח מקומי'), button('חזרה לסולו', () => { generation++; unmountPaired(); leave(); }));
        section.append(bar, el('p', message, 'notice'));
        root.append(section);
        if (!session) {
            const form = el('div', '', 'paired-setup');
            if (localStorage.getItem(KEY + '.bootstrap'))
                form.append(button('המשך חיבור שלא אומת', () => task(bootstrap)));
            form.append(button('שחזור גישה מקובץ פרטי', restoreAccess), el('h3', 'יצירת חדר לשני צבאות נפרדים'));
            const name = field(form, 'שם השחקן'), f = faction(form, 'הברית שלי'), guest = faction(form, 'ברית השחקן השני');
            guest.value = 'crystal';
            const label = document.createElement('label');
            label.textContent = 'מצב בדיקה';
            const mode = document.createElement('select');
            mode.ariaLabel = 'מצב בדיקה';
            for (const [v, t] of [['cooperative', 'שיתוף פעולה'], ['versus', 'אחד נגד השני']]) {
                const o = document.createElement('option');
                o.value = v;
                o.textContent = t;
                mode.append(o);
            }
            label.append(mode);
            form.append(label, el('p', 'כללי הקרב כאן ניסיוניים: בקרב בין שחקנים ממתינים לכל פקודה של הצד השני. הכללים עוד לא אושרו לגרסה הסופית.'), button('יצירת חדר מקומי', () => task(async () => { if (!name.value.trim() || name.value.length > 60)
                throw Error('בחרו שם שחקן עד60תווים'); const roomId = crypto.randomUUID().replaceAll('-', ''), accessToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''), inviteToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); localStorage.setItem(KEY + '.bootstrap', JSON.stringify({ operation: 'create', roomId, body: { name: name.value, faction: f.value, guestFaction: guest.value, mode: mode.value, accessToken, inviteToken } })); await bootstrap(); })), el('h3', 'הצטרפות לחדר בדיקה'));
            const joinName = field(form, 'שם המצטרף'), id = field(form, 'מזהה חדר'), invite = field(form, 'הזמנה חד-פעמית', 'password');
            form.append(button('הצטרפות מקומית', () => task(async () => { if (!/^[a-f0-9]{32}$/.test(id.value.trim()))
                throw Error('מזהה החדר אינו תקין'); if (!joinName.value.trim() || joinName.value.length > 60 || !/^[a-f0-9]{64}$/.test(invite.value))
                throw Error('בדקו שם והזמנה'); const accessToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); localStorage.setItem(KEY + '.bootstrap', JSON.stringify({ operation: 'join', roomId: id.value.trim(), body: { name: joinName.value, inviteToken: invite.value, accessToken } })); await bootstrap(); ; })));
            section.append(form);
            return;
        }
        const row = el('div', '', 'group');
        row.append(button('ביטול גישה למכשירים קודמים', () => task(rotateAccess)), button('גיבוי גישה פרטי למכשיר אחר', saveAccess), button('רענון מהשרת', () => task(refresh)), button('יציאה מהמכשיר', () => { if (!confirm('לצאת מהחדר במכשיר הזה? בלי מפתח השחזור לא ניתן לחזור.'))
            return; localStorage.removeItem(KEY); session = null; snapshot = null; draw(); }));
        if (pending)
            row.append(button('אימות ושליחה חוזרת בטוחה', () => task(sendPending)));
        const management = document.createElement('details');
        management.className = 'room-management';
        management.open = managementOpen || snapshot?.status === 'waiting';
        management.ontoggle = () => { managementOpen = management.open; };
        const summary = el('summary', 'ניהול חדר · ' + session.player + ' · גרסה ' + (snapshot?.version ?? '?'));
        management.append(summary, row, el('p', 'מזהה חדר ' + session.roomId));
        section.append(management);
        if (!snapshot?.game) {
            section.append(button('החלפת הזמנה שאבדה', () => task(async () => { const data = await request(base + '/' + session!.roomId + '/invite', {}); sessionStorage.setItem('kingdom-invite', JSON.stringify({ roomId: session!.roomId, inviteToken: data.inviteToken })); message = 'נוצרה הזמנה חדשה. ההזמנה הקודמת בוטלה.'; })));
            section.append(el('p', 'ממתינים לשחקן השני. רעננו אחרי הצטרפותו.'));
            const invitation = sessionStorage.getItem('kingdom-invite');
            if (invitation) {
                const v = JSON.parse(invitation);
                if (v.roomId === session.roomId) {
                    section.append(button('הצגת הזמנת בדיקה חד-פעמית', () => { const d = document.createElement('dialog'); const value = document.createElement('input'); value.type = 'password'; value.readOnly = true; value.value = v.inviteToken; value.ariaLabel = 'הזמנה חד-פעמית'; d.append(el('p', 'מפתח הזמנה חד-פעמי. לא לשלוח בצילום מסך.'), value, button('הצגה/הסתרה', () => { value.type = value.type === 'password' ? 'text' : 'password'; }), button('סגירה', () => d.close())); section.append(d); d.showModal(); }));
                }
            }
            return;
        }
        const state = snapshot.game, p = state.players.find(p => p.id === session!.player)!;
        const canAct = state.battle ? state.battle.turn === session.player : state.turn === session.player;
        section.append(el('div', `יום ${state.day} · ${p.name} · ${factions.find(f => f.id === p.faction)?.name} · זהב ${p.gold} · עפרות ${p.ore} · גבישים ${p.crystal} · פעולות ${p.ap}`, 'resources'), el('p', state.winner ? (state.winner === 'team' ? 'ניצחון משותף! הצוות כבש את מצודת היעד.' : 'המערכה הסתיימה בניצחון ' + (state.players.find(player => player.id === state.winner)?.name || 'השחקן')) : canAct ? 'התור שלך' : 'ממתינים לשחקן השני, אפשר לסגור ולחזור מאוחר יותר.'));
        const tabs = el('nav');
        tabs.ariaLabel = 'מסכי המשחק הזוגי';
        for (const [key, name] of [['map', state.battle ? 'קרב' : 'מפה'], ['city', 'עיר'], ['army', 'צבא'], ['economy', 'כלכלה'], ['journal', 'יומן']]) {
            const n = button(name, () => { tab = key; if (key === 'city')
                cityDetail = null; draw(); });
            n.classList.toggle('active', tab === key);
            n.disabled = !!state.battle && key !== 'map';
            tabs.append(n);
        }
        section.append(tabs);
        if (state.battle)
            tab = 'map';
        if (tab === 'city' || tab === 'army' || tab === 'economy' || tab === 'journal') {
            const panel = el('div', '', 'paired-panel');
            section.append(panel);
            if (tab === 'journal') {
                const page = el('section', '', 'page');
                page.append(el('h2', 'יומן המערכה'));
                for (const line of state.log)
                    page.append(el('p', line, 'log'));
                panel.append(page);
            }
            else if (tab === 'army')
                pairedArmy(panel, p, canAct, a => void command(a));
            else if (tab === 'economy')
                pairedEconomy(panel, state, p, canAct, a => void command(a));
            else
                pairedCity(panel, state, p, canAct, cityDetail, s => { cityDetail = s; draw(); }, a => void command(a));
            return;
        }
        const world = el('div', '', 'paired-world'), canvas = el('div', '', 'canvas'), controls = el('div', '', 'context');
        const maptools = el('div', '', 'maptools');
        for (const [label, fn] of [['+', () => scene?.zoom(.15)], ['−', () => scene?.zoom(-.15)], ['מרכוז', () => scene?.center()]] as [
            string,
            () => void
        ][])
            maptools.append(button(label, fn));
        if (!state.battle)
            canvas.append(maptools);
        else {
            const key = el('div', 'כחול: טווח תקיפה · ◆ יריב', 'battle-key');
            canvas.append(key);
        }
        world.classList.toggle('in-battle', !!state.battle);
        world.append(canvas, controls);
        section.append(world);
        const me = { ...createView(state, p.id), faction: p.faction };
        scene = new KingdomScene();
        scene.initialView = lastPosition === p.pos && !state.battle ? cameraView : undefined;
        lastPosition = p.pos;
        scene.ally = state.mode === 'cooperative';
        scene.actorLabel = state.mode === 'cooperative' ? '+' : '◆';
        scene.state = me;
        scene.choose = n => { target = n; if (state.battle) {
            const u = state.battle.units.find(u => u.hp > 0 && u.pos === n);
            if (u?.owner === p.id) {
                selected = u.id;
                scene!.selectedUnit = selected;
                scene!.draw();
                buttons();
                return;
            }
            void command({ kind: u ? 'strike' : 'march', unit: selected, enemy: u?.id, target: n });
        }
        else {
            const own = p.heroes?.find(h => h.id !== p.activeHero && h.pos === n);
            if (own && canAct) {
                void command({ kind: 'selectHero', hero: own.id });
                return;
            }
            const opponent = state.players.find(x => x.id !== p.id), enemy = state.mode === 'versus' && opponent && (opponent.heroes?.some(h => h.pos === n) || n === (state.players[0].id === opponent.id ? 0 : state.size * state.size - 1));
            if (enemy && Math.max(Math.abs(n % state.size - p.pos % state.size), Math.abs(Math.floor(n / state.size) - Math.floor(p.pos / state.size))) <= 1) {
                void command({ kind: 'move', target: n });
                return;
            }
            buttons();
        } };
        function buttons() {
            controls.replaceChildren();
            if (state.battle) {
                const units = state.battle.units.filter(u => u.owner === p.id && u.hp > 0);
                if (!units.some(u => u.id === selected))
                    selected = units[0]?.id || '';
                scene!.selectedUnit = selected;
                const picks = el('div', '', 'battle-picks');
                controls.append(picks);
                for (const u of units) {
                    const pick = button(u.name, () => { selected = u.id; scene!.selectedUnit = selected; scene!.draw(); buttons(); });
                    pick.classList.toggle('active', u.id === selected);
                    picks.append(pick);
                }
                const chosen = units.find(u => u.id === selected);
                if (chosen)
                    controls.append(el('p', chosen.name + ' · ' + chosen.hp + '/' + chosen.max + ' חיים · נזק ' + chosen.damage + ' · טווח ' + chosen.range, 'battle-summary'));
                const skill = chosen && ability({ faction: p.faction } as Game, chosen);
                if (chosen && skill) {
                    const b = button(skill.name, () => { if (skill.range === 0)
                        void command({ kind: 'ability', unit: chosen.id });
                    else {
                        const enemies = state.battle!.units.filter(u => u.owner !== p.id && u.hp > 0);
                        controls.append(el('span', 'בחרו אויב ליכולת'));
                        for (const e of enemies)
                            controls.append(button(e.name + ' ' + e.hp + 'חיים', () => void command({ kind: 'ability', unit: chosen.id, enemy: e.id })));
                    } });
                    b.disabled = !!chosen.used;
                    controls.append(b);
                }
                const label = document.createElement('label');
                label.textContent = 'תא קרב ';
                const target = document.createElement('select');
                target.ariaLabel = 'תא יעד בקרב';
                for (let n = 0; n < 30; n++) {
                    const o = document.createElement('option');
                    o.value = String(n);
                    o.textContent = 'שורה ' + (Math.floor(n / 6) + 1) + ' עמודה ' + (n % 6 + 1);
                    target.append(o);
                }
                label.append(target);
                controls.append(label, button('פקודה ליעד', () => scene?.choose(Number(target.value))));
                if (!state.battle.defender)
                    controls.append(button('קרב אוטומטי מול שומרים', () => { if (confirm('לפתור את הקרב מול השומרים אוטומטית? אבדות יישמרו.'))
                        void command({ kind: 'auto' }); }));
                controls.append(button('נסיגה', () => void command({ kind: 'retreat' })));
            }
            else {
                controls.append(button('סיום תור', () => void command({ kind: 'endTurn' })));
                for (const n of [-state.size, 1, state.size, -1])
                    controls.append(button(n === 1 ? '→' : n === -1 ? '←' : n > 0 ? '↓' : '↑', () => void command({ kind: 'move', target: p.pos + n })));
                if (target !== null) {
                    controls.append(el('span', 'יעד ' + target), button('תנועה/התקפה ליעד', () => void command({ kind: 'move', target: target! })));
                }
                const at = state.sites.find(s => s.id === p.pos);
                if (at) {
                    controls.append(el('span', ({ mine: 'מכרה', cache: 'אוצר', spring: 'מעיין', camp: 'מחנה', beacon: 'משואה', quest: 'משימה', relic: 'שריד עתיק', ruin: 'חורבה', base: 'בירה', citadel: 'מצודת יעד' } as Record<string, string>)[at.type] || specialSites[at.type]?.name || 'אתר'));
                    if (!at.done || at.type === 'mine' && at.owner !== p.id && state.mode === 'versus')
                        controls.append(button(at.guard ? 'כניסה לקרב באתר' : 'חקירת האתר', () => void command({ kind: 'visit' })));
                    if (at.owner === p.id && specialSites[at.type])
                        for (const d of [specialSites[at.type], ...(at.type === 'hatchery' ? [pyro] : [])]) {
                            const b = button('גיוס ' + d.unit + ' · מלאי ' + (at.stock || 0) + ' ·' + [d.gold, d.ore, d.crystal].join('/'), () => void command({ kind: 'siteRecruit', unitKind: d.kind }));
                            b.disabled = !at.stock || p.army.filter(u => u.hp > 0).length >= 6 || p.gold < d.gold || p.ore < d.ore || p.crystal < d.crystal;
                            controls.append(b);
                        }
                }
                controls.append(button('כניסה לעיר', () => { tab = 'city'; cityDetail = null; draw(); }));
            }
            for (const b of Array.from(controls.querySelectorAll('button')))
                b.disabled = b.disabled || !canAct || busy || !!pending || !!state.winner;
        }
        buttons();
        const localScene = scene, rev = generation;
        activeGame = new Phaser.Game({ type: Phaser.AUTO, parent: canvas, backgroundColor: '#102b38', scale: { mode: Phaser.Scale.RESIZE, width: canvas.clientWidth, height: canvas.clientHeight }, scene: [localScene], audio: { noAudio: true } });
        setTimeout(() => { if (generation === rev && !localScene.initialView)
            localScene.center(); }, 150);
    }
    draw();
    if (session)
        void task(async () => { const raw = localStorage.getItem(KEY + '.rotation'); if (raw) {
            const replacement = JSON.parse(raw), old = session;
            if (replacement.roomId === session!.roomId) {
                session = replacement;
                try {
                    await refresh();
                    store(replacement);
                    localStorage.removeItem(KEY + '.rotation');
                    message = 'הגישה החדשה אומתה אחרי הפעלה מחדש.';
                    return;
                }
                catch {
                    session = old;
                }
            }
        } await refresh(); localStorage.removeItem(KEY + '.rotation'); });
}
function createView(state: SharedGame, viewer: string): Game { const p = state.players.find(p => p.id === viewer)!; const other = state.players.find(p => p.id !== viewer)!; const seen = state.mode === 'cooperative' ? Array.from(new Set(state.players.flatMap(p => p.seen))) : p.seen; return { version: 6, worldSize: state.size, buildings: {}, relics: [], heroes: (p.heroes || []).map(h => ({ ...h, title: '', specialty: 'warden' as const })), activeHero: p.activeHero, serial: 0, rivals: (other.heroes?.length ? other.heroes : [{ pos: other.pos, army: other.army }]).map((h, i) => ({ id: i, capital: i === 0 ? (state.players[0].id === other.id ? 0 : 323) : -1, faction: other.faction, pos: h.pos, gold: 0, ore: 0, level: other.level, army: h.army, mines: [], defeated: other.defeated, cooldown: 0, turns: 0, siegeDays: 0 })), seed: state.seed, faction: p.faction, pos: p.pos, seen, terrain: state.terrain, sites: state.sites.map(s => ({ id: s.id, type: s.type === 'citadel' ? 'gate' : s.type as any, guard: s.guard, owner: s.owner === viewer, done: s.done, resource: s.resource as any })), gold: p.gold, ore: p.ore, crystal: p.crystal, day: state.day, level: p.level, army: p.army, battle: state.battle ? { site: state.battle.site, selected: '', round: state.battle.round, units: state.battle.units.map(u => ({ ...u, side: u.owner === viewer ? 0 : 1 })) } : null, log: state.log, quests: 0, victories: 0, finished: !!state.winner, lost: p.defeated }; }
