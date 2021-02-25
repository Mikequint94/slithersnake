const snakes = {};

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
        // console.log(snakes)
        // emit a message to all players to remove this player
        io.emit('disconnect', socket.id);
      });
      // when a player moves, update the player data
      socket.on('playerInput', (inputData) => {
        handlePlayerInput(self, socket.id, inputData);
      });
      // create a new snake and add it to our snakes object
      snakes[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 500) + 150,
        y: Math.floor(Math.random() * 300) + 150,
        playerId: socket.id,
        color: Math.random() * 0xffffff,
        length: Math.random()*100 + 50,
        input: {
          // left: false,
        }
      };
      // add snake to server
      addSnake(self, snakes[socket.id]);
      // send the snakes object to the new player
      console.log('sending my snake')
      socket.emit('mySnake', snakes[socket.id]);
      socket.emit('currentSnakes', snakes);
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
  }

  handlePlayerInput =(self, playerId, input) => {
    self.snakes.getChildren().forEach((snake) => {
      if (playerId === snake.playerId) {
        snakes[snake.playerId].input = input;
      }
    });
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
