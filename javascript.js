
// ==================== VARIABLES ====================

// Game Settings
var _AUTO_RELOADING = true;
var _BLOOD_INTENSITY = 1;
var _ZOMBIE_HANDS = true;

// Constants
const PLAYER_HEALTH = 100;
const PLAYER_SPEED = 1;
const PLAYER_SPEED_DIAG = PLAYER_SPEED * 0.707;
const PLAYER_SIZE = 10;
const PLAYER_HAND_SIZE = 4;
const PLAYER_DRAG = 0.925;
const PLAYER_INVUNRABLE_TIME = 5;
const PLAYER_STARTING_GUN = 0;
const WALK_SPACE = 50;
const WALK_INACCURACY = 0.75;

const BULLET_SPEED = 6;
const BULLET_SIZE = 5;
const MUZZLE_LIFETIMEMAX = 10;
const MUZZLE_LIFETIMEMIN = 5;

const ZOMBIE_HEALTH = 5;
const ZOMBIE_DAMAGE = 5;
const ZOMBIE_SPEEDMAX = 0.6;
const ZOMBIE_SPEEDMIN = 0.4;
const ZOMBIE_FORCE = 2;
const ZOMBIE_SIZE = 10;
const ZOMBIE_HAND_SIZE = 4;
const ZOMBIE_DRAG = 0.925;
const ZOMBIE_DECOMPOSE = 900;

const BLOOD_LIFETIMEMAX = 1000;
const BLOOD_LIFETIMEMIN = 750;

// Variables
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var keysDown = [];
var mousePos = { x: 0, y: 0 };
var mouseDown = false;

// Object lists
var player;
var bullets = [];
var zombies = [];
var lowParticles = [];
var highParticles = [];
var zbuffer = [];

// Items
var items =
[
/*0*/ { name: "Empty" },

//    --- Guns ---
/*1*/ { name: "Pistol",              dmg: 3, range: { min: 70, max: 80 },   rate: 50, count: 1,  accr: 0.05,  force: 0.5,  mag: 8,   reload: 100 },
/*2*/ { name: "Rifle",               dmg: 8, range: { min: 160, max: 200 }, rate: 90, count: 1,  accr: 0.01,  force: 1,    mag: 5,   reload: 200 },
/*3*/ { name: "Pump-Action Shotgun", dmg: 1, range: { min: 30, max: 70 },   rate: 80, count: 8,  accr: 0.175, force: 0.75, mag: 6,   reload: 300 },
/*4*/ { name: "Double-Barrel",       dmg: 2, range: { min: 10, max: 50 },   rate: 20, count: 12, accr: 0.5,   force: 1.5,  mag: 2,   reload: 200 },
/*5*/ { name: "Sub-Machine Gun",     dmg: 1, range: { min: 60, max: 80 },   rate: 8,  count: 1,  accr: 0.175, force: 0.3,  mag: 30,  reload: 150 },
/*6*/ { name: "Machine Gun",         dmg: 3, range: { min: 80, max: 125 },  rate: 12, count: 1,  accr: 0.05,  force: 0.8,  mag: 24,  reload: 200 },
/*7*/ { name: "Mini Gun",            dmg: 1, range: { min: 80, max: 100 },  rate: 5,  count: 1,  accr: 0.2,   force: 1,    mag: 200, reload: 1000 }
];

// ==================== CLASSES ====================

