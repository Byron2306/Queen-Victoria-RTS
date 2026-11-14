import {expect,it} from 'vitest';
import {createRoyalBattlefieldSceneClass} from '../../src/client/phaser/royal-battlefield-scene';
import {createResponsiveBattlefieldLayout} from '../../src/client/render/responsive-battlefield';
import {tileCenter} from '../../src/client/board/projection';
import {createSelectionGeometryOverlay} from '../../src/client/render/selection-geometry-overlay';

it('lets a selected unit move to an adjacent empty tile inside its generous touch radius',()=>{
 class Base {scale={width:1600,height:900};constructor(_config?:unknown){}}
 const Scene=createRoyalBattlefieldSceneClass(Base);const scene=new Scene() as any;
 scene.selectedUnitId='victoria-queen';
 for(const key of ['refreshHudText','refreshRoyalGuidance','redrawRoyalMoveMarkers','refreshStrategicControls','selectUnit'])scene[key]=()=>{};
 const layout=createResponsiveBattlefieldLayout(1600,900);
 const origin=tileCenter({x:6,y:16},layout.projection,'triptych-v2');
 scene.unitSprites.set('victoria-queen',origin);
 scene.currentSelectionOverlay=createSelectionGeometryOverlay(scene.controller.world,'victoria-queen',layout.projection);
 scene.handleBoardPointer(tileCenter({x:5,y:16},layout.projection,'triptych-v2'));
 expect(scene.controller.runtime.commands.peekTactical()).toMatchObject([{kind:'move',destination:{x:5,y:16}}]);
});
