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
   
  preload = () => {
    this.load.image('circle', 'assets/circle.png');
  }
   
  create = () => {
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
      socket.on('playerInput', (inputData) => {
        handlePlayerInput(self, socket.id, inputData);
      });
      // create a new player and add it to our players object
      players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 500) + 150,
        y: Math.floor(Math.random() * 300) + 150,
        playerId: socket.id,
        color: Math.random() * 0xffffff,
        input: {
          left: false,
          right: false,
        }
      };
      // add player to server
      addPlayer(self, players[socket.id]);
      // send the players object to the new player
      socket.emit('currentPlayers', players);
      // update all other players of the new player
      socket.broadcast.emit('newPlayer', players[socket.id]);
      // this.input.on('pointermove', (pointer) => {
      //   this.physics.moveToObject(self, pointer, 240);
      // }, this);
    });
    
  }
   
  function update() {
    this.players.getChildren().forEach((player) => {
      const input = players[player.playerId].input;
  
      var angle = (180*Math.atan2(input.x-players[player.playerId].x,input.y-players[player.playerId].y)/Math.PI);
      if (angle > 0) {
          angle = 180-angle;
      }
      else {
          angle = -180-angle;
      }
      angle = (angle*0.01745)
      // console.log(player)
      var dif = players[player.playerId].rotation- angle;
      // this.head.body.setZeroRotation();
      //decide whether rotating left or right will angle the head towards
      if (dif < 0 && dif > -180*0.01745 || dif > 180*0.01745) {
        player.rotation = players[player.playerId].rotation + 0.03; 
      } else if (dif > 0 && dif < 180*0.01745 || dif < -180*0.01745) {
        player.rotation = players[player.playerId].rotation - 0.03;
      }
      
      // console.log(player.rotation)
      this.physics.velocityFromRotation(player.rotation - Math.PI/2, 100, player.body.velocity);

      players[player.playerId].x = player.x;
      players[player.playerId].y = player.y;
      players[player.playerId].rotation = player.rotation;
    });
    io.emit('playerUpdates', players);
  }

  handlePlayerInput =(self, playerId, input) => {
    self.players.getChildren().forEach((player) => {
      if (playerId === player.playerId) {
        players[player.playerId].input = input;
      }
    });
  }

  addSnake = (self, playerInfo) => {
    const snake = self.physics.add.image(playerInfo.x, playerInfo.y, 'circle').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
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
