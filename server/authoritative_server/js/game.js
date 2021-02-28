const snakes = {};
const foods = {};
let foodId = 0;

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
    // maybe dont need group, only ever ONE snake per player server
    // ^ could simplify shiz
    this.snakes = this.physics.add.group();
    io.on('connection', (socket) => {
      console.log(`${socket.id} connected`);
      socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`);
        removeSnake(self, socket.id);
        delete snakes[socket.id];
        // console.log(snakes)
        // emit a message to all players to remove this player
        io.emit('disconnect', socket.id);
      });
      // when a player moves, update the player data
      socket.on('playerInput', (input) => {
        snakes[socket.id].input = input;
      });
      socket.on('eatFood', (foodId, socketId, length) => {
        delete foods[foodId];
        console.log(snakes, socketId)
        snakes[socketId].length = length;
        console.log(foodId, foods)
      });
      // create a new snake and add it to our snakes object
      snakes[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 500) + 150,
        y: Math.floor(Math.random() * 300) + 150,
        playerId: socket.id,
        color: Math.random() * 0xffffff,
        length: 100,
        input: {}
      };
      // add snake to server
      addSnake(self, snakes[socket.id]);
      // send the snakes object to the new player
      // console.log('sending my snake')
      // socket.emit('mySnake', snakes[socket.id]);
      socket.emit('currentSnakes', snakes);
      socket.emit('currentFoods', foods);
      // update all other players of the new player
      socket.broadcast.emit('newPlayer', snakes[socket.id]);
      // console.log(snakes)
    });
    
  }
   
  function update() {
    this.snakes.getChildren().forEach((player) => {
      const input = snakes[player.playerId].input;
  
      let radians = Math.atan2(input.x-snakes[player.playerId].x,input.y-snakes[player.playerId].y);
      if (radians > 0) {
          radians = Math.PI-radians;
      } else {
          radians = -Math.PI-radians;
      }
      const dif = snakes[player.playerId].rotation- radians;
      //decide whether rotating left or right will angle the head towards
      if (dif < 0 && dif > -Math.PI || dif > Math.PI) {
        player.rotation = snakes[player.playerId].rotation + 0.03; 
      } else if (dif > 0 && dif < Math.PI || dif < -Math.PI) {
        player.rotation = snakes[player.playerId].rotation - 0.03;
      }
      
      this.physics.velocityFromRotation(player.rotation - Math.PI/2, 100, player.body.velocity);

      snakes[player.playerId].x = player.x;
      snakes[player.playerId].y = player.y;
      snakes[player.playerId].rotation = player.rotation;
    });
    io.emit('snakeUpdates', snakes);

    if (Math.random() < 0.003 && Object.keys(foods).length < 15) {
      let x = Phaser.Math.Between(30, 770);
      let y = Phaser.Math.Between(30, 570);
      let size = Phaser.Math.Between(4, 20);
      foodId++;
      foods[foodId] = {foodId, x, y, size};
      io.emit('newFood', foods[foodId]);
    }
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
