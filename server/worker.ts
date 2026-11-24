import { validateShared } from './validate';
import { createShared, applyShared, SharedGame, SharedAction } from './paired';
interface Storage {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    transaction<T>(closure: (t: Storage) => Promise<T>): Promise<T>;
}
interface Context {
    storage: Storage;
}
interface Env {
    ROOM_CREATION_ENABLED?: string;
    ROOMS: {
        getByName(name: string): {
            fetch(request: Request): Promise<Response>;
        };
    };
}
type Auth = {
    hash: string;
    player: string;
};
type Stored = {
    schema: 1;
    version: number;
    game: SharedGame | null;
    host: {
        id: string;
        name: string;
        faction: string;
    };
    guestFaction: string;
    mode: 'cooperative' | 'versus';
    seed: number;
    auth: Auth[];
    invite: string;
    receipts: Record<string, {
        player: string;
        payload: string;
        version: number;
    }>;
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
const token = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const errorStatus = (e: unknown) => String(e).includes('FORBIDDEN') ? 403 : String(e).includes('STALE_VERSION') ? 409 : 400;
const validName = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 60;
const validFaction = (v: unknown) => ['mars', 'crystal', 'tide', 'grove'].includes(v as string);
async function body(request: Request) { if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw Error('JSON_REQUIRED'); if (Number(request.headers.get('content-length') || 0) > 20000)
    throw Error('TOO_LARGE'); const reader = request.body?.getReader(); if (!reader)
    throw Error('JSON_REQUIRED'); const chunks: Uint8Array[] = []; let size = 0; while (true) {
    const part = await reader.read();
    if (part.done)
        break;
    size += part.value.byteLength;
    if (size > 20000) {
        await reader.cancel();
        throw Error('TOO_LARGE');
    }
    chunks.push(part.value);
} const all = new Uint8Array(size); let offset = 0; for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
} const raw = new TextDecoder().decode(all); const value = JSON.parse(raw); if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('INVALID_BODY'); return value; }
export function snapshot(s: Stored, player: string) { const game = s.game ? structuredClone(s.game) : null; if (game && game.mode === 'versus') {
    game.seed = 0;
    if (game.battle && game.battle.attacker !== player && game.battle.defender !== player)
        game.battle = null;
    const own = game.players.find(p => p.id === player)!;
    game.log = [];
    const visible = new Set(own.seen);
    game.terrain = game.terrain.map((n, i) => visible.has(i) ? n : 0);
    game.sites = game.sites.filter(s => visible.has(s.id) || s.type === 'base');
    for (const p of game.players.filter(p => p.id !== player)) {
        p.gold = 0;
        p.ore = 0;
        p.crystal = 0;
        p.ap = 0;
        p.seen = [];
        p.buildings = {};
        p.relics = [];
        delete p.equipment;
        p.heroes = (p.heroes || []).filter(h => visible.has(h.pos)).map(h => ({ ...h, equipment: undefined }));
        if (!visible.has(p.pos)) {
            p.pos = -1;
            p.army = [];
        }
    }
} return { schema: s.schema, version: s.version, player, status: game ? 'playing' : 'waiting', game }; }
export default { async fetch(request: Request, env: Env) { const url = new URL(request.url); const local = ['localhost', '127.0.0.1'].includes(url.hostname); if (!local && env.ROOM_CREATION_ENABLED !== 'true')
        return json({ error: 'DEPLOYMENT_NOT_ENABLED' }, 503); if (url.pathname === '/api/rooms' && request.method === 'POST') {
        const id = crypto.randomUUID().replaceAll('-', '');
        const response = await env.ROOMS.getByName(id).fetch(request);
        if (!response.ok)
            return response;
        return json({ ...await response.json() as object, roomId: id }, 201);
    } const match = url.pathname.match(/^\/api\/rooms\/([a-f0-9]{32})(?:\/(join|command|invite|rotate|create))?$/); if (!match)
        return json({ error: 'NOT_FOUND' }, 404); return env.ROOMS.getByName(match[1]).fetch(request); } };
