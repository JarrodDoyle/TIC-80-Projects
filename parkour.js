// title:   climby climberson
// author:  game developer, email, etc.
// desc:    short description
// site:    website link
// license: MIT License
// version: 0.1
// script:  js

// Tile collision flags
// 0 - Block (For things that are solid from all directions)
// 1 - Platform (For things that are only solid from above)
// 2 - Ladder (For things that you can climb)
// 3 - Water?
// 4 - Metal?
// 5 - MaterialIdx?
// 6 - MaterialIdx?
// 7 - Entity (Creates an entity from the entity table with ID=tile_id)

// Player movement states
// 0 - Idle
// 1 - Running
// 2 - Jumping
// 3 - Falling
// 4 - Grabbing
// 5 - Ladder
// 6 - Diving

// TODO:
// - Add weather!
// - Add jump diving
// - QOL stuff
//  - Jump coyote time, and buffering
//  - Grab buffering
//  - Max fall speeds
// - Refactor
//  - Improve commenting
//  - Improve code structure
// - Add interactables (e.g. Signs, Levers)
// - Add camera scrolling, or room transitions (undecided)
// - Plan out a story and map
// - Audio and visual polish
// - Timer/speedrun mode

// Design notes
// - Should ledge grabs be automatic? They'd only trigger when jumping or falling

// Transition to grabbing
function T2G(){
	// Is the grab key pressed
	if(!btnp(4))
		return false;

	// Is there a collision on the side we're facing?
	var h=P.cr.h;
	var x=P.p.x+P.cr.x+(P.fr?P.cr.w:-1);
	var y=P.p.y+P.cr.y;
	if(!CollisionRect(x,y,1,Math.floor(0.75*h),[0]))
		return false;

	// Are we near the top of the thing we're trying to grab?
	if(CollisionXY(x,y-Math.floor(0.5*h),[0]))
		return false;

	// Transition!
	P.ms=4;
	P.v.x=0;
	P.v.y=0;
	return true;
}

// Transition to climbing
function T2C(){
	var x=P.p.x+P.cr.x+Math.floor(P.cr.w*0.25);
	var y=P.p.y+P.cr.y;
	var w=Math.floor(P.cr.w*0.5);
	var h=P.cr.h;

	// Go up
	if(btn(0)&&CollisionRect(x,y,w,h,[2])){
		P.p.y-=1;
		P.ms=5;
	}

	// Go down
	if(btn(1)&&IsGroundedL(P,1)&&CollisionRect(x,y+1,w,h,[2])){
		P.p.y+=1;
		P.ms=5;
	}
}

var W={
	c:13,
	mck:15,
	p:{x:0,y:0},

	// Map animation table - TileID:{FrameCount,FPS,SpriteOffset}
	s:{
		"12":{c:4,f:16,o:1}, // Rain
		"104":{c:2,f:2,o:16}, // Grass
		"120":{c:2,f:3,o:-16}, // GrassR
		"28":{c:4,f:4,o:1}, // WaterSurface
		"31":{c:4,f:3,o:-1}, // WaterSurfaceR
	}
};

var P={
	fr:true, // Facing right
	p:{x:0,y:0,xr:0,yr:0}, // Position
	v:{x:0,y:0,dy:9.8*64}, // Velocity
	cr:{x:2,y:1,w:4,h:7},  // Collision rect
	ms:0,  // Move state (also serves as an index into the sprite table)

	// Sprite table
	st:0,  // Milliseconds into current animation frame
	sii:0, // Frame index
	s:[
		{id:257,c:4,fps:2}, // Idle
		{id:273,c:4,fps:8}, // Running
		{id:257,c:4,fps:2}, // Jumping
		{id:257,c:4,fps:2}, // Falling
		{id:289,c:1,fps:1}, // Grabbing
		{id:305,c:4,fps:8}, // Climbing
	],

	// Jump settings
	jsy:0, // JumpStartY
	jh:8, // JumpHeight
};


function remap(id){
	var at=W.s[String(id)];
	if(at!=null)return id+at.o*(Math.floor(t/(1000/at.f))%at.c);

	return id;
}

function upfr(l,r){
	// Set correct facing
	P.fr=l?false:r?true:P.fr;
}

