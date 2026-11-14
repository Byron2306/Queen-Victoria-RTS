import { expect, it } from 'vitest';
import { applyBattlefieldHudLayout, battlefieldHudLayout } from '../../src/client/hud/responsive-layout';

class Item {
  x=0; y=0; displayWidth=0; displayHeight=0; visible=true; font=20;
  constructor(public text='') { this.measure(); }
  measure(){this.displayWidth=this.text.length*this.font*0.63+8;this.displayHeight=this.font*1.2+4;}
  setPosition(x:number,y:number){this.x=x;this.y=y;return this;}
  setFontSize(n:number){this.font=n;this.measure();return this;}
  setScale(){return this;}
  setOrigin(){return this;}
  setPadding(){return this;}
  setDepth(){return this;}
  setVisible(v:boolean){this.visible=v;return this;}
  setDisplaySize(w:number,h:number){this.displayWidth=w;this.displayHeight=h;return this;}
}

for(const [width,height] of [[915,360],[915,412],[1638,508],[1600,900]] as const) {
  it(`keeps HUD text and controls separate at ${width}x${height}`,()=>{
    const labels={zoomIn:'+',zoomOut:'−',deployLabel:'RECRUIT',pawnCost:'20',knightCost:'40',bishopCost:'45',rookCost:'60',crown:'CROWN 1200',nodes:'NODES 8/8',command:'ARMY 24/24',royalCommands:'ORDERS 4/4',round:'ROUND 999',phase:'YOUR TURN',pendingOrders:'4 ORDERS QUEUED',victoriaName:'VICTORIA',victoriaHealth:'180/180',enemyName:'SHADOW KING',enemyHealth:'300/300',cancelLast:'UNDO',commitOrders:'COMMIT ORDERS',selectedName:'VICTORIA · QUEEN',selectedHealth:'HP 180/180',turnBanner:'YOUR TURN'};
    const hudText=Object.fromEntries(Object.entries(labels).map(([key,label])=>[key,new Item(label)]));
    const scene={scale:{width,height},hudText,hudRegions:{},hudArtwork:{},add:{rectangle:()=>new Item()}};
    applyBattlefieldHudLayout(scene);
    const visible=Object.entries(hudText).filter(([,t])=>t.visible);
    for(const [key,t] of visible){
      expect(t.x-t.displayWidth/2,key).toBeGreaterThanOrEqual(0);
      expect(t.x+t.displayWidth/2,key).toBeLessThanOrEqual(width);
      expect(t.y-t.displayHeight/2,key).toBeGreaterThanOrEqual(0);
      expect(t.y+t.displayHeight/2,key).toBeLessThanOrEqual(height);
    }
    for(let a=0;a<visible.length;a++)for(let b=a+1;b<visible.length;b++){
      const [ak,A]=visible[a]!,[bk,B]=visible[b]!;
      const overlaps=Math.abs(A.x-B.x)<(A.displayWidth+B.displayWidth)/2 && Math.abs(A.y-B.y)<(A.displayHeight+B.displayHeight)/2;
      expect(overlaps,`${ak} overlaps ${bk}`).toBe(false);
    }
    const layout=battlefieldHudLayout(width,height);
    expect(layout.commit.height).toBeGreaterThanOrEqual(40);
    expect(layout.guide.y+layout.guide.height).toBeLessThanOrEqual(layout.commit.y);
  });
}

it('reflows the live Royal scene and guidance into the same non-overlapping command deck after resize', async()=>{
  const { createRoyalBattlefieldSceneClass }=await import('../../src/client/phaser/royal-battlefield-scene');
  class Base { scale={width:915,height:360}; constructor(_config?:unknown){} }
  const Scene=createRoyalBattlefieldSceneClass(Base);
  const scene=new Scene() as any;
  scene.hudText={commitOrders:new Item('COMMIT ORDERS'),cancelLast:new Item('UNDO')};
  scene.royalGuideInstruction=new Item('TAP A CRIMSON TILE');
  scene.royalGuideDetail=new Item('Choose a legal destination.');
  scene.layoutHud();
  const layout=battlefieldHudLayout(915,360);
  expect(scene.hudText.commitOrders.y).toBe(layout.commit.y+20);
  expect(scene.royalGuideInstruction.y+scene.royalGuideInstruction.displayHeight/2)
    .toBeLessThan(scene.hudText.commitOrders.y-scene.hudText.commitOrders.displayHeight/2);
  scene.scale={width:1638,height:508};
  scene.layoutHud();
  expect(scene.hudText.commitOrders.x).toBeGreaterThan(819);
});

it('opens short landscape views with Victoria reachable between the HUD bands',async()=>{
  const {tileCenter}=await import('../../src/client/board/projection');
  const {createResponsiveBattlefieldLayout}=await import('../../src/client/render/responsive-battlefield');
  const layout=createResponsiveBattlefieldLayout(915,360);
  const queen=tileCenter({x:6,y:16},layout.projection,'triptych-v2');
  expect(queen.y).toBeGreaterThan(layout.board.y+30);
  expect(queen.y).toBeLessThan(layout.hud.y-30);
});

it('keeps all four recruitment touch zones inside the footer after creation and resize',async()=>{
 const {createRoyalBattlefieldSceneClass}=await import('../../src/client/phaser/royal-battlefield-scene');
 class Base{scale={width:915,height:360};constructor(_config?:unknown){}}
 const Scene=createRoyalBattlefieldSceneClass(Base);const scene=new Scene() as any;
 scene.add={zone:()=>Object.assign(new Item(),{setInteractive(){return this;},on(){return this;}})};
 scene.hudRegions.deployUnits=new Item();
 scene.hudRegions.deployUnits.displayWidth=634;scene.hudRegions.deployUnits.displayHeight=523;
 scene.wireStrategicControls();
 applyBattlefieldHudLayout(scene);
 expect(scene.recruitTouchZones).toHaveLength(4);
 for(const zone of scene.recruitTouchZones){
  expect(zone.y-zone.displayHeight/2).toBeGreaterThanOrEqual(battlefieldHudLayout(915,360).bottom.y);
  expect(zone.y+zone.displayHeight/2).toBeLessThanOrEqual(360);
  expect(zone.x-zone.displayWidth/2).toBeGreaterThan(700);
 }
 scene.scale={width:1638,height:508};applyBattlefieldHudLayout(scene);
 expect(scene.recruitTouchZones[0].x).toBeGreaterThan(1300);
});
