import { createResponsiveBattlefieldLayout, type Rect } from '../render/responsive-battlefield';

export function battlefieldHudLayout(width: number, height: number) {
  const field = createResponsiveBattlefieldLayout(width, height);
  const side = Math.min(240, Math.max(140, width * .22));
  const gap = 12;
  const middle = { x: side + gap, width: width - 2 * side - 2 * gap };
  const bottom = field.hud.y;
  const tall = field.hud.height >= 145;
  const commandY = bottom + (tall ? 54 : 24);
  const buttonWidth = Math.min(164, (middle.width - 12) / 2);
  const rowWidth = buttonWidth * 2 + 12;
  return {
    field,
    side,
    middle,
    top: { x: 0, y: 0, width, height: field.board.y },
    bottom: field.hud,
    guide: { x: middle.x, y: bottom + 1, width: middle.width, height: tall ? 24 : 20 },
    detail: { x: middle.x, y: bottom + 25, width: middle.width, height: 22 },
    showDetail: tall,
    undo: { x: width / 2 - rowWidth / 2, y: commandY, width: buttonWidth, height: 40 },
    commit: { x: width / 2 - rowWidth / 2 + buttonWidth + 12, y: commandY, width: buttonWidth, height: 40 },
    ability: { x: middle.x, y: commandY + 46, width: middle.width, height: 36 },
    selected: { x: 8, y: bottom + 10, width: side - 16, height: field.hud.height - 20 },
    deploy: { x: width - side + 8, y: bottom + 10, width: side - 16, height: field.hud.height - 20 },
  };
}

export function fitHudText(item: any, box: Rect, fontSize = 13): void {
  if (!item) return;
  item.setVisible?.(true);
  item.setOrigin?.(.5);
  item.setPadding?.(4, 2, 4, 2);
  item.setScale?.(1);
  item.setFixedSize?.(0, 0);
  item.setStroke?.('#1a0d08', 1);
  item.setFontSize?.(fontSize);
  const measured = Number(item.width ?? item.displayWidth) || 1;
  if (measured > box.width - 4) {
    item.setFontSize?.(Math.max(9, Math.floor(fontSize * (box.width - 8) / measured)));
  }
  item.setPosition?.(box.x + box.width / 2, box.y + box.height / 2);
  item.setDepth?.(200020);
}

function art(item: any, box: Rect, visible = true): void {
  item?.setVisible?.(visible);
  if (!visible) return;
  item?.setPosition?.(box.x + box.width / 2, box.y + box.height / 2);
  item?.setDisplaySize?.(box.width, box.height);
  item?.setDepth?.(200010);
}