function UpdatePlayer(){
	// Movement
	var l=btn(2);
	var r=btn(3);
	var u=btn(0);
	var d=btn(1);

	// Update
	switch(P.ms){
		case 0: // Idle
			P.p.xr=0;
			P.p.yr=0;
			P.v.x=0;
			P.v.y=0;
			break;
		case 1: // Running
			upfr(l,r);
			P.v.x=l?-1:r?1:0;
			MoveY(P,[0,1]);
			MoveX(P,[0,1]);
			break;
		case 2: // Jumping
			upfr(l,r);
			P.v.x=l?-1:r?1:0;
			P.v.y=-1;
			MoveY(P,[0]);
			MoveX(P,[0]);
			break;
		case 3: // Falling
			upfr(l,r);
			P.v.x=l?-1:r?1:0;
			P.v.y=(P.v.y/dts+P.v.dy*dts)*dts;
			MoveY(P,[0]);
			MoveX(P,[0]);
			break;
		case 5: // Climbing
			P.v.x=l?-1:r?1:0;
			P.v.y=u?-1:d?1:0;
			MoveY(P,[0]);
			MoveX(P,[0],true);
			break;
	}

	// Transition
	var g=IsGrounded(P);
	var oldMs=P.ms;
	switch(P.ms){
		case 0: // Idle
			if(l||r)P.ms=1;
			if(u){
				P.ms=2;
				P.jsy=P.p.y;
			}
			if(!g)P.ms=3;
			if(d&&IsGroundedL(P,1)){
				P.ms=3;
				P.p.y+=1;
			}
			T2G();
			T2C();
			break;
		case 1: // Running
			if(!l&&!r)P.ms=0;
			if(!g)P.ms=3;
			if(u){
				P.ms=2;
				P.jsy=P.p.y;
			}
			if(d&&IsGroundedL(P,1)){
				P.ms=3;
				P.p.y+=1;
			}
			T2G();
			T2C();
			break;
		case 2: // Jumping
			if(g&&!l&&!r)P.ms=0;
			if(g&&(l||r))P.ms=1;
			if(!u||P.v.y==0||P.p.y<=P.jsy-P.jh)P.ms=3;
			T2G();
			T2C();
			break;
		case 3: // Falling
			if(g&&!l&&!r)P.ms=0;
			if(g&&(l||r))P.ms=1;
			if(P.ms!=3)P.v.y=0;
			T2G();
			T2C();
			break;
		case 4: // Grabbing
			if(btnp(4))P.ms=3;
			if(btnp(0)){
				P.ms=2;
				P.jsy=P.p.y;
			}
			break;
		case 5: // Climbing
			if(btn(4))P.ms=3;

			// Leave the ladder
			var x=P.p.x+P.cr.x+Math.floor(P.cr.w*0.25);
			var y=P.p.y+P.cr.y;
			var w=Math.floor(P.cr.w*0.5);
			var h=P.cr.h;
			var c=CollisionRect(x,y,w,h,[2]);
			if(!c)P.ms=3;
			if(g&&c)P.ms=0;
		
			break;
	}

	// Reset animation state if we changed movestate
	if(P.ms!=oldMs)P.sii=0;
	
	// Render sprite
	var t=P.s[P.ms];
	spr(t.id+P.sii,P.p.x,P.p.y,7,1,P.fr?0:1);

	// Update animation state
	P.st+=dt;
	if(P.st>1000/t.fps){
		P.sii++;
		P.sii%=t.c;
		P.st=0;
	}

	// TODO: Debug log!
	// print("ms: "+P.ms,0,0,12);
	// print("g: "+g,0,8,12);
	// print("p: ("+P.p.x+","+P.p.y+")",0,16,12);
	// print("v: ("+P.v.x+","+P.v.y+","+P.v.dy+")",0,24,12);
	// print("j: ("+P.jsy+","+P.v.y+")",0,32,12);
}

