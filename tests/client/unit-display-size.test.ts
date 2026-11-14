import { expect, it } from 'vitest';
import { unitDisplaySize } from '../../src/client/render/unit-visual-footprint';

it('keeps wide squad sprites inside one projected tile instead of covering neighbouring pieces',()=>{
  const size=unitDisplaySize(512,512,80,[{x:0,y:0},{x:40,y:0},{x:42,y:25},{x:-2,y:25}]);
  expect(size.width).toBeLessThanOrEqual(40);
  expect(size.height).toBe(size.width);
});
it('preserves the natural aspect ratio for tall Victoria animation frames',()=>{
  const size=unitDisplaySize(256,512,80,[{x:0,y:0},{x:40,y:0},{x:42,y:25},{x:-2,y:25}]);
  expect(size.width/size.height).toBe(.5);
  expect(size.height).toBeLessThanOrEqual(43);
});

it('scales the live selection ring to a phone tile instead of a fixed desktop ellipse',async()=>{
 const {createBattlefieldSceneClass}=await import('../../src/client/phaser/phaser-scene');
 class Base{scale={width:915,height:360};constructor(_config?:unknown){}}
 const Scene=createBattlefieldSceneClass(Base);const scene=new Scene() as any;
 let ring:any;
 scene.add={ellipse(_x:number,_y:number,width:number,height:number){
  ring={width,height,setStrokeStyle(){return this;},setPosition(){return this;},setDepth(){return this;},setVisible(){return this;},setDisplaySize(w:number,h:number){this.width=w;this.height=h;return this;}};return ring;
 }};
 scene.refreshSelection({selection:{unitId:'victoria-queen',x:100,y:100,depth:50}});
 expect(ring.width).toBeLessThan(40);expect(ring.height).toBeLessThan(25);
});
