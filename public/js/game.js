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
    function Snake (scene, x, y, length, color, socketId, isMe)
    {
        this.headPosition = new Phaser.Geom.Point(x, y);
        this.isMe = isMe;
        this.body = scene.physics.add.group();
        this.eyes = scene.add.group();
        this.head = this.body.create(x, y, 'circle');
        this.color=color;
        // this.scoreBoard = scene.scoreBoard;
        this.socket = scene.socket;
        this.head.setOrigin(0.5, 0.5).setDisplaySize((8 + length/15), 8 + length/15).setTint(this.color).setDepth(2);
        this.eye = this.eyes.create(x, y, 'eye');
        this.eyeTwo = this.eyes.create(x, y, 'eye');
        this.eye.setDisplaySize((8 + length/15) / 3.5, (8 + length/15) / 3.5).setDepth(3);
        this.eyeTwo.setDisplaySize((8 + length/15) / 3.5, (8 + length/15) / 3.5).setDepth(3);
        this.zooming=false;
        this.speed = 100;
        this.length = length;
        this.grown = 0;
        this.tail = new Phaser.Geom.Point(x, y);
        this.range = 7.5 + 0.025*this.length;
        this.socketId = socketId;
        this.zoomCount = 0;
        this.poopCount = 0;
    },

    move: function (foods, x, y, radians, rotation)
    {
        this.headPosition.x = x;
        this.headPosition.y = y;
        foods.getChildren().forEach( (food) => {
            if (Math.abs(food.x - x) < this.range && Math.abs(food.y - y) < this.range) {
                food.destroy();
                this.socket.emit('eatFood', food.id, this.socketId, this.length);
                this.changeSize(food.size);
            }
        });
        this.eye.x = x- (8 + this.length/15)/4*Math.cos(rotation);
        this.eye.y = y- (8 + this.length/15)/4*Math.sin(rotation);
        this.eyeTwo.x = x + (8 + this.length/15)/4*Math.cos(rotation);
        this.eyeTwo.y = y + (8 + this.length/15)/4*Math.sin(rotation);
        this.eye.setRotation(radians)
        this.eyeTwo.setRotation(radians)
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
            if (this.zooming) {
                newPart.setBlendMode(true)
            }
        } else if (this.grown > this.length) {
            this.grown -= 1;
            const tail = this.body.getChildren()[this.body.children.entries.length - 1]
            tail.destroy();
            this.poopCount ++;
            if (this.poopCount === 5) {
                this.socket.emit('zoomFood', tail.x, tail.y);
                this.poopCount = 0;
            }
        }

    },
    zoom: function (zooming)
    {
        if (this.length < 51 || !zooming && this.zooming) {
            this.socket.emit('zoomStop', this.socketId);
            this.zooming = false;
            this.body.getChildren().forEach( (part) => {
                part.setBlendMode(false)
            });
        } else if (zooming && !this.zooming) {
            this.socket.emit('zoomStart', this.socketId);
            this.zooming = true;
            this.body.getChildren().forEach( (part) => {
                part.setBlendMode(true)
            });
        } else if (zooming) {
            this.zoomCount += 1;
            if (this.zoomCount === 9) {
                this.zoomCount = 0;
                this.socket.emit('zoomShrink', this.socketId, this.length - 1);
                this.changeSize(-1);
            }
        }
    },
    changeSize: function (sizeChange)
    {
        this.length += sizeChange;
        this.range = 7.5 + 0.025*this.length;
        this.body.getChildren().forEach( (part) => {
            part.setDisplaySize(8 + this.length/15, 8 + this.length/15);
        });
        this.eye.setDisplaySize((8 + this.length/15) / 3.5, (8 + this.length/15) / 3.5);
        this.eyeTwo.setDisplaySize((8 + this.length/15) / 3.5, (8 + this.length/15) / 3.5);
    },
    updateInfo: function (length, zooming)
    {
        this.length = length;
        if (this.length < 51 || !zooming && this.zooming) {
            this.zooming = false;
            this.body.getChildren().forEach( (part) => {
                part.setBlendMode(false)
            });
        } else if (zooming && !this.zooming) {
            this.zooming = true;
            this.body.getChildren().forEach( (part) => {
                part.setBlendMode(true)
            });
        }
    },
    die: function () {
        this.body.destroy(true);
        this.eyes.destroy(true);
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
        this.scoreBoard = this.add.text(520, 20, '',  {align: 'right'});
        self.detector = null;
        self.socketId = null;
        self.living = true;
        console.log('startup')

        function collision () {
            if (self.detector && self.detector.active) {
                self.detector.destroy();
            }
            if (self.living) {
                self.living = false;
                console.log(`${this.playerId} has doyed`);
                let snakeMeat = [];
                self.snakes.getChildren().forEach( (snake) => {
                    if (this.playerId === snake.playerId) {
                        for (let i = 15; i < snake.worm.body.children.size - 15; i += 15) {
                            snakeMeat.push({x: snake.worm.body.children.entries[i].x, y: snake.worm.body.children.entries[i].y});
                        }
                    }
                });
                self.socket.emit('snakeDied', this.playerId, snakeMeat);
            }
        }

        function addCollisionDetectors () {
            if (!self.living) {return;}
            if (self.detector && self.detector.active) {
                console.log(self.detector);
                self.detector.destroy();
            }
            console.log('adding detectors')
            const mySnake = self.snakes.children.entries.filter(snake => snake.playerId === self.socketId)[0];
            const mySnakeHead = mySnake.worm.body.children.entries[0];
            const otherSnakes = self.snakes.children.entries.filter(snake => snake.playerId !== self.socketId);
            if (otherSnakes) {
                const otherSnakesBodies = otherSnakes.map(snake => snake.worm.body);
                console.log(mySnakeHead, otherSnakesBodies)
                self.detector = self.physics.add.overlap(mySnakeHead, otherSnakesBodies, collision.bind({playerId: mySnake.playerId}), null, self);
                console.log(self.detector)
            }            
        }
        
        this.socket.on('currentSnakes', (snakes, socketId) => {
            console.log('snakes: ', snakes);
            self.socketId = socketId;
            Object.keys(snakes).forEach( (id) => {
                displaySnakes(self, snakes[id], socketId === id);
            });
            addCollisionDetectors();
        });
        this.socket.on('currentFoods', (foods) => {
            console.log('foods: ', foods)
            Object.keys(foods).forEach( (id) => {
                displayFoods(self, foods[id]);
            });
        });
        this.socket.on('newFood', (foodInfo) => {
            console.log('new food');
            displayFoods(self, foodInfo);
          });
        this.socket.on('newPlayer', (playerInfo) => {
            displaySnakes(self, playerInfo, false);
            addCollisionDetectors();
        });
        this.socket.on('scores', (snakes) => {
            let sorted = Object.entries(snakes).sort((a,b) => a.length-b.length);
            sorted = sorted.map(array => `${array[0]}: ${array[1].length}`);
            this.scoreBoard.setText(sorted);
        });
        this.socket.on('disconnect', (playerId) => {
            self.snakes.getChildren().forEach( (snake) => {
                if (playerId === snake.playerId) {
                    snake.worm.die();
                    snake.destroy();
                }
            });
            if (self.detector) {
                self.detector.active = false;
            }
            addCollisionDetectors();
        });
        this.socket.on('snakeUpdates', (snakes) => {
            Object.keys(snakes).forEach( (id) => {
                self.snakes.getChildren().forEach( (snake) => {
                    if (snakes[id].playerId === snake.playerId) {
                        if (!snake.worm.isMe) {
                            snake.worm.updateInfo(snakes[id].length, snakes[id].zooming);
                        }
                        snake.worm.move(self.foods, snakes[id].x, snakes[id].y, snakes[id].radians, snakes[id].rotation);
                        snake.worm.grow();
                        if (snake.worm.isMe && self.living) {
                            snake.worm.zoom(self.input.mousePointer.isDown);
                        }
                    }
                });
            });
        });        
    }
   
  function update() {
      if (this.living) {
          this.socket.emit('playerInput', { x: this.input.mousePointer.x,  y: this.input.mousePointer.y, zoom: this.input.mousePointer.isDown});
      }
  }

  displaySnakes = (self, playerInfo, isMe) => {
    const snake = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'circle').setOrigin(0.5, 0.5).setDisplaySize(0, 0);
    snake.setTint(playerInfo.color);
    snake.playerId = playerInfo.playerId;
    snake.color = playerInfo.color;
    snake.worm = new Snake(self, playerInfo.x, playerInfo.y, playerInfo.length, playerInfo.color, playerInfo.playerId, isMe)
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