function MoveY(e,fs){
	// Only move when sub-pixel position is >=1 (or <=-1)
	var dy=e.v.y;
	e.p.yr+=dy;
	dy=Math.round(e.p.yr);
	e.p.yr-=dy; // Move yr back into -0.9-0.9 range

	var vy=0;                  // How much have we actually moved
	var abs_dy=Math.abs(dy);   // How far are we trying to move
	var sign_dy=Math.sign(dy); // Which way are we moving
	
	// We just need to check either the row above or below the collision rect
	var y=e.p.y+e.cr.y+(sign_dy<0?-1:e.cr.h);
	while(vy<abs_dy){
		// Corner x positions
		var lx=e.p.x+e.cr.x;
		var rx=lx+e.cr.w-1;

		// Collisions we need
		var lx_c=CollisionXY(lx,y,fs);
		var rx_c=CollisionXY(rx,y,fs);
		var cx_c=CollisionRect(lx+1,y,e.cr.w-2,1,fs);

		// If both corners are blocked or something in the center is blocked
        // We can't just shift x +- 1 so we stop y movement
		if((lx_c&&rx_c)||cx_c){
			e.v.y=0;
			break;
		}

		// Shift left or right 1px is necessary
		if(rx_c&&!CollisionXY(lx-1,y,fs))
			e.p.x--;
		else if (lx_c&&!CollisionXY(rx+1,y,fs))
			e.p.x++;
		
		// Update y position!
		e.p.y+=sign_dy;
		y+=sign_dy;
		vy++;

		// If we're grounded, stop!
		if (IsGrounded(e))break;
	}
}

function MoveX(e,fs,dsy){
	// Only move when sub-pixel position is >=1 (or <=-1)
	var dx=e.v.x;
	e.p.xr+=dx;
	dx=Math.round(e.p.xr);
	e.p.xr-=dx; // Move xr back into -0.9-0.9 range

	var vx=0;                  // How much have we actually moved
	var abs_dx=Math.abs(dx);   // How far are we trying to move
	var sign_dx=Math.sign(dx); // Which way are we moving

	// We just need to check either the row above or below the collision rect
	var x=e.p.x+e.cr.x+(sign_dx<0?-1:e.cr.w);
	while(vx<abs_dx){
		// Corner y positions
		var ty=e.p.y+e.cr.y;
		var by=ty+e.cr.h-1;

		// Collisions we need
		var ty_c=CollisionXY(x,ty,fs);
		var by_c=CollisionXY(x,by,fs);
		var cy_c=CollisionRect(x,ty+1,1,e.cr.h-2,fs);

		// If both corners are blocked or something in the center is blocked
        // We can't just shift y +- 1 so we stop x movement
		if((ty_c&&by_c)||cy_c||(e.v.y!=0&&(ty_c||by_c))){
			e.v.x=0;
			break;
		}

		// Shift up or down 1 px if necessary
		if(!dsy&&e.v.y==0){
			if(!ty_c&&!by_c&&!cy_c){
				if(!CollisionRect(e.p.x+e.cr.x+sign_dx,by+1,e.cr.w,1,fs)) e.p.y++;
			}else if(!ty_c&&!cy_c&&!CollisionXY(x,ty-1,fs)){
				e.p.y--;
			}else{
				e.v.x=0;
				break;
			}
		}

		// Update x position!
		e.p.x+=sign_dx;
		x+=sign_dx;
		vx++;
	}
}

function IsGrounded(e){
	var x=e.p.x+e.cr.x;
	var y=e.p.y+e.cr.y+e.cr.h;
	var w=e.cr.w;
	return CollisionRect(x,y,w,1,[0])||(CollisionRect(x,y,w,1,[1])&&!CollisionRect(x,y-1,w,1,[1]));
}

function IsGroundedL(e,f){
	return CollisionRect(e.p.x+e.cr.x,e.p.y+e.cr.y+e.cr.h,e.cr.w,1,[f]);
}

// Is there a collision at world position (x,y) with a tile that has any flags in fs
function CollisionXY(x,y,fs){
	if(pix(x-W.p.x*8,y-W.p.y*8)==W.c)
		return false;

	var t=mget(Math.floor(x/8),Math.floor(y/8));
	for(var i in fs){
		if(fget(t,fs[i]))
			return true;
	}
	return false;
}

function CollisionRect(x,y,w,h,fs){
	for(var i=x;i<x+w;i++)
	for(var j=y;j<y+h;j++)
		if(CollisionXY(i,j,fs))return true;
	return false;
}

var t=0;
var dt=0;
var dts=0;
function TIC()
{
	dt=time()-t;
	dts=dt/1000;
	t=time();

	cls(W.c);
	map(W.p.x,W.p.y,30,17,0,0,W.mck,1,remap);
	UpdatePlayer();

	var m=mouse();
	if(m[2]){
		P.p.x=m[0];
		P.p.y=m[1];
	}
}

