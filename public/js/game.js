const config = {
    type: Phaser.AUTO,
    parent: 'slither-io',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
   
  const game = new Phaser.Game(config);

  let Snake = new Phaser.Class({
    initialize:
    function Snake (scene, x, y, length, color, socketId)
    {
        this.headPosition = new Phaser.Geom.Point(x, y);
        this.body = scene.add.group();
        this.eyes = scene.add.group();
        this.head = this.body.create(x, y, 'circle');
        this.color=color;
        this.head.setOrigin(0.5, 0.5).setDisplaySize((8 + length/15), 8 + length/15).setTint(this.color).setDepth(2);
        this.eyeWhite = this.eyes.create(x, y, 'eye');
        this.eyeWhiteTwo = this.eyes.create(x, y, 'eye');
        this.eyeWhite.setDisplaySize((8 + length/15) / 3.5, (8 + length/15) / 3.5).setDepth(3);
        this.eyeWhiteTwo.setDisplaySize((8 + length/15) / 3.5, (8 + length/15) / 3.5).setDepth(3);

        this.speed = 100;
        this.length = length;
        this.grown = 0;
        this.tail = new Phaser.Geom.Point(x, y);
        this.range = 7.5 + 0.025*this.length;
        this.socketId = socketId;
    },

    move: function (foods, x, y, rotation, socket, input)
    {
        this.headPosition.x = x;
        this.headPosition.y = y;
        foods.getChildren().forEach( (food) => {
            if (Math.abs(food.x - x) < this.range && Math.abs(food.y - y) < this.range) {
                food.destroy();
                this.length += food.size;
                this.range = 7.5 + 0.025*this.length;
                this.body.getChildren().forEach( (part) => {
                    part.setDisplaySize(8 + this.length/15, 8 + this.length/15);
                });
                this.eyeWhite.setDisplaySize((8 + this.length/15) / 3.5, (8 + this.length/15) / 3.5);
                this.eyeWhiteTwo.setDisplaySize((8 + this.length/15) / 3.5, (8 + this.length/15) / 3.5);
                socket.emit('eatFood', food.id, this.socketId, this.length);
            }
        });
        this.eyeWhite.x = x- (8 + this.length/15)/4*Math.cos(rotation);
        this.eyeWhite.y = y- (8 + this.length/15)/4*Math.sin(rotation);
        this.eyeWhiteTwo.x = x + (8 + this.length/15)/4*Math.cos(rotation);
        this.eyeWhiteTwo.y = y + (8 + this.length/15)/4*Math.sin(rotation);
        
        let radians = Math.atan2(input.mousePointer.x - x,input.mousePointer.y - y);
        radians = radians > 0 ? Math.PI-radians : -Math.PI-radians;
        this.eyeWhite.setRotation(radians)
        this.eyeWhiteTwo.setRotation(radians)
        //  Update the body segments and place the last coordinate into this.tail
        Phaser.Actions.ShiftPosition(this.body.getChildren(), this.headPosition.x, this.headPosition.y, 1, this.tail);
        return true;
    },

    grow: function ()
    {
        if (this.grown < this.length) {
            this.grown += 1;
            const newPart = this.body.create(this.tail.x, this.tail.y, 'circle');
            newPart.setOrigin(0.5, 0.5).setDisplaySize(8 + this.length/15, 8 + this.length/15).setTint(this.color).setDepth(1);
        }

    },
    die: function () {
        this.body.destroy(true);
    }
});
   
  function preload() {
    this.load.image('circle', 'assets/eye-white.png');
    this.load.image('head', 'assets/snakePart.png');
    this.load.image('eye', 'assets/eye.png');
    this.load.image('food', 'assets/food.png');
  }
   
    function create() {
        const self = this;
        this.socket = io();
        this.snakes = this.physics.add.group();
        this.foods = this.physics.add.group();
        
        this.socket.on('currentSnakes', (snakes) => {
            console.log('snakes: ', snakes)
            Object.keys(snakes).forEach( (id) => {
                displaySnakes(self, snakes[id]);
            });
        });
        this.socket.on('currentFoods', (foods) => {
            console.log('foods: ', foods)
            Object.keys(foods).forEach( (id) => {
                displayFoods(self, foods[id]);
            });
        });
        // this.socket.on('mySnake', (snake) => {
        //     if (!mySnake) {
        //         console.log('my snake: ', snake);
        //         mySnake = new Snake(self, snake.x, snake.y, snake.length, snake.color);
        //     }
        // });
        this.socket.on('newFood', (foodInfo) => {
            console.log('new food');
            displayFoods(self, foodInfo);
          });
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
                        snake.worm.move(self.foods, snakes[id].x, snakes[id].y, snakes[id].rotation, self.socket, self.input);
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
    const snake = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'circle').setOrigin(0.5, 0.5).setDisplaySize(0, 0);
    snake.setTint(playerInfo.color);
    snake.playerId = playerInfo.playerId;
    snake.color = playerInfo.color;
    snake.worm = new Snake(self, playerInfo.x, playerInfo.y, playerInfo.length, playerInfo.color, playerInfo.playerId)
    self.snakes.add(snake);
  }
  displayFoods = (self, foodInfo) => {
    const food = self.physics.add.sprite(foodInfo.x, foodInfo.y, 'food').setOrigin(0.5, 0.5).setDisplaySize(foodInfo.size*2, foodInfo.size*2);
    food.setTint('0x0ffff');
    food.id = foodInfo.foodId;
    food.x = foodInfo.x;
    food.y = foodInfo.y;
    food.size = foodInfo.size;
    self.foods.add(food);
  }