// --- Player Class ---
function Player (_x, _y, _gunID)
{
	this.pos = { x: _x, y: _y };
	this.vel = { x: 0, y: 0 };
	this.dir = 0;

	this.upKey = 87;
	this.downKey = 83;
	this.leftKey = 65;
	this.rightKey = 68;
	this.reloadKey = 82;
	this.useKey = 69;

	this.health = PLAYER_HEALTH;
	this.alive = true;
	this.hasControl = true;
	this.moving;

	this.gunID = _gunID;

	this.readyToFire = false;
	this.reload = false;
	this.loaded = items[this.gunID].mag;
	this.curGunDelay = 0;
	this.curReloadDelay = items[this.gunID].reload;

	this.impactDir = 0;
	this.impactForce = 0;
	this.invunrable = 0;

	this.Update = function ()
	{
		// Apply velocity
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;

		// Drag on velocity
		this.vel.x *= PLAYER_DRAG;
		this.vel.y *= PLAYER_DRAG;

		// Removes hurt invunrablility
		if (this.invunrable-- < 0)
			this.invunrable = 0;

		// If players alive
		if (this.alive)
		{
			// Checks health
			if (this.health <= 0)
				this.Death();

			// Checks gun
			this.readyToFire = true;

			if (this.curGunDelay-- > 0)
				this.readyToFire = false;

			if (this.loaded <= 0 || this.loaded == undefined)
				this.readyToFire = false;

			// Reloading
			if (this.reload || (this.loaded <= 0 && _AUTO_RELOADING))
			{
				this.reload = true;
				this.readyToFire = false;
				this.loaded = ((items[this.gunID].reload - this.curReloadDelay) / items[this.gunID].reload) * items[this.gunID].mag - 0.5;
				if (this.curReloadDelay-- <= 0)
				{
					this.loaded = items[this.gunID].mag;
					this.reload = false;
					this.curReloadDelay = items[this.gunID].reload;
				}
			}

			// Sets dir
			this.dir = Math.atan((mousePos.y + cam.y - this.pos.y) / (mousePos.x + cam.x - this.pos.x));
			if (mousePos.x + cam.x - this.pos.x < 0)
				this.dir += Math.PI;

			// Control
			if (this.hasControl)
			{
				// Moving
				this.moving = false;
				if (keysDown[this.upKey])
				{
					if (keysDown[this.rightKey] || keysDown[this.leftKey]) this.pos.y -= PLAYER_SPEED_DIAG;
					else this.pos.y -= PLAYER_SPEED;
					this.moving = true;
				}
				if (keysDown[this.downKey])
				{
					if (keysDown[this.rightKey] || keysDown[this.leftKey]) this.pos.y += PLAYER_SPEED_DIAG;
					else this.pos.y += PLAYER_SPEED;
					this.moving = true;
				}
				if (keysDown[this.leftKey])
				{
					if (keysDown[this.upKey] || keysDown[this.downKey]) this.pos.x -= PLAYER_SPEED_DIAG;
					else this.pos.x -= PLAYER_SPEED;
					this.moving = true;
				}
				if (keysDown[this.rightKey])
				{
					if (keysDown[this.upKey] || keysDown[this.downKey]) this.pos.x += PLAYER_SPEED_DIAG;
					else this.pos.x += PLAYER_SPEED;
					this.moving = true;
				}

				// Reload
				if (keysDown[this.reloadKey] && !this.reload)
				{
					this.readyToFire = false;
					this.loaded = 0;
					this.reload = true;
				}

				// ------------ debug
				// change gun

				if (keysDown[49])
					this.Pickup(1);
				if (keysDown[50])
					this.Pickup(2);
				if (keysDown[51])
					this.Pickup(3);
				if (keysDown[52])
					this.Pickup(4);
				if (keysDown[53])
					this.Pickup(5);
				if (keysDown[54])
					this.Pickup(6);
				if (keysDown[55])
					this.Pickup(7);

				// ------------------

				// Shooting
				if (mouseDown && this.readyToFire)
				{
					this.loaded--;
					this.curGunDelay = items[this.gunID].rate;

					if (this.moving)
						this.dir += Math.random()*WALK_INACCURACY - WALK_INACCURACY/2;

					for (var i = 0; i < items[this.gunID].count; i++)
						bullets.push(new Bullet(
							this.pos.x,
							this.pos.y,
							this.dir + Math.random()*items[this.gunID].accr - items[this.gunID].accr/2,
							items[this.gunID].dmg,
							items[this.gunID].force,
							items[this.gunID].range));

					GunParticles(this.pos.x, this.pos.y, this.dir);
				}
			}
		}

		// Adds to zbuffer
		AddToZBuffer(this);
	}

	// Draws to frame
	this.Draw = function ()
	{
		if (this.alive)
		{
			// Head
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
			ctx.fillStyle = "pink";
			ctx.fill();

			// Hands behind back
			if (this.dir <= 0 || this.dir >= Math.PI)
				this.DrawHands();

			// Body
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y, PLAYER_SIZE, PLAYER_SIZE);
			ctx.fillStyle = "blue";
			ctx.fill();

			// Hands infront
			if (this.dir > 0 && this.dir < Math.PI)
				this.DrawHands();
		}
		else
		{
			// Dead head
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y, PLAYER_SIZE, PLAYER_SIZE);
			ctx.fillStyle = "pink";
			ctx.fill();
		}
	}

	// Draw hands
	this.DrawHands = function()
	{
		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - PLAYER_HAND_SIZE/2 + Math.cos(this.dir)*6, this.pos.y - cam.y + 1, PLAYER_HAND_SIZE, PLAYER_HAND_SIZE);
		ctx.fillStyle = "pink";
		ctx.fill();
	}

	// Pickup item
	this.Pickup = function (id)
	{
		this.gunID = id;
		this.reload = false;
		this.loaded = 0;
		this.readyToFire = false;
		this.curReloadDelay = items[this.gunID].reload;
		this.curGunDelay = items[this.gunID].rate;
	}

	// Hurts player
	this.Hurt = function (_damage, _dir, _force)
	{
		this.impactDir = _dir;
		this.impactForce = _force;
		this.vel.x = Math.cos(_dir) * this.impactForce;
		this.vel.y = Math.sin(_dir) * this.impactForce;
		if (this.invunrable <= 0)
		{
			if (this.health > 0)
				this.health -= _damage;
			else
				this.health = 0;

			Bleed(this.pos.x, this.pos.y, this.impactDir, this.impactForce, _damage);
		}
		this.invunrable = PLAYER_INVUNRABLE_TIME;

	}

	// Destroys the player
	this.Death = function ()
	{
		this.alive = false;
		this.hasControl = false;
	}
}