// <TILES>
// 000:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
// 001:ffffffff2aba2aba1122112200110011ff10fffff10fffff10ffffff0fffffff
// 002:ffffffff2aba2aba1122112200110011ffffffffffffffffffffffffffffffff
// 003:ffffffff2aba2aba1122112200110011ffff01fffffff01fffffff01fffffff0
// 004:ffffffff2aba2aba1122112200110011f1ffff1faba22aa22a211121f0ffff0f
// 005:f1ffff1f2aa2aba212112211f0ffff0ff1ffff1faba22aa22a211121f0ffff0f
// 010:c77c676cc7c7777776c7c77c7777c6c76c7c777c7c767c7c76c77c67c7c767c7
// 011:ffffffff7ccc7cc777c7677c7677767767766666666666555565555555555555
// 012:ffffcffffcff6ffff6ff6ffff6ffffffffffffcfffcfff6fff6fff6fff6fffff
// 013:ff6fff6fff6fffffffffcffffcff6ffff6ff6ffff6ffffffffffffcfffcfff6f
// 014:ffffffcfffcfff6fff6fff6fff6fffffffffcffffcff6ffff6ff6ffff6ffffff
// 015:f6ff6ffff6ffffffffffffcfffcfff6fff6fff6fff6fffffffffcffffcff6fff
// 016:fffffffff6cc666fff9889ffffc666fffc6555cffc59856ff658856fff5555ff
// 017:ffffffffffffffffffffffffffcc66fffffbbfffffcaa6ffff6aa6fffff66fff
// 018:fffffffff2aba21f2a222a21122cd220101c6011022221210121122000101100
// 027:5555555555555555555555555555555555555555555555555555555555555555
// 028:ffffffff7ccc7cc777c7677c7677767767766666666666555565555555555555
// 029:ffffffffc77ccc7c7c77c7677776777666677666556666665555655555555555
// 030:ffffffff7cc77ccc677c77c77677767766666776665566665555556555555555
// 031:ffffffffc77ccc7c7c77c7677776777666677666556666665555655555555555
// 032:4343434432343243222322323212222442111123211001144211211323221232
// 033:4343434432343243222322323212212242111111211100004211201123221122
// 034:3434434323234232222232222112221211111111101001101100000021100000
// 035:4434343434324323232223221221122411111123011001120000112300000112
// 036:4343434432343243222322323212212242111111211101003210000021110000
// 037:3434434323234232222232222112221211111111110001100000000000000000
// 038:3434434323234232222232222112221211111111110000100000012100000112
// 039:4434343434324323232223221221122411111123100011142101212322211232
// 040:fffffff3ffffff43fffff332ffff4323fff43211ff323210f432211033221100
// 048:4343434432343243222322323212212242111111211100103210012121110112
// 049:3434434323234232222232222112221211111111101000101100012121100112
// 050:3210000021100000210000001000000000000000101000101100012121100112
// 051:0000001200000123000001120000001100000000101000001100000021100000
// 052:3210000021100000210000001000000000000000000000000000000000000000
// 054:0000001200000123000001120000001100000000000000110000012100000112
// 055:4434343434324323232223221221122411111123001001121100112321100112
// 056:11100000f2201000ff210000fff21000ffff1110fffff211ffffff22fffffff1
// 064:2211001242100123311001122300001132100000421100002111000032100000
// 065:3210001221100123210001121000001100000000000000110000012100000112
// 066:3210001221100123210001121000001100000000101000111100012121100112
// 067:3210000021100000210000001000000000000000101000001100000021100000
// 068:0000000000000000000000000000000000000000000000110000012100000112
// 069:0000000000000000000000000000000000000000101000111100012121100112
// 070:0000012200001123000001140000001200000132101011241100111321100122
// 071:2200012323100114411001323210112222100132211111144211212323221232
// 072:3fffffff34ffffff233fffff2324ffff11234fff111243ff0012324f00012233
// 080:2211000042100000311000002300000032100000421100112111012132100112
// 081:0000001200000123000001120000001100000000101000111100012121100112
// 082:3210012221101123210001141000001200000132101011241100111321100122
// 083:2211000042100000311000002300000032100000421100002111000032100000
// 084:0000001200000123000001120000001100000000000000000000000000000000
// 085:3210001221100123210001121000001100000000000000000000000000000000
// 086:3210012221101123210001141000001200000132000011240000111300000122
// 087:4343434432343243222322323212122442111123211101123210012321100112
// 088:000000110001012f000212ff00111fff0212ffff012fffff12ffffff1fffffff
// 096:2211001242100123311001122300001132100000421100112111012132100112
// 097:3210001221100123210001121000001100000000011000011121011212221221
// 098:3210001221100122210001121000001100000000101000001100000021100000
// 099:3210000021100000210000001000000000000000000000110000012100000112
// 100:0000000000000000000000000000000000000000101000001100000021100000
// 102:0000012200001123000001140000001200000132000011240000111300000122
// 103:2211012242100123311001142300001232100132421101242111011332100122
// 104:ffffffffffffffffffffffffffffffffffffffffffffffff3ff4ff3ff3f3f43f
// 112:2200001223100123411001123211001122100000211101004211201123221122
// 113:3434434323234232222232222112221211111111011000001121011212221221
// 114:3210000021100000210000001000000000000000011000011121011212221221
// 115:0000012300000114000011320000112200000132100011142101212322211232
// 116:2200000023100000411000003211000022100000211101004211201123221122
// 117:0000000000000000000000000000000000000000011000011121011212221221
// 118:0000001200000123000001120000001100000000011000011121011212221221
// 119:3210012321100114210011321000112200000132100011142101212322211232
// 120:fffffffffffffffffffffffffffffffffffffffffffffffff4ff3f3ff3f3ff34
// </TILES>