export class KingdomRoom {
    private unknownRequests: number[] = [];
    constructor(private ctx: Context) { }
    private async withinRate(now: number) { return this.ctx.storage.transaction(async (t) => { if (!await t.get<Stored>('room')) {
        this.unknownRequests = this.unknownRequests.filter(ts => ts > now - 60000);
        if (this.unknownRequests.length >= 120)
            return false;
        this.unknownRequests.push(now);
        return true;
    } const key = 'request-window', window = Math.floor(now / 60000), old = await t.get<{
        window: number;
        count: number;
    }>(key), bucket = old?.window === window ? old : { window, count: 0 }; if (bucket.count >= 120)
        return false; bucket.count++; await t.put(key, bucket); return true; }); }
    async fetch(request: Request) {
        try {
            const now = Date.now();
            if (!await this.withinRate(now))
                return json({ error: 'RATE_LIMITED' }, 429);
            const origin = request.headers.get('origin');
            if (origin) {
                const source = new URL(origin), destination = new URL(request.url);
                const local = ['localhost', '127.0.0.1'].includes(source.hostname) && ['localhost', '127.0.0.1'].includes(destination.hostname);
                if (source.origin !== destination.origin && !local)
                    throw Error('FORBIDDEN');
            }
            const url = new URL(request.url);
            if (request.method === 'POST' && (url.pathname === '/api/rooms' || url.pathname.endsWith('/create'))) {
                const b = await body(request);
                if (!validName(b.name) || !validFaction(b.faction) || !validFaction(b.guestFaction) || !['cooperative', 'versus'].includes(b.mode))
                    throw Error('INVALID_SETUP');
                if (b.accessToken !== undefined && !/^[a-f0-9]{64}$/.test(b.accessToken))
                    throw Error('INVALID_TOKEN');
                if (b.inviteToken !== undefined && !/^[a-f0-9]{64}$/.test(b.inviteToken))
                    throw Error('INVALID_TOKEN');
                const access = b.accessToken || token(), invite = b.inviteToken || token(), accessHash = await hash(access), inviteHash = await hash(invite), seed = (['localhost', '127.0.0.1'].includes(url.hostname) && Number.isInteger(b.localTestSeed) && b.localTestSeed >= 0 && b.localTestSeed <= 4294967295) ? b.localTestSeed : crypto.getRandomValues(new Uint32Array(1))[0];
                await this.ctx.storage.transaction(async (t) => { const existing = await t.get<Stored>('room'); if (existing) {
                    if (existing.auth.some(a => a.player === 'p1' && a.hash === accessHash) && existing.host.name === b.name.trim() && existing.host.faction === b.faction && existing.mode === b.mode && existing.guestFaction === b.guestFaction)
                        return;
                    throw Error('ALREADY_EXISTS');
                } await t.put<Stored>('room', { schema: 1, version: 0, game: null, host: { id: 'p1', name: b.name.trim(), faction: b.faction }, guestFaction: b.guestFaction, mode: b.mode, seed, auth: [{ hash: accessHash, player: 'p1' }], invite: inviteHash, receipts: {} }); });
                return json({ accessToken: access, inviteToken: invite, player: 'p1', version: 0, status: 'waiting' }, 201);
            }
            if (request.method === 'POST' && url.pathname.endsWith('/join')) {
                const b = await body(request);
                if (!validName(b.name) || typeof b.inviteToken !== 'string' || b.inviteToken.length !== 64)
                    throw Error('INVALID_JOIN');
                if (b.accessToken !== undefined && !/^[a-f0-9]{64}$/.test(b.accessToken))
                    throw Error('INVALID_TOKEN');
                const inviteHash = await hash(b.inviteToken), access = b.accessToken || token(), accessHash = await hash(access);
                const result = await this.ctx.storage.transaction(async (t) => { const s = await t.get<Stored>('room'); if (!s)
                    throw Error('NOT_FOUND'); if (s.game && s.auth.some(a => a.player === 'p2' && a.hash === accessHash))
                    return snapshot(s, 'p2'); if (s.invite !== inviteHash || s.game)
                    throw Error('FORBIDDEN'); s.game = validateShared(createShared(s.seed, s.mode, [s.host, { id: 'p2', name: b.name.trim(), faction: s.guestFaction }])); s.auth.push({ hash: accessHash, player: 'p2' }); s.invite = ''; s.version++; await t.put('room', s); return snapshot(s, 'p2'); });
                return json({ ...result, accessToken: access }, 201);
            }
            const bearer = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
            if (!bearer)
                throw Error('FORBIDDEN');
            const accessHash = await hash(bearer);
            if (request.method === 'POST' && url.pathname.endsWith('/rotate')) {
                const b = await body(request);
                if (typeof b.nextToken !== 'string' || !/^[a-f0-9]{64}$/.test(b.nextToken))
                    throw Error('INVALID_TOKEN');
                const nextHash = await hash(b.nextToken);
                await this.ctx.storage.transaction(async (t) => { const s = await t.get<Stored>('room'), auth = s?.auth.find(a => a.hash === accessHash); if (!s || !auth)
                    throw Error('FORBIDDEN'); if (s.auth.some(a => a.hash === nextHash && a.player !== auth.player))
                    throw Error('TOKEN_CONFLICT'); auth.hash = nextHash; await t.put('room', s); });
                return json({ rotated: true });
            }
            if (request.method === 'POST' && url.pathname.endsWith('/invite')) {
                const invite = token(), inviteHash = await hash(invite);
                await this.ctx.storage.transaction(async (t) => { const s = await t.get<Stored>('room'), auth = s?.auth.find(a => a.hash === accessHash); if (!s || auth?.player !== 'p1' || s.game)
                    throw Error('FORBIDDEN'); s.invite = inviteHash; await t.put('room', s); });
                return json({ inviteToken: invite });
            }
            if (request.method === 'GET') {
                const s = await this.ctx.storage.get<Stored>('room'), auth = s?.auth.find(a => a.hash === accessHash);
                if (!s || !auth)
                    throw Error('FORBIDDEN');
                return json(snapshot(s, auth.player));
            }
            if (request.method === 'POST' && url.pathname.endsWith('/command')) {
                const b = await body(request);
                if (typeof b.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(b.id) || !Number.isInteger(b.expectedVersion) || !b.action || typeof b.action !== 'object')
                    throw Error('INVALID_COMMAND');
                const payload = JSON.stringify(b.action);
                const result = await this.ctx.storage.transaction(async (t) => { const s = await t.get<Stored>('room'), auth = s?.auth.find(a => a.hash === accessHash); if (!s || !auth || !s.game)
                    throw Error('FORBIDDEN'); const old = s.receipts[b.id]; if (old) {
                    if (old.player !== auth.player || old.payload !== payload)
                        throw Error('ID_CONFLICT');
                    return { ...snapshot(s, auth.player), duplicate: true, appliedVersion: old.version };
                } if (b.expectedVersion !== s.version)
                    throw Error('STALE_VERSION'); if (Object.keys(s.receipts).length >= 5000)
                    throw Error('ROOM_COMMAND_LIMIT'); s.game = validateShared(applyShared(s.game, auth.player, b.action as SharedAction)); s.version++; s.receipts[b.id] = { player: auth.player, payload, version: s.version }; if (new TextEncoder().encode(JSON.stringify(s)).byteLength > 1024 * 1024)
                    throw Error('ROOM_STORAGE_LIMIT'); await t.put('room', s); return snapshot(s, auth.player); });
                return json(result);
            }
            return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'INVALID_REQUEST';
            return json({ error: message }, errorStatus(e));
        }
    }
}