// --- Camera Class ---
function Camera ()
{
	this.x = 0;
	this.y = 0;
	this.target;

	// Follow target
	this.Update = function ()
	{
		if (this.target.x - this.x - canvas.width/2 > WALK_SPACE)
			this.x = this.target.x - WALK_SPACE - canvas.width/2;
		if (this.target.x - this.x - canvas.width/2 < -WALK_SPACE)
			this.x = this.target.x + WALK_SPACE - canvas.width/2;
		if (this.target.y - this.y - canvas.height/2 > WALK_SPACE)
			this.y = this.target.y - WALK_SPACE - canvas.height/2;
		if (this.target.y - this.y - canvas.height/2 < -WALK_SPACE)
			this.y = this.target.y + WALK_SPACE - canvas.height/2;
	}
}

// --- Zombie Class ---
function Zombie (_x, _y)
{
	this.pos = { x: _x, y: _y };
	this.vel = { x: 0, y: 0 };
	this.dir = 0;

	this.alive = true;
	this.health = ZOMBIE_HEALTH;
	this.curDecompose = ZOMBIE_DECOMPOSE;
	this.speed = Math.random() * (ZOMBIE_SPEEDMAX - ZOMBIE_SPEEDMIN) + ZOMBIE_SPEEDMIN;

	this.impactDir;
	this.impactForce;

	this.Update = function ()
	{

		// Apply velocity
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;

		// Drag on velocity
		this.vel.x *= ZOMBIE_DRAG;
		this.vel.y *= ZOMBIE_DRAG;

		if (this.alive)
		{
			// Checks health
			if (this.health <= 0)
				this.Death();

			// Follow player
			this.dir = Math.atan((player.pos.y - this.pos.y) / (player.pos.x - this.pos.x));
			if (player.pos.x - this.pos.x < 0)
				this.dir += Math.PI;

			// Move
			this.pos.x += Math.cos(this.dir) * this.speed;
			this.pos.y += Math.sin(this.dir) * this.speed;

			// Attack player
			if (Math.abs(this.pos.x - player.pos.x) < ZOMBIE_SIZE &&
				Math.abs(this.pos.y - player.pos.y) < ZOMBIE_SIZE)
				player.Hurt(ZOMBIE_DAMAGE, this.dir, ZOMBIE_FORCE);
		}
		else
			if (this.curDecompose-- <= 0)
				this.Destroy();

		// Adds to zbuffer
		AddToZBuffer(this);
	}

	// Draws to frame
	this.Draw = function ()
	{
		if (this.alive)
		{
			// Head
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y - ZOMBIE_SIZE, ZOMBIE_SIZE, ZOMBIE_SIZE);
			ctx.fillStyle = "darkgreen";
			ctx.fill();

			// Hands behind back
			if ((this.dir <= 0 || this.dir >= Math.PI) && _ZOMBIE_HANDS)
				this.DrawHands();

			// Body
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y, ZOMBIE_SIZE, ZOMBIE_SIZE);
			ctx.fillStyle = "brown";
			ctx.fill();

			// Hands infront
			if (this.dir > 0 && this.dir < Math.PI && _ZOMBIE_HANDS)
				this.DrawHands();
		}
		else
		{
			// Dead head
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y, ZOMBIE_SIZE, ZOMBIE_SIZE);
			ctx.fillStyle = "darkgreen";
			ctx.fill();
		}
	}

	this.DrawHands = function ()
	{
		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - ZOMBIE_HAND_SIZE/2 + Math.cos(this.dir-0.6)*6, this.pos.y - cam.y + 1, ZOMBIE_HAND_SIZE, ZOMBIE_HAND_SIZE);
		ctx.fillStyle = "darkgreen";
		ctx.fill();

		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - ZOMBIE_HAND_SIZE/2 + Math.cos(this.dir+0.6)*6, this.pos.y - cam.y + 1, ZOMBIE_HAND_SIZE, ZOMBIE_HAND_SIZE);
		ctx.fillStyle = "darkgreen";
		ctx.fill();
	}

	// Hurts zombie
	this.Hurt = function (_damage, _dir, _force)
	{
		this.health -= _damage;
		this.impactDir = _dir;
		this.impactForce = _force;
		this.vel.x += Math.cos(_dir) * this.impactForce;
		this.vel.y += Math.sin(_dir) * this.impactForce;
		Bleed(this.pos.x, this.pos.y, this.impactDir, this.impactForce, _damage);
	}

	// Dies
	this.Death = function ()
	{
		this.alive = false;
		this.Bleed(10);
	}

	// Removes itself from list
	this.Destroy = function ()
	{
		this.index = zombies.indexOf(this);
		zombies.splice(this.index, 1);
	}
}

