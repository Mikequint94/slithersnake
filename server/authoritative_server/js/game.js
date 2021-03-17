const snakes = {};
const foods = {};
let foodId = 0;
let updateCount = 0;

const config = {
    type: Phaser.HEADLESS,
    parent: 'slither-io',
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    },
    autoFocus: false
  };
   
  function preload() {
    this.load.image('circle', 'assets/eye-white.png');
  }
   
  function create() {
    const self = this;
    this.snakes = this.physics.add.group();
    io.on('connection', (socket) => {
      console.log(`${socket.id} connected`);
      socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`);
        removeSnake(self, socket.id);
        delete snakes[socket.id];
        // emit a message to all players to remove this player
        io.emit('disconnect', socket.id);
      });
      // when a player moves, update the player data
      socket.on('playerInput', (input) => {
        snakes[socket.id].input = input;
      });
      socket.on('zoomFood', (x, y) => {
        foodId++;
        foods[foodId] = {foodId, x, y, size: 4};
        io.emit('newFood', foods[foodId]);
      });
      socket.on('eatFood', (foodId, socketId, length) => {
        delete foods[foodId];
        // console.log(snakes, socketId)
        snakes[socketId].length = length;
      });
      socket.on('snakeDied', (socketId, snakeMeat) => {
        removeSnake(self, socketId);
        delete snakes[socketId];
        // emit a message to all players to remove this player
        io.emit('disconnect', socketId);
        // console.log(snakeMeat)
        snakeMeat.forEach(meat => {
          foodId++;
          let x = Phaser.Math.Between(meat.x-5, meat.x+5);
          let y = Phaser.Math.Between(meat.y-5, meat.y+5);
          let size = Phaser.Math.Between(12, 18);
          foods[foodId] = {foodId, x, y, size};
          io.emit('newFood', foods[foodId]);
        })
      });
      socket.on('zoomShrink', (socketId, length) => {
        snakes[socketId].length = length;
      });
      socket.on('zoomStart', (socketId) => {
        snakes[socketId].zooming = true;
      });
      socket.on('zoomStop', (socketId) => {
        snakes[socketId].zooming = false;
      });
      // create a new snake and add it to our snakes object
      snakes[socket.id] = {
        rotation: 0,
        radians: 0,
        x: Math.floor(Math.random() * 500) + 150,
        y: Math.floor(Math.random() * 300) + 150,
        playerId: socket.id,
        color: Math.random() * 0xffffff,
        length: 60,
        zooming: false,
        input: {}
      };
      // add snake to server
      addSnake(self, snakes[socket.id]);
      // send the snakes object to the new player
      // console.log('sending my snake')
      // socket.emit('mySnake', snakes[socket.id]);
      socket.emit('currentSnakes', snakes, socket.id);
      socket.emit('currentFoods', foods);
      io.emit('scores', snakes);
      // update all other players of the new player
      socket.broadcast.emit('newPlayer', snakes[socket.id]);
      // console.log(snakes)
    });
    
  }
   
  function update() {
    updateCount++;
    if (updateCount === 50) {
      updateCount = 0;
      if (Math.random() < 0.3 && Object.keys(foods).length < 15) {
        let x = Phaser.Math.Between(30, 770);
        let y = Phaser.Math.Between(30, 570);
        let size = Phaser.Math.Between(4, 20);
        foodId++;
        foods[foodId] = {foodId, x, y, size};
        io.emit('newFood', foods[foodId]);
      }
      io.emit('scores', snakes);
    }
    this.snakes.getChildren().forEach((player) => {
      const input = snakes[player.playerId].input;
      const speed = input.zoom && snakes[player.playerId].length > 51 ? 120 : 70;
      let radians = Math.atan2(input.x-snakes[player.playerId].x,input.y-snakes[player.playerId].y);
      if (radians > 0) {
          radians = Math.PI-radians;
      } else {
          radians = -Math.PI-radians;
      }
      const dif = snakes[player.playerId].rotation- radians;
      const turnRadius = 0.078*Math.exp(-.00168 * snakes[player.playerId].length);
      //decide whether rotating left or right will angle the head towards
      if (dif < 0 && dif > -Math.PI || dif > Math.PI) {
        player.rotation = snakes[player.playerId].rotation + turnRadius; 
      } else if (dif > 0 && dif < Math.PI || dif < -Math.PI) {
        player.rotation = snakes[player.playerId].rotation - turnRadius;
      }

      this.physics.velocityFromRotation(player.rotation - Math.PI/2, speed, player.body.velocity);

      snakes[player.playerId].x = player.x;
      snakes[player.playerId].y = player.y;
      snakes[player.playerId].rotation = player.rotation;
      snakes[player.playerId].radians = radians;
    });
    io.emit('snakeUpdates', snakes);

  }
  addSnake = (self, playerInfo) => {
    const snake = self.physics.add.image(playerInfo.x, playerInfo.y, 'circle')
    snake.playerId = playerInfo.playerId;
    self.snakes.add(snake);
  }
  
  removeSnake = (self, playerId) => {
    self.snakes.getChildren().forEach((snake) => {
      if (playerId === snake.playerId) {
        snake.destroy();
      }
    });
  }
  const game = new Phaser.Game(config);

  window.gameLoaded();
