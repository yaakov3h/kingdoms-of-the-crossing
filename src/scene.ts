import Phaser from 'phaser';
import { Game, worldSize } from './engine';
import { art,assetUrl } from './art';
export class KingdomScene extends Phaser.Scene {
    ally = false;
    actorLabel = '◆';
    selectedUnit = '';
    initialView?: {
        x: number;
        y: number;
        zoom: number;
        width?:number;
    };
    state!: Game;
    choose!: (n: number) => void;
    selected: number | null = null;
    route: number[] = [];
    private boardPressed = false;
    group?: Phaser.GameObjects.Container;
    moved = false;
    pinch = 0;
    private lastViewportWidth=0;
    private worldStamp="";
    private markers?:Phaser.GameObjects.Container;
    constructor() { super('kingdom'); }
    preload() {for(const k of ['ore','gold','crystal','ruin','treasure','camp','spring','beacon','mars','crystal-city','grove','tide'])this.load.image('site-'+k,assetUrl('site-'+k)); for(const f of ['mars','crystal','grove','tide'])this.load.image('map-hero-'+f,assetUrl('map-hero-'+f));for(const f of ['mars','crystal','grove','tide'])for(let k=0;k<8;k++)this.load.image('troop-'+f+'-'+k,assetUrl('troop-'+f+'-'+k));for (const k of ['fog','land-meadow','land-forest','land-ridge','land-wetland','meadow', 'forest', 'ridge', 'wetland', 'mine', 'base', 'crystal', 'ruin', 'factory', 'sanctuary', 'gravity', 'hatchery', 'hero-mars', 'hero-crystal', 'hero-tide', 'hero-grove', 'mars', 'mars-scout', 'mars-robot', 'crystal-army', 'tide', 'tide-scout', 'grove', 'grove-scout', 'machine', 'moth', 'manta', 'quartz', 'pyro'])
        this.load.image(k, assetUrl(k)); }
    create() { this.lastViewportWidth=this.scale.width;if(!this.state.battle)this.cameras.main.setZoom(this.initialView?.width===this.scale.width?this.initialView.zoom:this.scale.width>=900?1.6:1);this.input.addPointer(1); this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.moved = false; this.boardPressed = this.onCanvas(p); }); this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (!p.isDown || this.state?.battle)
        return; const a = this.input.pointer1, b = this.input.pointer2; if (a.isDown && b.isDown) {
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (this.pinch)
            this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom * d / this.pinch, .5, 2));
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
    } }); this.input.on('pointerup', () => { this.pinch = 0; }); this.input.on('wheel', (_: unknown, _2: unknown, _3: number, dy: number) => this.zoom(dy > 0 ? -.1 : .1)); this.scale.on('resize', () => {if(this.scale.width>=900&&this.lastViewportWidth<900&&!this.state.battle)this.cameras.main.setZoom(1.6);this.lastViewportWidth=this.scale.width;if (this.state?.battle)
        this.draw();
    else
        this.center(); }); this.draw(); this.time.delayedCall(80, () => { if (this.initialView && !this.state.battle && this.initialView.width===this.scale.width) {
        this.cameras.main.setZoom(this.initialView.zoom);
        this.focus(this.initialView.x,this.initialView.y);
    }
    else
        this.center(); }); }
    private onCanvas(p: Phaser.Input.Pointer) { const event = p.event as PointerEvent | MouseEvent | TouchEvent; const target = event?.target; return target === this.game.canvas; }
    setState(g: Game) { this.state = g; if (this.scene.isActive())
        this.draw(); }
    zoom(d: number) { if (!this.state.battle)
        this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + d, .5, 2)); }
    center() { if (!this.state || this.state.battle)
        return; const w=worldSize(this.state);this.focus((this.state.pos%w)*80+40,Math.floor(this.state.pos/w)*80+40); }
    centerCapital() { if (!this.state || this.state.battle)
        return; this.focus(40,40); }
    private focus(x:number,y:number){const c=this.cameras.main,w=worldSize(this.state)*80,hx=this.scale.width/(2*c.zoom),hy=this.scale.height/(2*c.zoom);c.centerOn(Phaser.Math.Clamp(x,hx,w-hx),Phaser.Math.Clamp(y,hy,w-hy));}
    private landscape(add:(o:Phaser.GameObjects.GameObject)=>void){
        const g=this.state,w=worldSize(g),key='landscape-'+g.seed+'-'+w;
        if(!this.textures.exists(key)){
            const texture=this.textures.createCanvas(key,w*80,w*80)!;const ctx=texture.context;
            const source=(k:number)=>this.textures.get(['land-meadow','land-forest','land-ridge','land-wetland'][k]).getSourceImage() as HTMLImageElement;
            // Broad continuous texture with offset sampling, not one framed picture per cell.
            ctx.fillStyle='#6f8350';ctx.fillRect(0,0,w*80,w*80);
            const meadow=document.createElement('canvas');meadow.width=meadow.height=512;const mp=meadow.getContext('2d')!;mp.drawImage(source(0),0,0,512,512);mp.globalCompositeOperation='destination-in';const fade=mp.createRadialGradient(256,256,150,256,256,256);fade.addColorStop(0,'#fff');fade.addColorStop(1,'#fff0');mp.fillStyle=fade;mp.fillRect(0,0,512,512);
            for(let y=-180;y<w*80;y+=280)for(let x=-180;x<w*80;x+=280){ctx.save();ctx.translate(x+256,y+256);ctx.rotate(((Math.floor(x/280)+Math.floor(y/280))%4)*Math.PI/2);ctx.drawImage(meadow,-256,-256);ctx.restore();}
            const stamps=new Map<number,HTMLCanvasElement>();
            for(let k=1;k<4;k++){
                const c=document.createElement('canvas');c.width=c.height=128;const p=c.getContext('2d')!;
                p.drawImage(source(k),0,0,128,128);p.globalCompositeOperation='destination-in';
                const mask=p.createRadialGradient(64,64,24,64,64,70);mask.addColorStop(0,'#fff');mask.addColorStop(.65,'#fffe');mask.addColorStop(1,'#fff0');p.fillStyle=mask;p.fillRect(0,0,128,128);stamps.set(k,c);
            }
            for(let n=0;n<g.terrain.length;n++){const k=g.terrain[n];if(k){ctx.save();ctx.translate(n%w*80+40,Math.floor(n/w)*80+40);ctx.rotate(((n*17+g.seed)%4)*Math.PI/2);ctx.drawImage(stamps.get(k)!,-64,-64);ctx.restore();}}
            let randomState=(g.seed^0x51ab)>>>0;const rand=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/4294967296);
            const roads=new Set(g.roads||[]),links=new Map<number,number[]>();
            for(const n of roads){const x=n%w;links.set(n,[n-1,n+1,n-w,n+w,n-w-1,n-w+1,n+w-1,n+w+1].filter(to=>roads.has(to)&&Math.abs(to%w-x)<=1&&(Math.abs(to-n)===1||Math.abs(to-n)===w||(!roads.has(n+(to%w>x?1:-1))&&!roads.has(n+(to>n?w:-w))))));}
            const used=new Set<string>(),edge=(a:number,b:number)=>a<b?a+':'+b:b+':'+a,paths:number[][]=[];
            const trace=(start:number,next:number)=>{const chain=[start,next];used.add(edge(start,next));let previous=start,current=next;while(links.get(current)?.length===2){const to=links.get(current)!.find(v=>v!==previous)!;if(used.has(edge(current,to)))break;chain.push(to);used.add(edge(current,to));previous=current;current=to;}paths.push(chain);};
            for(const [n,ns]of links)if(ns.length!==2)for(const to of ns)if(!used.has(edge(n,to)))trace(n,to);
            for(const [n,ns]of links)for(const to of ns)if(!used.has(edge(n,to)))trace(n,to);
            const points=paths.map(path=>path.map(n=>({x:n%w*80+40,y:Math.floor(n/w)*80+40})));
            const roadPath=(ps:{x:number;y:number}[])=>{ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length-1;i++){const a=ps[i],b=ps[i+1];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}ctx.lineTo(ps.at(-1)!.x,ps.at(-1)!.y);};
            ctx.lineCap='round';ctx.lineJoin='round';
            for(const [width,color]of [[14,'#34412f50'],[10,'#8d7954b0'],[7,'#b29a6db0']]as const){ctx.lineWidth=width;ctx.strokeStyle=color;for(const ps of points){roadPath(ps);ctx.stroke();}}
            const stone=(x:number,y:number,size:number)=>{ctx.fillStyle='#1e302c45';ctx.beginPath();ctx.ellipse(x+1,y+size*.6,size*1.2,size*.5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=['#777d6c','#8f927b','#676f65'][Math.floor(rand()*3)];ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x-size*.5,y-size*.8);ctx.lineTo(x+size*.55,y-size*.65);ctx.lineTo(x+size,y+size*.2);ctx.lineTo(x+size*.3,y+size*.6);ctx.lineTo(x-size*.8,y+size*.4);ctx.closePath();ctx.fill();ctx.fillStyle='#c1bd9c80';ctx.beginPath();ctx.moveTo(x-size*.5,y-size*.7);ctx.lineTo(x+size*.5,y-size*.6);ctx.lineTo(x,y);ctx.closePath();ctx.fill();};
            const flower=(x:number,y:number)=>{ctx.strokeStyle='#65834d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+4);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle=rand()>.5?'#d9c990c0':'#cfb0cbb0';for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(x+Math.cos(j*Math.PI/2)*1.4,y+Math.sin(j*Math.PI/2)*1.4,1.2,0,Math.PI*2);ctx.fill();}};
            const smoothPoints=points.map(ps=>{const out=[ps[0]];let last=ps[0];for(let i=1;i<ps.length-1;i++){const a=ps[i],b={x:(a.x+ps[i+1].x)/2,y:(a.y+ps[i+1].y)/2};for(let step=1;step<=12;step++){const t=step/12,u=1-t;out.push({x:u*u*last.x+2*u*t*a.x+t*t*b.x,y:u*u*last.y+2*u*t*a.y+t*t*b.y});}last=b;}out.push(ps.at(-1)!);return out;});
            for(const ps of smoothPoints){for(let i=0;i<ps.length-1;i++){const a=ps[i],b=ps[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);for(let t=0;t<len;t+=3){const q=t/len,x=a.x+dx*q,y=a.y+dy*q,offset=(rand()-.5)*5;ctx.fillStyle=rand()>.5?'#e0cc9a55':'#5c523d55';ctx.fillRect(x-dy/len*offset,y+dx/len*offset,rand()*2+1,1);if(rand()<.1){const side=rand()>.5?1:-1,dist=9+rand()*10,sx=x-dy/len*dist*side,sy=y+dx/len*dist*side;if(rand()>.6)stone(sx,sy,1.4+rand()*1.8);else flower(sx,sy);}}}}
            for(let n=0;n<g.terrain.length;n++){if(roads.has(n)||g.sites.some(s=>s.id===n)||rand()>.1)continue;const k=g.terrain[n];if(k===3)continue;const x=n%w*80+16+rand()*48,y=Math.floor(n/w)*80+16+rand()*48;stone(x,y,k===2?5+rand()*4:3+rand()*3);if(rand()>.55)stone(x+8,y+5,2+rand()*2);}
            texture.refresh();
        }
        add(this.add.image(0,0,key).setOrigin(0));
    }
    draw() {
        if (!this.state)
            return;
        const stamp=this.state.battle?'':JSON.stringify([this.state.seed,this.state.seen,this.state.sites,this.state.rivals.map(r=>[r.pos,r.capital,r.defeated])]);
        if(stamp&&stamp===this.worldStamp&&this.group){this.drawMarkers();return;}
        this.worldStamp=stamp;
        this.group?.destroy(true);
        this.markers=undefined;
        this.group = this.add.container(0, 0);
        const g = this.state, cam = this.cameras.main;
        const add = (x: Phaser.GameObjects.GameObject) => this.group!.add(x);
        if (g.battle) {
            cam.setZoom(1);
            cam.setScroll(0, 0);
            add(this.add.tileSprite(this.scale.width/2,this.scale.height/2,this.scale.width,this.scale.height,'fog'));
            const terrainKey=['land-meadow','land-forest','land-ridge','land-wetland'][g.terrain[g.battle.site]||0];
            add(this.add.image(this.scale.width/2,this.scale.height/2,terrainKey).setDisplaySize(this.scale.width,this.scale.height).setAlpha(.6));
            const z = Math.min((this.scale.width - 20) / 6, (this.scale.height - 20) / 5, 112), ox = (this.scale.width - z * 6) / 2, oy = (this.scale.height - z * 5) / 2;
            for (let n = 0; n < 30; n++) {
                const x = ox + n % 6 * z, y = oy + Math.floor(n / 6) * z;
                const tile = this.add.rectangle(x + z / 2, y + z / 2, z - 2, z - 2, 0x102c35,.3).setStrokeStyle(1,0xd8d8a4,.2).setInteractive();
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
                    add(this.add.image(x + z / 2, y + z * .43, art(u.faction || (u.side === 1 ? 'tide' : g.faction), u.kind)).setDisplaySize(z * .75, z * .84));
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
        const fog=this.add.tileSprite(w*40,w*40,w*80,w*80,'fog');add(fog);
        // Cut known cells from a single fog mask to avoid flat bands and tile seams.
        const mask=this.make.graphics({x:0,y:0});mask.fillStyle(0xffffff);const known=new Set(g.seen);
        for(let y=0;y<w;y++){let start=-1;for(let x=0;x<=w;x++){const unknown=x<w&&!known.has(y*w+x);if(unknown&&start<0)start=x;if(!unknown&&start>=0){mask.fillRect(start*80,y*80,(x-start)*80,80);start=-1;}}}
        fog.setMask(mask.createGeometryMask());add(mask);mask.setVisible(false); 
        for (let n = 0; n < g.terrain.length; n++) {
            const x = n % w * 80, y = Math.floor(n / w) * 80, seen = g.seen.includes(n);
            if (!seen) {
                
                continue;
            }
            const tile = g.rulesRevision===2 ? this.add.rectangle(x+40,y+40,80,80,0xffffff,0).setInteractive() : this.add.image(x + 40, y + 40, ['meadow', 'forest', 'ridge', 'wetland'][g.terrain[n]]).setDisplaySize(80, 80).setInteractive();
            tile.on('pointerup', (p: Phaser.Input.Pointer) => { if (this.boardPressed && !this.moved && this.onCanvas(p))
                this.choose(n); });
            add(tile);
            const site = g.sites.find(s => s.id === n), r = g.rivals.find(r => !r.defeated && (r.capital === n || r.pos === n));
            if (site) {
                const k = site.type === 'gate' || site.type === 'base' ? 'base' : site.type === 'mine' ? 'mine' : ['factory', 'sanctuary', 'gravity', 'hatchery'].includes(site.type) ? ({factory:'site-camp',sanctuary:'site-ruin',gravity:'site-beacon',hatchery:'site-spring'} as Record<string,string>)[site.type]! : site.type === 'cache' ? 'crystal' : 'ruin';
                const fk=site.type==='base'?g.faction:site.type==='gate'?(r?.faction||'mars'):'';const nextKey=fk?'site-'+(fk==='crystal'?'crystal-city':fk):site.type==='mine'?'site-'+(site.resource||'gold'):site.type==='cache'?'site-treasure':['camp','spring','beacon'].includes(site.type)?'site-'+site.type:site.type==='ruin'||site.type==='quest'||site.type==='relic'?'site-ruin':k;add(this.add.image(x + 40, y + 36, nextKey).setDisplaySize(70, 75).setAlpha(site.done && !site.owner ? .5 : 1));
            }
            if (r) {
                if (r.pos === n)
                    add(this.add.image(x + 40, y + 34, 'map-hero-' + r.faction).setDisplaySize(66, 71));
                add(this.add.rectangle(x + 40, y + 70, 76, 18, this.ally ? 0x285a4a : 0x813a2e, .9));
                add(this.add.text(x + 40, y + 70, this.actorLabel, { fontSize: '15px', color: '#ffe1c5' }).setOrigin(.5));
            }

        }
        this.drawMarkers();
    }
    private drawMarkers(){
        this.markers?.destroy(true);this.markers=this.add.container(0,0);this.group!.add(this.markers);
        const g=this.state,w=worldSize(g),add=(o:Phaser.GameObjects.GameObject)=>this.markers!.add(o);
        for(const n of this.route)add(this.add.circle(n%w*80+40,Math.floor(n/w)*80+60,5,0xffe0a0,.9));
        for(const h of g.heroes){const x=h.pos%w*80,y=Math.floor(h.pos/w)*80;if(h.id===g.activeHero){
            add(this.add.image(x+40,y+38,'map-hero-'+g.faction).setDisplaySize(74,79));add(this.add.ellipse(x+40,y+65,58,20,0xeed796,.22).setStrokeStyle(2,0xf1d68b));
        }else{add(this.add.image(x+40,y+38,'map-hero-'+g.faction).setDisplaySize(66,71));add(this.add.rectangle(x+40,y+70,72,16,0x234f58,.95));add(this.add.text(x+40,y+70,'+',{fontSize:'14px',color:'#b8f1f0'}).setOrigin(.5));}}
    }
}