// --- Bullet Class ---
function Bullet (_x, _y, _dir, _damage, _force, _range)
{
	this.pos = { x: _x, y: _y };
	this.dir = _dir;
	this.damage = _damage;
	this.force = _force;
	this.lifetime = Math.random()*(_range.max-_range.min) + _range.min;

	this.Update = function ()
	{
		// Move
		this.pos.x += Math.cos(this.dir) * BULLET_SPEED;
		this.pos.y += Math.sin(this.dir) * BULLET_SPEED;

		// Collision
		for (var i = 0; i < zombies.length; i++)
		{
			if (zombies[i].alive)
			{
				if (Math.abs(this.pos.x - zombies[i].pos.x) < ZOMBIE_SIZE &&
					Math.abs(this.pos.y - zombies[i].pos.y) < ZOMBIE_SIZE)
				{
					zombies[i].Hurt(this.damage, this.dir, this.force);
					this.Destroy();
				}
			}
		}

		// Destroy itself if out of range
		if (this.lifetime-- <= 0)
			this.Destroy();

		// Adds to zbuffer
		AddToZBuffer(this);
	}

	// Draw to frame
	this.Draw = function ()
	{
		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - BULLET_SIZE/2, this.pos.y - cam.y - BULLET_SIZE/2, BULLET_SIZE, BULLET_SIZE);
		ctx.fillStyle = "white";
		ctx.fill();
	}

	// Removes itself from list
	this.Destroy = function ()
	{
		this.index = bullets.indexOf(this);
		bullets.splice(this.index, 1);
	}
}

