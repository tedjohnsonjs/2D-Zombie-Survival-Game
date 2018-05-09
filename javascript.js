
// ==================== VARIABLES ====================

// Game Settings
var _AUTO_RELOADING = false;
var _AUTO_FIRING = false;
var _BLOOD_INTENSITY = 1;
var _ZOMBIE_HANDS = true;

// Constants
const PLAYER_HEALTH = 100;
const PLAYER_SPEED = 1;
const PLAYER_SPEED_DIAG = PLAYER_SPEED * 0.707;
const PLAYER_SIZE = 10;
const PLAYER_HAND_SIZE = 4;
const PLAYER_GUN_SIZE = 4;
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
var paused = false;
var pauseKey = 27;
var keysDown = [];
var mousePos = { x: 0, y: 0 };
var mouseDown = false;
var mouseReleased = false;

var pauseButtons = [];
var optionButtons = [];
var menuButtons = [];

var options = false;
var mainMenu = true;

var drawGame;
var drawUI;
var drawDead;
var drawPause;
var drawMenu;
var drawOptions;

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
/*1*/ { name: "Pistol",              dmg: 3, range: { min: 70, max: 80 },   rate: 30, count: 1,  accr: 0.05,  speed: 1,   force: 0.5,  recoil: 0,    mag: 8,  reload: 100,  auto: false },
/*2*/ { name: "Rifle",               dmg: 8, range: { min: 160, max: 200 }, rate: 80, count: 1,  accr: 0.01,  speed: 0.8, force: 0.75, recoil: 0.5,  mag: 5,  reload: 200,  auto: false },
/*3*/ { name: "Pump-Action Shotgun", dmg: 1, range: { min: 30, max: 70 },   rate: 75, count: 8,  accr: 0.175, speed: 0.8, force: 0.75, recoil: 0.75, mag: 6,  reload: 300,  auto: false },
/*4*/ { name: "Double-Barrel",       dmg: 2, range: { min: 10, max: 50 },   rate: 20, count: 12, accr: 0.5,   speed: 0.7, force: 2,    recoil: 1,    mag: 2,  reload: 200,  auto: false },
/*5*/ { name: "Sub-Machine Gun",     dmg: 2, range: { min: 40, max: 70 },   rate: 8,  count: 1,  accr: 0.2,   speed: 1,   force: 0.3,  recoil: 0.1,  mag: 30, reload: 150,  auto: true  },
/*6*/ { name: "Machine Gun",         dmg: 3, range: { min: 80, max: 125 },  rate: 12, count: 1,  accr: 0.1,   speed: 0.8, force: 0.8,  recoil: 0.25, mag: 24, reload: 200,  auto: true  },
/*7*/ { name: "Mini Gun",            dmg: 2, range: { min: 80, max: 125 },  rate: 5,  count: 1,  accr: 0.25,  speed: 0.5, force: 1,    recoil: 0.5, mag: 200, reload: 1000, auto: true  }
];

// ==================== CLASSES ====================

