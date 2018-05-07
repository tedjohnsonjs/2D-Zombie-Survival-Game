
// ==================== VARIABLES ====================

// Constants
const PLAYER_HEALTH = 5;
const PLAYER_SPEED = 1;
const PLAYER_SPEED_DIAG = PLAYER_SPEED * 0.707;
const PLAYER_SIZE = 10;
const WALK_SPACE = 50;

const BULLET_SPEED = 6;
const BULLET_SIZE = 5;

const ZOMBIE_HEALTH = 3;
const ZOMBIE_SPEEDMAX = 0.6;
const ZOMBIE_SPEEDMIN = 0.4;
const ZOMBIE_SIZE = 10;

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
/*1*/ { name: "Pistol",          dmg: 3, range: { min: 70, max: 80 },   rate: 50, count: 1,  accr: 0.05,  mag: 8,  reload: 100 },
/*2*/ { name: "Rifle",           dmg: 8, range: { min: 160, max: 200 }, rate: 90, count: 1,  accr: 0.01,  mag: 5,  reload: 200 },
/*3*/ { name: "Shotgun",         dmg: 1, range: { min: 30, max: 70 },   rate: 80, count: 8,  accr: 0.175, mag: 6,  reload: 200 },
/*4*/ { name: "Double-Barrel",   dmg: 2, range: { min: 10, max: 50 },   rate: 20, count: 12, accr: 0.5,   mag: 2,  reload: 200 },
/*5*/ { name: "Sub-Machine Gun", dmg: 1, range: { min: 60, max: 100 },  rate: 10, count: 1,  accr: 0.1,   mag: 30, reload: 150 }
];

// ==================== CLASSES ====================

