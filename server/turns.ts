/** Pure turn transaction kernel. Not deployed, not yet connected to paired rules. */
export type Room<T> = {
    schema: 1;
    version: number;
    players: string[];
    turn: string;
    state: T;
    receipts: Record<string, {
        actor: string;
        version: number;
        command: string;
    }>;
};
export type Command = {
    id: string;
    expectedVersion: number;
    actor: string;
    action: unknown;
};
export function transition<T>(room: Room<T>, command: Command, apply: (state: T, action: unknown, actor: string) => T): Room<T> {
    if (!room.players.includes(command.actor))
        throw Error('FORBIDDEN');
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(command.id))
        throw Error('INVALID_ID');
    const payload = JSON.stringify(command.action);
    if (payload.length > 16384)
        throw Error('TOO_LARGE');
    const receipt = room.receipts[command.id];
    if (receipt) {
        if (receipt.actor !== command.actor || receipt.command !== payload)
            throw Error('ID_CONFLICT');
        return structuredClone(room);
    }
    if (command.expectedVersion !== room.version)
        throw Error('STALE_VERSION');
    if (command.actor !== room.turn)
        throw Error('NOT_YOUR_TURN');
    const next = structuredClone(room);
    next.state = apply(next.state, command.action, command.actor);
    next.version++;
    next.receipts[command.id] = { actor: command.actor, version: next.version, command: payload };
    return next;
}
export function finishTurn<T>(room: Room<T>, actor: string) { if (room.turn !== actor)
    throw Error('NOT_YOUR_TURN'); const n = structuredClone(room); n.turn = n.players[(n.players.indexOf(actor) + 1) % n.players.length]; return n; }