// --- Particle Class ---
function Particle (_x, _y, _dir, _speed, _drag, _size, _lifetime, _colour, _isLow)
{
	this.pos = { x: _x, y: _y };
	this.dir = _dir;
	this.isLow = _isLow;
	this.speed = _speed;
	this.drag = _drag;
	this.size = _size;
	this.lifetime = _lifetime;
	this.colour = _colour;

	this.Update = function ()
	{
		// Movement
		if (this.speed < 0.01)
			this.speed = 0;
		else
		{
			this.pos.x += Math.cos(this.dir) * this.speed;
			this.pos.y += Math.sin(this.dir) * this.speed;
			this.speed = this.speed * this.drag;
		}

		// Remove if lifetime reached
		if (this.lifetime-- <= 0)
			this.Destroy();
	}

	// Draw to frame
	this.Draw = function ()
	{
		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - this.size/2, this.pos.y - cam.y - this.size/2, this.size, this.size);
		ctx.fillStyle = this.colour;
		ctx.fill();
	}

	// Removes itself from list
	this.Destroy = function ()
	{
		// Checks through particles
		if (this.isLow)
		{
			this.index = lowParticles.indexOf(this);
			lowParticles.splice(this.index, 1);
		}
		else
		{
			this.index = highParticles.indexOf(this);
			highParticles.splice(this.index, 1);
		}
	}
}


// ==================== FUNCTIONS ====================

// --- Starts Game ---
function Start ()
{
	// Spawns players
	player = new Player(600, 300, PLAYER_STARTING_GUN);

	// debug zombies
	for (var i = 0; i < 0; i++)
		zombies.push(new Zombie(
			Math.random() * canvas.width,
			Math.random() * canvas.height));

	// Setup camera
	cam = new Camera();
	cam.target = player.pos;
}

// --- Main Loop ---
function Update ()
{
	// Spawn zombies
	if (Math.random() < 0.01)
	{
		var x = cam.x;
		var y = cam.y;
		var rand = Math.floor(Math.random()*4);
		if (rand == 0) x += Math.random()*canvas.width;
		if (rand == 1) y += Math.random()*canvas.height;
		if (rand == 2)
		{
			x += Math.random()*canvas.width;
			y += canvas.height;
		}
		if (rand == 3)
		{
			x += canvas.width;
			y += Math.random()*canvas.height;
		}
		zombies.push(new Zombie(x, y));
	}

	// Update objects
	zbuffer = [];
	player.Update();
	for (var i = 0; i < bullets.length; i++) bullets[i].Update();
	for (var i = 0; i < zombies.length; i++) zombies[i].Update();
	for (var i = 0; i < lowParticles.length; i++) lowParticles[i].Update();
	for (var i = 0; i < highParticles.length; i++) highParticles[i].Update();
	cam.Update();

	// Draws frame
	Draw();
}

// --- Draws Frame to Canvas ---
function Draw ()
{
	// Background
	ctx.beginPath();
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Objects
	for (var i = 0; i < lowParticles.length; i++) lowParticles[i].Draw();
	for (var i = 0; i < zbuffer.length; i++) zbuffer[i].Draw();
	for (var i = 0; i < highParticles.length; i++) highParticles[i].Draw();

	// UI
	DrawUI();
}