// --- Player Class ---
function Player (_x, _y, _gunID)
{
	this.pos = { x: _x, y: _y };

	this.upKey = 87;
	this.downKey = 83;
	this.leftKey = 65;
	this.rightKey = 68;
	this.useKey = 69;

	this.health = PLAYER_HEALTH;
	this.alive = true;
	this.hasControl = true;

	this.gunID = _gunID;

	this.readyToFire = false;
	this.loaded = items[this.gunID].mag;
	this.curGunDelay = 0;
	this.curReloadDelay = items[this.gunID].reload;

	this.Update = function ()
	{
		if (this.alive)
		{
			// Checks health
			if (this.health <= 0)
				this.Death();

			// Checks gun
			this.readyToFire = true;

			if (this.curGunDelay-- > 0)
				this.readyToFire = false;

			if (this.loaded <= 0)
			{
				this.readyToFire = false;
				if (this.curReloadDelay-- <= 0)
				{
					this.loaded = items[this.gunID].mag;
					this.curReloadDelay = items[this.gunID].reload;
				}
			}

			// Control
			if (this.hasControl)
			{

				// Moving
				if (keysDown[this.upKey])
				{
					if (keysDown[this.rightKey] || keysDown[this.leftKey]) this.pos.y -= PLAYER_SPEED_DIAG;
					else this.pos.y -= PLAYER_SPEED;
				}
				if (keysDown[this.downKey])
				{
					if (keysDown[this.rightKey] || keysDown[this.leftKey]) this.pos.y += PLAYER_SPEED_DIAG;
					else this.pos.y += PLAYER_SPEED;
				}
				if (keysDown[this.leftKey])
				{
					if (keysDown[this.upKey] || keysDown[this.downKey]) this.pos.x -= PLAYER_SPEED_DIAG;
					else this.pos.x -= PLAYER_SPEED;
				}
				if (keysDown[this.rightKey])
				{
					if (keysDown[this.upKey] || keysDown[this.downKey]) this.pos.x += PLAYER_SPEED_DIAG;
					else this.pos.x += PLAYER_SPEED;
				}

				// Shooting
				if (mouseDown && this.readyToFire)
				{
					this.loaded--;
					this.curGunDelay = items[this.gunID].rate;

					var angle = Math.atan((mousePos.y + cam.y - this.pos.y) / (mousePos.x + cam.x - this.pos.x));
					if (mousePos.x + cam.x - this.pos.x < 0)
						angle += Math.PI;

					for (var i = 0; i < items[this.gunID].count; i++)
						bullets.push(new Bullet(
							this.pos.x,
							this.pos.y,
							angle + Math.random()*items[this.gunID].accr - items[this.gunID].accr/2,
							items[this.gunID].dmg,
							items[this.gunID].range));
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
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
			ctx.fillStyle = "pink";
			ctx.fill();
			ctx.beginPath();
			ctx.rect(this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y, PLAYER_SIZE, PLAYER_SIZE);
			ctx.fillStyle = "blue";
			ctx.fill();
		}
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

	this.health = ZOMBIE_HEALTH;
	this.speed = Math.random() * (ZOMBIE_SPEEDMAX - ZOMBIE_SPEEDMIN) + ZOMBIE_SPEEDMIN;

	this.Update = function ()
	{
		// Checks health
		if (this.health <= 0)
			this.Death();

		// Follow player
		var xDist = player.pos.x - this.pos.x;
		var yDist = player.pos.y - this.pos.y;
		if (xDist > 0)
		{
			var dir = Math.atan(yDist / xDist);
			this.pos.x += Math.cos(dir) * this.speed;
			this.pos.y += Math.sin(dir) * this.speed;
		}
		else if (xDist < 0)
		{
			var dir = Math.atan(yDist / xDist);
			this.pos.x -= Math.cos(dir) * this.speed;
			this.pos.y -= Math.sin(dir) * this.speed;
		}
		else
		{
			if (yDist > 0)
				this.pos.y += this.speed;
			else
				this.pos.y -= this.speed;
		}

		// Adds to zbuffer
		AddToZBuffer(this);
	}

	// Draws to frame
	this.Draw = function ()
	{
		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y - ZOMBIE_SIZE, ZOMBIE_SIZE, ZOMBIE_SIZE);
		ctx.fillStyle = "darkgreen";
		ctx.fill();
		ctx.beginPath();
		ctx.rect(this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y, ZOMBIE_SIZE, ZOMBIE_SIZE);
		ctx.fillStyle = "brown";
		ctx.fill();
	}

	// Removes itself from list
	this.Death = function ()
	{

	}
}

// --- Bullet Class ---
function Bullet (_x, _y, _dir, _damage, _range)
{
	this.pos = { x: _x, y: _y };
	this.dir = _dir;
	this.damage = _damage;
	this.lifetime = Math.random()*(_range.max-_range.min) + _range.min;

	this.Update = function ()
	{
		// Move
		this.pos.x += Math.cos(this.dir) * BULLET_SPEED;
		this.pos.y += Math.sin(this.dir) * BULLET_SPEED;

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
function Particle (_x, _y, _xVel, _yVel, _size, _lifetime, _colour)
{
	this.pos = { x: _x, y: _y };
	this.vel = { x: _xVel, y: _yVel };
	this.size = _size;
	this.lifetime = _lifetime;
	this.colour = _colour;

	this.Update = function ()
	{
		// Move
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;
	}

	// Draw to frame
	this.Draw = function ()
	{
		 //- cam.
	}

	// Removes itself from list
	this.Destroy = function ()
	{
		this.index = particles.indexOf(this);
		particles.splice(this.index, 1);
	}
}


// ==================== FUNCTIONS ====================

// --- Starts Game ---
function Start ()
{
	// Spawns players
	player = new Player(300, 300, 4);

	// debug zombies
	for (var i = 0; i < 20; i++)
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

	for (var i = 0; i < lowParticles.length; i++) lowParticles[i].Draw();
	for (var i = 0; i < zbuffer.length; i++) zbuffer[i].Draw();
	for (var i = 0; i < highParticles.length; i++) highParticles[i].Draw();
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
