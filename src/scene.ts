import Phaser from 'phaser';
import { Game, worldSize } from './engine';
import { art } from './art';
export class KingdomScene extends Phaser.Scene {
    ally = false;
    actorLabel = '◆';
    selectedUnit = '';
    initialView?: {
        x: number;
        y: number;
        zoom: number;
    };
    state!: Game;
    choose!: (n: number) => void;
    selected: number | null = null;
    route: number[] = [];
    private boardPressed = false;
    group?: Phaser.GameObjects.Container;
    moved = false;
    pinch = 0;
    constructor() { super('kingdom'); }
    preload() { for(const f of ['mars','crystal','grove','tide'])this.load.image('map-hero-'+f,'/art/map-hero-'+f+'.webp');for(const f of ['mars','crystal','grove','tide'])for(let k=0;k<8;k++)this.load.image('troop-'+f+'-'+k,'/art/troop-'+f+'-'+k+'.webp');for (const k of ['land-meadow','land-forest','land-ridge','land-wetland','meadow', 'forest', 'ridge', 'wetland', 'mine', 'base', 'crystal', 'ruin', 'factory', 'sanctuary', 'gravity', 'hatchery', 'hero-mars', 'hero-crystal', 'hero-tide', 'hero-grove', 'mars', 'mars-scout', 'mars-robot', 'crystal-army', 'tide', 'tide-scout', 'grove', 'grove-scout', 'machine', 'moth', 'manta', 'quartz', 'pyro'])
        this.load.image(k, '/art/' + k + '.webp'); }
    create() { this.input.addPointer(1); this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.moved = false; this.boardPressed = this.onCanvas(p); }); this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (!p.isDown || this.state?.battle)
        return; const a = this.input.pointer1, b = this.input.pointer2; if (a.isDown && b.isDown) {
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.pinch)
            this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * d / this.pinch, .4, 1.6));
        this.pinch = d;
        this.moved = true;
    }
    else {
        this.pinch = 0;
        const dx = p.x - p.prevPosition.x, dy = p.y - p.prevPosition.y;
        if (Math.abs(dx) + Math.abs(dy) > 2)
            this.moved = true;
        this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
        this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
    } }); this.input.on('pointerup', () => { this.pinch = 0; }); this.input.on('wheel', (_: unknown, _2: unknown, _3: number, dy: number) => this.zoom(dy > 0 ? -.1 : .1)); this.scale.on('resize', () => { if (this.state?.battle)
        this.draw();
    else
        this.center(); }); this.draw(); this.time.delayedCall(80, () => { if (this.initialView && !this.state.battle) {
        this.cameras.main.setZoom(this.initialView.zoom);
        const c=this.cameras.main;c.setScroll(Math.max(0,this.initialView.x-this.scale.width/(2*c.zoom)),Math.max(0,this.initialView.y-this.scale.height/(2*c.zoom)));
    }
    else
        this.center(); }); }
    private onCanvas(p: Phaser.Input.Pointer) { const event = p.event as PointerEvent | MouseEvent | TouchEvent; const target = event?.target; return target === this.game.canvas; }
    setState(g: Game) { this.state = g; if (this.scene.isActive())
        this.draw(); }
    zoom(d: number) { if (!this.state.battle)
        this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + d, .4, 1.6)); }
    center() { if (!this.state || this.state.battle)
        return; const w = worldSize(this.state),c=this.cameras.main;c.setScroll(Math.max(0,(this.state.pos%w)*80+40-this.scale.width/(2*c.zoom)),Math.max(0,Math.floor(this.state.pos/w)*80+40-this.scale.height/(2*c.zoom))); }
    private landscape(add:(o:Phaser.GameObjects.GameObject)=>void){
        const g=this.state,w=worldSize(g),key='landscape-'+g.seed+'-'+w;
        if(!this.textures.exists(key)){
            const texture=this.textures.createCanvas(key,w*80,w*80)!;const ctx=texture.context;
            const source=(k:number)=>this.textures.get(['land-meadow','land-forest','land-ridge','land-wetland'][k]).getSourceImage() as HTMLImageElement;
            // Broad continuous texture with offset sampling, not one framed picture per cell.
            for(let y=0;y<w*80;y+=384)for(let x=0;x<w*80;x+=384)ctx.drawImage(source(0),x,y,384,384);
            const stamps=new Map<number,HTMLCanvasElement>();
            for(let k=1;k<4;k++){
                const c=document.createElement('canvas');c.width=c.height=128;const p=c.getContext('2d')!;
                p.drawImage(source(k),0,0,128,128);p.globalCompositeOperation='destination-in';
                const mask=p.createRadialGradient(64,64,24,64,64,70);mask.addColorStop(0,'#fff');mask.addColorStop(.65,'#fffe');mask.addColorStop(1,'#fff0');p.fillStyle=mask;p.fillRect(0,0,128,128);stamps.set(k,c);
            }
            for(let n=0;n<g.terrain.length;n++){const k=g.terrain[n];if(k)ctx.drawImage(stamps.get(k)!,n%w*80-24,Math.floor(n/w)*80-24);}
            ctx.lineCap='round';ctx.lineJoin='round';const roads=new Set(g.roads||[]);
            for(const width of[13,8]){ctx.strokeStyle=width===13?'#55533d99':'#c5ae78bb';ctx.lineWidth=width;
                for(const n of roads){const x=n%w,y=Math.floor(n/w);for(const to of[n+1,n+w,n+w+1])if(roads.has(to)&&Math.abs(to%w-x)<=1){ctx.beginPath();ctx.moveTo(x*80+40,y*80+40);ctx.lineTo(to%w*80+40,Math.floor(to/w)*80+40);ctx.stroke();}}
            }
            texture.refresh();
        }
        add(this.add.image(0,0,key).setOrigin(0));
    }
    draw() {
        if (!this.state)
            return;
        this.group?.destroy(true);
        this.group = this.add.container(0, 0);
        const g = this.state, cam = this.cameras.main;
        const add = (x: Phaser.GameObjects.GameObject) => this.group!.add(x);
        if (g.battle) {
            cam.setZoom(1);
            cam.setScroll(0, 0);
            const z = Math.min((this.scale.width - 20) / 6, (this.scale.height - 20) / 5, 100), ox = (this.scale.width - z * 6) / 2, oy = (this.scale.height - z * 5) / 2;
            for (let n = 0; n < 30; n++) {
                const x = ox + n % 6 * z, y = oy + Math.floor(n / 6) * z;
                const tile = this.add.rectangle(x + z / 2, y + z / 2, z - 2, z - 2, (n + Math.floor(n / 6)) % 2 ? 0x1c3946 : 0x234754).setStrokeStyle(1, 0x56717a).setInteractive();
                tile.on('pointerup', (p: Phaser.Input.Pointer) => { if (this.boardPressed && this.onCanvas(p))
                    this.choose(n); });
                add(tile);
                const chosen = g.battle.units.find(u => u.id === this.selectedUnit && u.hp > 0);
                if (chosen) {
                    const reach = Math.abs(n % 6 - chosen.pos % 6) + Math.abs(Math.floor(n / 6) - Math.floor(chosen.pos / 6));
                    if (reach <= chosen.range)
                        add(this.add.rectangle(x + z / 2, y + z / 2, z - 3, z - 3, 0x68b4d4, .19));
                }
                const u = g.battle.units.find(u => u.hp > 0 && u.pos === n);
                if (u) {
                    add(this.add.rectangle(x + z / 2, y + z / 2, z - 4, z - 4, u.side ? 0x7e211c : 0x206e71, .4).setStrokeStyle(u.id === this.selectedUnit ? 3 : 1, u.id === this.selectedUnit ? 0xffdf80 : u.side ? 0xff8f79 : 0x6fe2e0));
                    add(this.add.image(x + z / 2, y + z * .43, art(u.faction || (u.side === 1 ? 'tide' : g.faction), u.kind)).setDisplaySize(z * .9, z * .9));
                    add(this.add.rectangle(x + z / 2, y + z - 9, z - 4, 18, u.side ? 0x692d23 : 0x153e3a, .9));
                    add(this.add.text(x + z / 2, y + z - 9, (u.side ? '◆ ' : '') + u.hp + '/' + u.max, { fontSize: Math.max(10, Math.min(14, z * .2)) + 'px', color: '#fff3cc' }).setOrigin(.5));
                    add(this.add.rectangle(x + 3, y + z - 2, (z - 6) * u.hp / u.max, 3, u.side ? 0xf6a28c : 0x9be0c5).setOrigin(0, .5));
                }
            }
            return;
        }
        const w = worldSize(g);
        cam.setBounds(0, 0, w * 80, w * 80);
        if(g.rulesRevision===2)this.landscape(add); 
        for (let n = 0; n < g.terrain.length; n++) {
            const x = n % w * 80, y = Math.floor(n / w) * 80, seen = g.seen.includes(n);
            if (!seen) {
                const tile = this.add.rectangle(x + 40, y + 40, 82, 82, 0x0c222b);
                
                add(tile);
                continue;
            }
            const tile = g.rulesRevision===2 ? this.add.rectangle(x+40,y+40,80,80,0xffffff,0).setInteractive() : this.add.image(x + 40, y + 40, ['meadow', 'forest', 'ridge', 'wetland'][g.terrain[n]]).setDisplaySize(80, 80).setInteractive();
            tile.on('pointerup', (p: Phaser.Input.Pointer) => { if (this.boardPressed && !this.moved && this.onCanvas(p))
                this.choose(n); });
            add(tile);
            const site = g.sites.find(s => s.id === n), r = g.rivals.find(r => !r.defeated && (r.capital === n || r.pos === n));
            if (site) {
                const k = site.type === 'gate' || site.type === 'base' ? 'base' : site.type === 'mine' ? 'mine' : ['factory', 'sanctuary', 'gravity', 'hatchery'].includes(site.type) ? site.type : site.type === 'cache' ? 'crystal' : 'ruin';
                add(this.add.image(x + 40, y + 36, k).setDisplaySize(65, 65).setAlpha(site.done && !site.owner ? .5 : 1));
            }
            if (r) {
                if (r.pos === n)
                    add(this.add.image(x + 40, y + 34, 'map-hero-' + r.faction).setDisplaySize(66, 71));
                add(this.add.rectangle(x + 40, y + 70, 76, 18, this.ally ? 0x285a4a : 0x813a2e, .9));
                add(this.add.text(x + 40, y + 70, this.actorLabel, { fontSize: '15px', color: '#ffe1c5' }).setOrigin(.5));
            }
            if (g.heroes.some(h => h.id !== g.activeHero && h.pos === n)) {
                add(this.add.image(x + 40, y + 38, 'map-hero-' + g.faction).setDisplaySize(66, 71));
                add(this.add.rectangle(x + 40, y + 70, 72, 16, 0x234f58, .95));
                add(this.add.text(x + 40, y + 70, '+', { fontSize: '14px', color: '#b8f1f0' }).setOrigin(.5));
            }
            if(this.route.includes(n)) { add(this.add.circle(x+40,y+60,5,0xffe0a0,.9)); }
            if (n === g.pos) {
                add(this.add.image(x + 40, y + 38, 'map-hero-' + g.faction).setDisplaySize(74, 79));
                add(this.add.ellipse(x+40,y+65,58,20,0xeed796,.22).setStrokeStyle(2,0xf1d68b));
            }
        }
    }
}