// --- Player Class ---
function Player (_x, _y, _gunID)
{
	this.pos = { x: _x, y: _y };
	this.handPos = { x: 0, y: 0 };
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
	this.speedMultiplier;
	this.moving;

	this.gunID = _gunID;

	this.readyToFire = false;
	this.reload = false;
	this.loaded = items[this.gunID].mag;
	this.curGunDelay = 0;
	this.curReloadDelay = items[this.gunID].reload;
	this.semiFireReady = true;

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

		// Resets speed multipler
		if (items[this.gunID].speed != undefined)
			this.speedMultiplier = items[this.gunID].speed;
		else
			this.speedMultiplier = 1;

		// On release of mouse
		if (!mouseDown)
			this.semiFireReady = true;

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
					if (keysDown[this.rightKey] || keysDown[this.leftKey]) this.pos.y -= PLAYER_SPEED_DIAG * this.speedMultiplier;
					else this.pos.y -= PLAYER_SPEED * this.speedMultiplier;
					this.moving = true;
				}
				if (keysDown[this.downKey])
				{
					if (keysDown[this.rightKey] || keysDown[this.leftKey]) this.pos.y += PLAYER_SPEED_DIAG * this.speedMultiplier;
					else this.pos.y += PLAYER_SPEED * this.speedMultiplier;
					this.moving = true;
				}
				if (keysDown[this.leftKey])
				{
					if (keysDown[this.upKey] || keysDown[this.downKey]) this.pos.x -= PLAYER_SPEED_DIAG * this.speedMultiplier;
					else this.pos.x -= PLAYER_SPEED * this.speedMultiplier;
					this.moving = true;
				}
				if (keysDown[this.rightKey])
				{
					if (keysDown[this.upKey] || keysDown[this.downKey]) this.pos.x += PLAYER_SPEED_DIAG * this.speedMultiplier;
					else this.pos.x += PLAYER_SPEED * this.speedMultiplier;
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
				if (mouseDown && this.readyToFire && (this.semiFireReady || items[this.gunID].auto || _AUTO_FIRING))
				{
					this.semiFireReady = false;
					this.loaded--;
					this.curGunDelay = items[this.gunID].rate;

					// Walking inaccuracy
					if (this.moving)
						this.dir += Math.random()*WALK_INACCURACY - WALK_INACCURACY/2;

					// Spawns bullets
					var b = items[this.gunID].count;
					for (var i = 0; i < b; i++)
						bullets.push(new Bullet(
							this.pos.x,
							this.pos.y,
							this.dir + Math.random()*items[this.gunID].accr - items[this.gunID].accr/2,
							items[this.gunID].dmg,
							items[this.gunID].force,
							items[this.gunID].range));

					// Muzzle particles
					GunParticles(this.pos.x, this.pos.y, this.dir);

					// Applies recoil velocity
					this.vel.x = Math.cos(this.dir + Math.PI) * items[this.gunID].recoil;
					this.vel.y = Math.sin(this.dir + Math.PI) * items[this.gunID].recoil;
				}
			}

			// Sets handPos
			this.handPos.x = this.pos.x - cam.x - PLAYER_HAND_SIZE/2 + Math.cos(this.dir)*6;
			this.handPos.y = this.pos.y - cam.y + 2;
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
			DrawRect("pink", this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);

			// Hands behind back
			if (this.dir <= 0 || this.dir >= Math.PI)
				this.DrawHands();

			// Body
			DrawRect("blue", this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y, PLAYER_SIZE, PLAYER_SIZE);

			// Hands infront
			if (this.dir > 0 && this.dir < Math.PI)
				this.DrawHands();
		}
		else
		{
			// Dead head
			DrawRect("pink", this.pos.x - cam.x - PLAYER_SIZE/2, this.pos.y - cam.y, PLAYER_SIZE, PLAYER_SIZE);
		}
	}

	// Draw hands
	this.DrawHands = function()
	{
		// Gun
		//ctx.beginPath();
		//ctx.rect(this.pos.x - cam.x - PLAYER_HAND_SIZE/2 + Math.cos(this.dir)*6, this.pos.y - cam.y - 1, PLAYER_GUN_SIZE + Math.abs(Math.cos(this.dir))*6, PLAYER_HAND_SIZE);
		//ctx.fillStyle = "grey";
		//ctx.fill();

		// Hand
		DrawRect("pink", this.handPos.x, this.handPos.y, PLAYER_HAND_SIZE, PLAYER_HAND_SIZE);
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
			DrawRect("darkgreen", this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y - ZOMBIE_SIZE, ZOMBIE_SIZE, ZOMBIE_SIZE);

			// Hands behind back
			if ((this.dir <= 0 || this.dir >= Math.PI) && _ZOMBIE_HANDS)
				this.DrawHands();

			// Body
			DrawRect("brown", this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y, ZOMBIE_SIZE, ZOMBIE_SIZE);

			// Hands infront
			if (this.dir > 0 && this.dir < Math.PI && _ZOMBIE_HANDS)
				this.DrawHands();
		}
		else
		{
			// Dead head
			DrawRect("darkgreen", this.pos.x - cam.x - ZOMBIE_SIZE/2, this.pos.y - cam.y, ZOMBIE_SIZE, ZOMBIE_SIZE);
		}
	}

	this.DrawHands = function ()
	{
		DrawRect("darkgreen", this.pos.x - cam.x - ZOMBIE_HAND_SIZE/2 + Math.cos(this.dir-0.6)*6, this.pos.y - cam.y + 1, ZOMBIE_HAND_SIZE, ZOMBIE_HAND_SIZE);
		DrawRect("darkgreen", this.pos.x - cam.x - ZOMBIE_HAND_SIZE/2 + Math.cos(this.dir+0.6)*6, this.pos.y - cam.y + 1, ZOMBIE_HAND_SIZE, ZOMBIE_HAND_SIZE);
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
		Bleed(this.pos.x, this.pos.y, this.impactDir, this.impactForce, ~~(5 * _BLOOD_INTENSITY));
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
		var z = zombies.length;
		for (var i = 0; i < z; i++)
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
		DrawRect("white", this.pos.x - cam.x - BULLET_SIZE/2, this.pos.y - cam.y - BULLET_SIZE/2, BULLET_SIZE, BULLET_SIZE);
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
		DrawRect(this.colour, this.pos.x - cam.x - this.size/2, this.pos.y - cam.y - this.size/2, this.size, this.size);
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

// --- Button Class ---
function UIButton (_text, _textStyle, _textColour, _x, _y, _xSize, _ySize, _colour, _borderColour, _borderWidth, _functionName)
{
	this.text = _text;
	this.textStyle = _textStyle;
	this.textColour = _textColour;
	this.pos = { x: _x, y: _y };
	this.size = { x: _xSize, y: _ySize };
	this.colour = _colour;
	this.borderColour = _borderColour;
	this.borderWidth = _borderWidth;
	this.functionName = _functionName;
	this.highlighted = false;

	this.Update = function ()
	{
		// Checks if mouse is over button
		this.highlighted = false;
		if (mousePos.x > this.pos.x && mousePos.x < this.pos.x + this.size.x)
			if (mousePos.y > this.pos.y && mousePos.y < this.pos.y + this.size.y)
				this.highlighted = true;

		// Checks if mouse has released on top of button
		if (mouseReleased && this.highlighted)
				window[this.functionName]();
	}

	this.Draw = function ()
	{
		// Border
		DrawRect(this.borderColour, this.pos.x, this.pos.y, this.size.x, this.size.y);

		// Main
		DrawRect(this.colour, this.pos.x + this.borderWidth, this.pos.y + this.borderWidth, this.size.x - this.borderWidth*2, this.size.y - this.borderWidth*2);

		// Text
		ctx.beginPath();
		ctx.fillStyle = this.textColour;
		ctx.font = this.textStyle;
		ctx.fillText(this.text, this.pos.x + this.size.x/2, this.pos.y + this.size.y/1.6);

		// Highlight
		if (this.highlighted)
		{
			ctx.globalAlpha = 0.075;
			DrawRect("white", this.pos.x, this.pos.y, this.size.x, this.size.y);
			ctx.globalAlpha = 1;
		}
	}
}

// ==================== FUNCTIONS ====================

// --- Starts Game ---
function Start ()
{
	// Setup
	ctx.textAlign = "center";

	// Setup buttons
	pauseButtons.push(new UIButton("Restart", "18px Impact", "red",     75,  canvas.height - 100, 100, 50, "black", "darkred", 3, "StartGame"));
	pauseButtons.push(new UIButton("Menu",    "18px Impact", "red",     200, canvas.height - 100, 100, 50, "black", "darkred", 3, "OpenMainMenu"));
	pauseButtons.push(new UIButton("Options", "18px Impact", "red",     325, canvas.height - 100, 100, 50, "black", "darkred", 3, "OpenOptions"));
	optionButtons.push(new UIButton("Back",   "18px Impact", "darkred", 125, canvas.height - 80,  100, 40, "red",   "darkred", 3, "CloseOptions"));
	menuButtons.push(new UIButton("Play",     "18px Impact", "darkred", 200, canvas.height - 80,  100, 40, "red",   "darkred", 3, "StartGame"));
}

// --- Main Loop ---
function Update ()
{
	// Reset all draw callers
	drawUI = drawDead = drawPause = drawMenu = drawOptions = false;
	drawGame = true;

	// If the main menu is open
	if (mainMenu)
	{
		drawMenu = true;
		for (var i = 0; i < menuButtons.length; i++)
			menuButtons[i].Update();
	}

	// If the main menu isnt open
	else
		UpdateGame();

	if (options)
	{
		drawOptions = true;
		for (var i = 0; i < optionButtons.length; i++)
			optionButtons[i].Update();
	}

	// Mouse no longer in released state
	mouseReleased = false;

	// Draws everything
	Draw();
}

// --- Updates game related objects ---
function UpdateGame ()
{
	// If the player is alive
	if (player.alive)
		drawUI = true;

	// If the player is dead
	else
	{
		pauseButtons[1].Update();
		drawDead = true;
	}

	// Pause if loses focus
	if (!document.hasFocus())
		paused = true;

	// Toggle pause with pause key
	if (keysDown[pauseKey])
	{
		keysDown = [];
		paused = !paused;
	}

	// If the game is paused
	if (paused)
	{
		drawPause = true;
		for (var i = 0; i < pauseButtons.length; i++)
			pauseButtons[i].Update();
	}
	// If the game is not paused
	else
	{
		// Spawn zombies -- debug
		if (Math.random() < 0.01)
		{
			var x = cam.x;
			var y = cam.y;
			switch (~~(Math.random()*4))
			{
				case 0:
					x += Math.random()*canvas.width;
					break;
				case 1:
					y += Math.random()*canvas.height;
					break;
				case 2:
					x += Math.random()*canvas.width;
					y += canvas.height;
					break;
				case 3:
					x += canvas.width;
					y += Math.random()*canvas.height;
					break;
			}
			zombies.push(new Zombie(x, y));
		}

		// Update objects
		zbuffer = [];
		player.Update();
		for (var i = 0; i < bullets.length; i++)       bullets[i].Update();
		for (var i = 0; i < zombies.length; i++)       zombies[i].Update();
		for (var i = 0; i < lowParticles.length; i++)  lowParticles[i].Update();
		for (var i = 0; i < highParticles.length; i++) highParticles[i].Update();
		cam.Update();
	}
}

// --- Draws everything appropriate ---
function Draw ()
{
	// Clear Background
	ctx.beginPath();
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw different components
	if (drawGame)    DrawGame();
	if (drawUI)      DrawUI();
	if (drawDead)    DrawDead();
	if (drawPause)   DrawPause();
	if (drawMenu)    DrawMenu();
	if (drawOptions) DrawOptions();

	// Borders
	DrawRect("grey", 0, 0, canvas.width, 5);
	DrawRect("grey", 0, canvas.height, canvas.width, -5);
	DrawRect("grey", 0, 0, 5, canvas.height);
	DrawRect("grey", canvas.width, 0, -5, canvas.height);
}

function DrawRect (colour, x, y, xSize, ySize)
{
	ctx.beginPath();
	ctx.rect(x, y, xSize, ySize);
	ctx.fillStyle = colour;
	ctx.fill();
}

function DrawText (text, style, colour, x, y)
{
	ctx.beginPath();
	ctx.font = style;
	ctx.fillStyle = colour;
	ctx.fillText(text, x, y);
}

// --- Draw game to Canvas ---
function DrawGame ()
{
	// Level
	DrawRect("rgb(25, 25, 25)", 0, 0, canvas.width, canvas.height);

	// Objects
	var l = lowParticles.length;  for (var i = 0; i < l; i++) lowParticles[i].Draw();
	var z = zbuffer.length;       for (var i = 0; i < z; i++) zbuffer[i].Draw();
	var h = highParticles.length; for (var i = 0; i < h; i++) highParticles[i].Draw();
}

// --- Draw UI to Canvas ---
function DrawUI ()
{
	// Health
	DrawRect("grey", 10, canvas.height - 10, 30, -PLAYER_HEALTH - 10);
	DrawRect("black", 15, canvas.height - 15, 20, -PLAYER_HEALTH);
	DrawRect("red", 15, canvas.height - 15, 20, -player.health);

	// Gun name
	ctx.textAlign = "right";
	DrawText(items[player.gunID].name, "17px Impact", "white", canvas.width - 10, canvas.height - 12);
	ctx.textAlign = "center";
	
	// Ammo
	if (player.loaded > 0)
	{
		for (var i = 0; i < player.loaded; i++)
		{
			if (player.reload)
				DrawRect("grey", canvas.width - 15 - i*8 + ~~(i/40) * 320, canvas.height - 50 - ~~(i/40) * 20, 5, 15);
			else
				DrawRect("white", canvas.width - 15 - i*8 + ~~(i/40) * 320, canvas.height - 50 - ~~(i/40) * 20, 5, 15);
		}
	}
	else
	{
		if (!player.reload && items[player.gunID].mag != undefined)
		{
			ctx.textAlign = "right";
			DrawText("RELOAD", "17px Impact", "red", canvas.width - 10, canvas.height - 38);
			ctx.textAlign = "center";
		}
	}
}

// --- Draw death screen ---
function DrawDead ()
{
	// Text
	DrawText("Looks Like You're", "20px Impact", "darkred", canvas.width / 2, canvas.height / 2 - 40);
	DrawText("DEAD", "80px Impact", "red", canvas.width / 2, canvas.height / 2 + 30);

	// Home button
	pauseButtons[1].Draw();
}

// --- Draw pause menu ---
function DrawPause ()
{
	// Background
	ctx.globalAlpha = 0.6;
	DrawRect("black", 0, 0, canvas.width, canvas.height);
	ctx.globalAlpha = 1;

	// Banner
	DrawRect("black", 0, canvas.height / 2 - 55, canvas.width, 100);

	// Text
	DrawText("PAUSED", "50px Impact", "red", canvas.width / 2, canvas.height / 2);
	DrawText("Hit ESC To Continue", "18px Impact", "darkred", canvas.width / 2, canvas.height / 2 + 25);

	// Buttons
	for (var i = 0; i < pauseButtons.length; i++)
		pauseButtons[i].Draw();
}

// --- Draw main menu ---
function DrawMenu ()
{
	// Background
	DrawRect("black", 0, 0, canvas.width, canvas.height);

	// Text
	DrawText("[Name]", "60px Impact", "red", canvas.width/2, 150);

	// Buttons
	for (var i = 0; i < menuButtons.length; i++)
		menuButtons[i].Draw();
}

// --- Draw options menu ---
function DrawOptions ()
{
	// Background
	DrawRect("black", 0, 0, canvas.width, canvas.height);
	DrawRect("grey", 100, 100, canvas.width-200, canvas.height-200);
	DrawRect("black", 105, 105, canvas.width-210, canvas.height-210);

	// Text
	DrawText("Options", "30px Impact", "white", canvas.width/2, 150);
	DrawText("v1.3.2", "11px Ariel", "white", canvas.width/2 + 120, canvas.height/2 + 185);

	// Buttons
	for (var i = 0; i < optionButtons.length; i++)
		optionButtons[i].Draw();
}

// --- Sort objects into ZBuffer --- 
function AddToZBuffer(object)
{
	var objectAdded = false;
	var z = zbuffer.length;
	for (var i = 0; i < z; i++)
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

// --- Shoot blood particles outwards ---
function Bleed (x, y, dir, force, count)
{
	var totalNum = count * _BLOOD_INTENSITY;
	for (var i = 0; i < totalNum; i++)
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

// --- Shoot gun particles outwards ---
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

// =============== Button Functions ===============

function StartGame()
{
	// Reset variables
	mainMenu = false;
	paused = false;
	keysDown = [];

	// Resets all objects
	player = new Player(canvas.width/2, canvas.height/2, PLAYER_STARTING_GUN);
	bullets = [];
	zombies = [];
	lowParticles = [];
	highParticles = [];

	// Setup camera
	cam = new Camera();
	cam.target = player.pos;
}

function OpenMainMenu()
{
	mainMenu = true;
}

function OpenOptions()
{
	options = true;
}

function CloseOptions()
{
	options = false;
}

// ==================== EVENTS ====================

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
	mouseReleased = true;
});

// --- Mouse Input (pos) ---
canvas.addEventListener('mousemove', function(e) {
	mousePos =
	{
		x: e.clientX - canvas.getBoundingClientRect().left,
		y: e.clientY - canvas.getBoundingClientRect().top
	};
});

// ==================== ON LOAD ====================

// Starts game
Start();
setInterval(Update, 10);
