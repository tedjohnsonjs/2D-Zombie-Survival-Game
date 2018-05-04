
// ==================== VARIABLES ====================

// Constants
const PLAYER_HEALTH = 5;
const PLAYER_SPEED = 1;
const PLAYER_SIZE = 10;

const BULLET_SPEED = 10;
const BULLET_SIZE = 2;

const ZOMBIE_HEALTH = 3;
const ZOMBIE_SPEEDMAX = 0.6;
const ZOMBIE_SPEEDMIN = 0.4;
const ZOMBIE_SIZE = 10;

// Variables
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var keysDown = [];
var zbuffer = [];

// Objects
var player;
var bullets = [];
var zombies = [];
var lowParticles = [];
var highParticles = [];

// ==================== CLASSES ====================

// --- Player Class ---
function Player (_x, _y, _gunID, _helmetID, _armourID)
{
	this.x = _x;
	this.y = _y;

	this.upKey = 87;
	this.downKey = 83;
	this.leftKey = 65;
	this.rightKey = 68;
	this.shootKey = 87;
	this.useKey = 69;

	this.health = PLAYER_HEALTH;
	this.alive = true;
	this.hasControl = true;

	this.loaded = true;

	this.Update = function ()
	{
		if (this.alive)
		{
			// Checks health
			if (this.health <= 0)
				this.Death();

			// Control
			if (this.hasControl)
			{
				if (keysDown[this.upKey]) this.y -= PLAYER_SPEED
				if (keysDown[this.downKey]) this.y += PLAYER_SPEED;
				if (keysDown[this.leftKey]) this.x -= PLAYER_SPEED;
				if (keysDown[this.rightKey]) this.x += PLAYER_SPEED;

				if (keysDown[this.shootKey] && this.loaded == 0)
				{

				}
			}
		}

		// Adds to zbuffer
		var objectAdded = false;
		for (var i = 0; i < zbuffer.length; i++)
		{
			if (this.y >= zbuffer[i].y)
			{
				zbuffer.splice(i, 0, this);
				objectAdded = true;
				break;
			}
		}
		if (!objectAdded)
			zbuffer.push(this);
	}

	// Draws to frame
	this.Draw = function ()
	{
		if (this.alive)
		{
			ctx.beginPath();
			ctx.rect(this.x-PLAYER_SIZE/2, this.y-PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
			ctx.fillStyle = "pink";
			ctx.fill();
			ctx.beginPath();
			ctx.rect(this.x-PLAYER_SIZE/2, this.y, PLAYER_SIZE, PLAYER_SIZE);
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

// --- Zombie Class ---
function Zombie (_x, _y)
{
	this.x = _x;
	this.y = _y;

	this.health = ZOMBIE_HEALTH;
	this.speed = Math.random() * (ZOMBIE_SPEEDMAX - ZOMBIE_SPEEDMIN) + ZOMBIE_SPEEDMIN;

	this.Update = function ()
	{
		// Checks health
		if (this.health <= 0)
			this.Death();

		// Follow player
		var xDist = player.x - this.x;
		var yDist = player.y - this.y;
		if (xDist > 0)
		{
			var dir = Math.atan(yDist / xDist);
			this.x += Math.cos(dir) * this.speed;
			this.y += Math.sin(dir) * this.speed;
		}
		else if (xDist < 0)
		{
			var dir = Math.atan(yDist / xDist);
			this.x -= Math.cos(dir) * this.speed;
			this.y -= Math.sin(dir) * this.speed;
		}
		else
		{
			if (yDist > 0)
				this.y += this.speed;
			else
				this.y -= this.speed;
		}

		// Adds to zbuffer
		var objectAdded = false;
		var zbufferLength = zbuffer.length;
		for (var i = 0; i < zbufferLength; i++)
		{
			if (this.y <= zbuffer[i].y)
			{
				zbuffer.splice(i, 0, this);
				objectAdded = true;
				break;
			}
		}
		if (!objectAdded)
			zbuffer.push(this);
	}

	// Draws to frame
	this.Draw = function ()
	{
		ctx.beginPath();
		ctx.rect(this.x-ZOMBIE_SIZE/2, this.y-ZOMBIE_SIZE, ZOMBIE_SIZE, ZOMBIE_SIZE);
		ctx.fillStyle = "darkgreen";
		ctx.fill();
		ctx.beginPath();
		ctx.rect(this.x-ZOMBIE_SIZE/2, this.y, ZOMBIE_SIZE, ZOMBIE_SIZE);
		ctx.fillStyle = "brown";
		ctx.fill();
	}

	// Removes itself from list
	this.Death = function ()
	{

	}
}

// --- Bullet Class ---
function Bullet (_x, _y, _dir)
{
	this.x = _x;
	this.y = _y;
	this.dir = _dir; // 0 - 2*Math.PI

	this.Update = function ()
	{
		// Move


		// Destroy itself if outside boundaries
		if (this.y < 0 || this.y > canvas.height)
			this.Destroy();
	}

	// Draw to frame
	this.Draw = function ()
	{
		ctx.rect(this.x - BULLET_SIZE/2, this.y - BULLET_SIZE/2, BULLET_SIZE, BULLET_SIZE);
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
	this.x = _x;
	this.y = _y;
	this.xVel = _xVel;
	this.yVel = _yVel;
	this.size = _size;
	this.lifetime = _lifetime;
	this.colour = _colour;

	this.Update = function ()
	{
		// Move
		this.x += this._xVel;
		this.y += this._yVel;
	}

	// Draw to frame
	this.Draw = function ()
	{
		
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
	player = new Player(300, 500, 0, 0, 0);

	// debug zombies
	for (var i = 0; i < 20; i++)
		zombies.push(new Zombie(Math.random() * canvas.width, Math.random() * canvas.height));
}

// --- Main Loop ---
function Update ()
{
	zbuffer = [];

	player.Update();
	//for (var i = 0; i < bullets.length; i++) bullets[i].Update();
	for (var i = 0; i < zombies.length; i++) zombies[i].Update();
	//for (var i = 0; i < lowParticles.length; i++) lowParticles[i].Update();
	//for (var i = 0; i < highParticles.length; i++) highParticles[i].Update();

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
	for (var i = 0; i < bullets.length; i++) bullets[i].Draw();
	for (var i = 0; i < highParticles.length; i++) highParticles[i].Draw();
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

// ==================== ON LOAD ====================

// Starts game
Start();
setInterval(Update, 10);