/** One layout owner for base HUD and Royal guidance, reapplied after resize/text changes. */
export function applyBattlefieldHudLayout(scene: any): void {
  const width = Number(scene.scale?.width) || 1600;
  const height = Number(scene.scale?.height) || 900;
  const L = battlefieldHudLayout(width, height);
  const T = scene.hudText ?? {};
  const R = scene.hudRegions ?? {};
  const A = scene.hudArtwork ?? {};
  const key = JSON.stringify([width, height, Object.values(T).map((item: any) => item.text),
    !!scene.recruitTouchZones, !!scene.royalGuideInstruction, scene.royalGuideInstruction?.text, scene.royalGuideDetail?.text]);
  if (scene.hudLayoutKey === key) return;
  scene.hudLayoutKey = key;
  if (!scene.hudBackdrops && scene.add?.rectangle) {
    scene.hudBackdrops = [L.top, L.bottom, L.deploy].map(box => scene.add.rectangle(
      box.x + box.width/2, box.y + box.height/2, box.width, box.height, 0x120f19, .97,
    ).setDepth?.(200000));
  }
  scene.hudBackdrops?.forEach((item: any, index: number) => {
    art(item, [L.top,L.bottom,L.deploy][index]!);
    item?.setDepth?.(200000);
  });
  // Artwork containing baked sample statistics is never a source of live HUD truth.
  for (const key of ['topStatus', 'selectedUnit', 'abilities', 'deployUnits']) art(R[key], L.top, false);
  art(R.victoriaStatus, {x: 12, y: 14, width: 36, height: 36});
  art(R.enemyStatus, {x: width - 48, y: 14, width: 36, height: 36});
  fitHudText(T.deployLabel,{x:L.deploy.x,y:L.deploy.y,width:L.deploy.width,height:18},11);
  const topTextWidth = L.side - 60;
  fitHudText(T.victoriaName, {x:52,y:12,width:topTextWidth,height:20}, 14);
  fitHudText(T.victoriaHealth, {x:52,y:34,width:topTextWidth,height:20}, 14);
  fitHudText(T.enemyName, {x:width-L.side+8,y:12,width:topTextWidth,height:20}, 14);
  fitHudText(T.enemyHealth, {x:width-L.side+8,y:34,width:topTextWidth,height:20}, 14);
  const col = L.middle.width/2;
  for (const [key, column, row] of [
    ['crown',0,0],['nodes',1,0],['command',0,1],['royalCommands',1,1],
  ] as const) fitHudText(T[key],{x:L.middle.x+column*col+2,y:4+row*20,width:col-4,height:20},12);
  fitHudText(T.phase,{x:L.middle.x,y:45,width:L.middle.width*.54,height:20},11);
  fitHudText(T.pendingOrders,{x:L.middle.x+L.middle.width*.54,y:45,width:L.middle.width*.46,height:20},11);
  T.round?.setVisible?.(false);
  T.turnBanner?.setVisible?.(false);
  fitHudText(T.cancelLast,L.undo,14);
  fitHudText(T.commitOrders,L.commit,14);
  T.cancelLast?.setPadding?.(4,10,4,10);
  T.commitOrders?.setPadding?.(4,10,4,10);
  T.cancelLast?.setFixedSize?.(L.undo.width,L.undo.height);
  T.commitOrders?.setFixedSize?.(L.commit.width,L.commit.height);
  fitHudText(T.selectedName,{x:L.selected.x,y:L.selected.y+8,width:L.selected.width,height:22},13);
  fitHudText(T.selectedHealth,{x:L.selected.x,y:L.selected.y+34,width:L.selected.width,height:20},12);
  fitHudText(T.zoomOut, {x:L.selected.x+L.selected.width/2-46,y:L.bottom.y+66,width:40,height:40},20);
  fitHudText(T.zoomIn, {x:L.selected.x+L.selected.width/2+6,y:L.bottom.y+66,width:40,height:40},20);
  T.zoomOut?.setPadding?.(4,6,4,6);
  T.zoomIn?.setPadding?.(4,6,4,6);
  T.zoomOut?.setFixedSize?.(40,40);
  T.zoomIn?.setFixedSize?.(40,40);
  const icons=[A.royalDecree,A.holdTheCrown,A.sovereignLine,A.imperialGambit];
  const size=36, spacing=Math.min(56,L.ability.width/4);
  icons.forEach((item,index)=>art(item,{x:width/2+(index-1.5)*spacing-size/2,y:L.ability.y,width:size,height:size}));
  const recruits=[A.pawn,A.knight,A.bishop,A.rook];
  const recruitSize=Math.min(36,(L.deploy.width-20)/4);
  recruits.forEach((item,index)=>art(item,{x:L.deploy.x+10+index*(L.deploy.width-20)/4,y:L.deploy.y+L.deploy.height*.35,width:recruitSize,height:recruitSize}));
  ['pawn','knight','bishop','rook'].forEach((kind,index)=>fitHudText(T[`${kind}Cost`],{
    x:L.deploy.x+index*L.deploy.width/4,y:L.deploy.y+L.deploy.height-17,width:L.deploy.width/4,height:16,
  },10));
  scene.recruitTouchZones?.forEach((zone: any,index: number)=>{
    art(zone,{x:L.deploy.x+index*L.deploy.width/4,y:L.deploy.y+18,width:L.deploy.width/4,height:L.deploy.height-18});
    zone?.setDepth?.(200030);
  });
  scene.royalGuideHeadline?.setVisible?.(false);
  fitHudText(scene.royalGuideInstruction,L.guide,13);
  fitHudText(scene.royalGuideDetail,L.detail,11);
  scene.royalGuideDetail?.setVisible?.(L.showDetail);
}