// --- Draw UI to Canvas ---
function DrawUI ()
{
	// Health
	ctx.beginPath();
	ctx.rect(10, canvas.height - 10, 30, -PLAYER_HEALTH - 10);
	ctx.fillStyle = "grey";
	ctx.fill();

	ctx.beginPath();
	ctx.rect(15, canvas.height - 15, 20, -PLAYER_HEALTH);
	ctx.fillStyle = "black";
	ctx.fill();

	ctx.beginPath();
	ctx.rect(15, canvas.height - 15, 20, -player.health);
	ctx.fillStyle = "red";
	ctx.fill();

	// Gun name
	ctx.beginPath();
	ctx.fillStyle = "white";
	ctx.font = "17px Impact";
	ctx.fillText(items[player.gunID].name, canvas.width - 10 - items[player.gunID].name.length*8.5, canvas.height - 12);
	
	// Ammo
	if (player.loaded > 0)
	{
		for (var i = 0; i < player.loaded; i++)
		{
			ctx.beginPath();
			ctx.rect(canvas.width - 15 - i*8 + Math.floor(i/40) * 320, canvas.height - 50 - Math.floor(i/40) * 20, 5, 15);
			if (player.reload) ctx.fillStyle = "grey";
			else ctx.fillStyle = "white";
			ctx.fill();
		}
	}
	else
	{
		if (!player.reload && items[player.gunID].mag != undefined)
		{
			ctx.beginPath();
			ctx.fillStyle = "red";
			ctx.font = "17px Impact";
			ctx.fillText("RELOAD", canvas.width - 62, canvas.height - 38);
		}
	}

	// Borders
	ctx.beginPath();
	ctx.rect(0, 0, canvas.width, 5)
	ctx.fillStyle = 'grey';
	ctx.fill();
	ctx.beginPath();
	ctx.rect(0, canvas.height, canvas.width, -5)
	ctx.fillStyle = 'grey';
	ctx.fill();
	ctx.beginPath();
	ctx.rect(0, 0, 5, canvas.height)
	ctx.fillStyle = 'grey';
	ctx.fill();
	ctx.beginPath();
	ctx.rect(canvas.width, 0, -5, canvas.height)
	ctx.fillStyle = 'grey';
	ctx.fill();
}

function AddToZBuffer(object)
{
	var objectAdded = false;
	var zbufferLength = zbuffer.length;
	for (var i = 0; i < zbufferLength; i++)
	{
		if (object.pos.y <= zbuffer[i].pos.y)
		{
			zbuffer.splice(i, 0, object);
			objectAdded = true;
			break;
		}
	}
	if (!objectAdded)
		zbuffer.push(object);
}

function Bleed (x, y, dir, force, count)
{
	for (var i = 0; i < count * _BLOOD_INTENSITY; i++)
		lowParticles.push(new Particle(
			x, y,
			dir + Math.random() - 0.5,
			Math.random() * force * 5 + 1,
			Math.random() * 0.2 + 0.7,
			5,
			Math.random() * (BLOOD_LIFETIMEMAX - BLOOD_LIFETIMEMIN) + BLOOD_LIFETIMEMIN,
			"red",
			true));
}

function GunParticles (x, y, dir)
{
	for (var i = 0; i < 5; i++)
		highParticles.push(new Particle(
			x, y,
			dir + Math.random() * 0.5 - 0.25,
			Math.random() * 1 + 3,
			0.9,
			5,
			Math.random() * (MUZZLE_LIFETIMEMAX - MUZZLE_LIFETIMEMIN) + MUZZLE_LIFETIMEMIN,
			"white",
			false));
}

// --- Keyboard Input (Down) ---
document.addEventListener('keydown', function (e)
{
	// Stops scrolling with arrows and space bar
	if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1)
		e.preventDefault();

	keysDown[e.keyCode] = true;
});

// --- Keyboard Input (Up) ---
document.addEventListener('keyup', function (e)
{
	keysDown[e.keyCode] = false;
});

// --- Mouse Input (click down) ---
document.addEventListener('mousedown', function (e)
{
	mouseDown = true;
});

// --- Mouse Input (click up) ---
document.addEventListener('mouseup', function (e)
{
	mouseDown = false;
});

// --- Mouse Input (pos) ---
canvas.addEventListener('mousemove', function(e) {
	mousePos =
	{
		x: e.clientX - canvas.getBoundingClientRect().left,
		y: e.clientY - canvas.getBoundingClientRect().top
	};
}, false);

// ==================== ON LOAD ====================

// Starts game
Start();
setInterval(Update, 10);
