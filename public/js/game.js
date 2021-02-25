const config = {
    type: Phaser.AUTO,
    parent: 'slither-io',
    width: 800,
    height: 600,
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
   
  const game = new Phaser.Game(config);
  let mySnake;
  console.log('whoo')

  var Snake = new Phaser.Class({
    initialize:
    function Snake (scene, x, y, length, color)
    {
        this.headPosition = new Phaser.Geom.Point(x, y);
        this.body = scene.add.group();
        this.head = this.body.create(x, y, 'circle');
        this.color=color;
        console.log(x, y)
        this.head.setOrigin(0.5, 0.5).setDisplaySize(53, 40).setTint(this.color);
        this.speed = 100;
        this.length = length;
        this.growth = length;
        this.tail = new Phaser.Geom.Point(x, y);
    },

    move: function (x, y)
    {
        this.headPosition.x = x;
        this.headPosition.y = y;
        //  Update the body segments and place the last coordinate into this.tail
        Phaser.Actions.ShiftPosition(this.body.getChildren(), this.headPosition.x, this.headPosition.y, 1, this.tail);
        return true;
    },

    grow: function ()
    {
        if (this.growth > 0) {
            this.growth -= 1;
            const newPart = this.body.create(this.tail.x, this.tail.y, 'circle');
            newPart.setOrigin(0.5, 0.5).setDisplaySize(40, 40).setTint(this.color);
        }

    },
    die: function () {
        this.body.destroy(true);
    }

});
   
  function preload() {
    this.load.image('circle', 'assets/eye-white.png');
  }
   
    function create() {
        const self = this;
        this.socket = io();
        this.snakes = this.add.group();
        
        this.socket.on('currentSnakes', (snakes) => {
            console.log('snakes: ', snakes)
            Object.keys(snakes).forEach( (id) => {
                displaySnakes(self, snakes[id]);
            });
        });
        // this.socket.on('mySnake', (snake) => {
        //     if (!mySnake) {
        //         console.log('my snake: ', snake);
        //         mySnake = new Snake(self, snake.x, snake.y, snake.length, snake.color);
        //     }
        // });
        this.socket.on('newPlayer', (playerInfo) => {
            displaySnakes(self, playerInfo);
          });
        this.socket.on('disconnect', (playerId) => {
            self.snakes.getChildren().forEach( (snake) => {
                if (playerId === snake.playerId) {
                    snake.worm.die();
                    snake.destroy();
                }
            });
        });
        this.socket.on('snakeUpdates', (snakes) => {
            Object.keys(snakes).forEach( (id) => {
                self.snakes.getChildren().forEach( (snake) => {
                    if (snakes[id].playerId === snake.playerId) {
                        // console.log(snakes[id])
                        // player.setPosition(players[id].x, players[id].y);
                        snake.worm.move(snakes[id].x, snakes[id].y);
                        snake.worm.grow();
                    }
                });
            });
        });        
    }
   
  function update() {
      this.socket.emit('playerInput', { x: this.input.mousePointer.x,  y: this.input.mousePointer.y });
  }

  displaySnakes = (self, playerInfo) => {
    const snake = self.add.sprite(playerInfo.x, playerInfo.y, 'circle').setOrigin(0.5, 0.5).setDisplaySize(0, 0);
    snake.setTint(playerInfo.color);
    snake.playerId = playerInfo.playerId;
    snake.color = playerInfo.color;
    snake.worm = new Snake(self, playerInfo.x, playerInfo.y, playerInfo.length, playerInfo.color)
    self.snakes.add(snake);
  }