// <SPRITES>
// 001:77775777775557c7775a07c777aaa7c7778887c777a88aa77a88877777879777
// 002:77775777775557c7775a07c777aaa7c7778887c77aa88aa77788877777879777
// 003:777757777755577c775a077c77aaa7c7778887c777a88aa77a88877777879777
// 004:777757777755577c775a077c77aaa7c7778887c777a88aa777a8877777879777
// 015:7677777776777767767677677776777777777777767767777677677677777776
// 017:77775777775557c7775a07c777aaa7c7778887c777a88aa77a88877777879777
// 018:77775777775557c7775a07c777aaa7c7778887c77aa88aa77788877777879777
// 019:777757777755577c775a077c77aaa7c7778887c777a88aa77a88877777978777
// 020:777757777755577c775a077c77aaa7c7778887c777a88aa777a8877777978777
// 033:7777577777555777775a077777aaa77777888a777788a7777c888777c7787977
// 049:77757777775557777755577777a5ac777788c7a77a8c8a777ac8877777879777
// 050:77757777775557777755577777a5ac77a788c7777a8c8aa777c8877777879777
// 051:77757777775557777755577777a5ac77a788c7777a8c8a7777c88a7777978777
// 052:77757777775557777755577777a5ac777788c7a7aa8c8a7777c8877777978777
// </SPRITES>

// <MAP>
// 000:031717171717171717171717171713171722525262171717171717225232000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 001:76000000c000000000000000000000871135445785008700218600834666000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 002:76008700c000000086000000000082525236850000826217225284004764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 003:76004232c000301272000001110005858364110000478500835437008265000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 004:76008385c000000000000003720074000007720087860000000484004764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 005:76000086c087000000008776000086000000000042627210300537008265000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 006:76878232c142848600825265874232103075010083648600000484004764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 007:06173466b135631717275767172737000007720000077210304737008265000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 008:760083671727850000008600000000000086870086000000000000003566000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 009:760000000000000000825232102020301222525232102020202040304764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 010:760000008600008252434485000000000083575785000000000050000076000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 011:760000001272004757578500000000000000000000000000000050000076000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 012:760000870000000000000000000000000000000000000000000050000076000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 013:760012720000000000000000000000000000002100000000000050000076000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 014:760000000000870000000000008600007520425252840000000050000076000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 015:0432000082525252840086008232c1c176f1355656458486008750000076000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// 016:476717172757575767171717276717171617275757576717171717171777000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// </MAP>

// <WAVES>
// 000:00000000ffffffff00000000ffffffff
// 001:0123456789abcdeffedcba9876543210
// 002:0123456789abcdef0123456789abcdef
// </WAVES>

// <SFX>
// 000:000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000304000000000
// </SFX>

// <TRACKS>
// 000:100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// </TRACKS>

// <FLAGS>
// 000:00202020604000000000000000000000000000000000000000000000000000001010101010101010100000000000000010101010101010101000000000000000101010101010101010000000000000001010101010101010100000000000000010101010101010100000000000000000101010101010101000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
// </FLAGS>

// <PALETTE>
// 000:070505211919523a2a537c44a0b335423c56596faf6bb9b67a2121b33535c19c4deadb74f4f4f494b0c2566c86333c57
// </PALETTE>

