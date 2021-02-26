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
    function Snake (scene, x, y, length, color)
    {
        this.headPosition = new Phaser.Geom.Point(x, y);
        this.body = scene.add.group();
        this.head = this.body.create(x, y, 'circle');
        this.color=color;
        console.log(x, y)
        this.head.setOrigin(0.5, 0.5).setDisplaySize(40, 30).setTint(this.color);
        this.speed = 100;
        this.length = length;
        this.growth = length;
        this.tail = new Phaser.Geom.Point(x, y);
    },

    move: function (foods, x, y)
    {
        this.headPosition.x = x;
        this.headPosition.y = y;
        foods.getChildren().forEach( (food) => {
            if (Math.abs(food.x - x) < 1 && Math.abs(food.y - y < 1)) {
                food.destroy();
                console.log('yum')
                this.growth += 10;
            }
        });
        //  Update the body segments and place the last coordinate into this.tail
        Phaser.Actions.ShiftPosition(this.body.getChildren(), this.headPosition.x, this.headPosition.y, 1, this.tail);
        return true;
    },

    grow: function ()
    {
        if (this.growth > 0) {
            this.growth -= 1;
            const newPart = this.body.create(this.tail.x, this.tail.y, 'circle');
            newPart.setOrigin(0.5, 0.5).setDisplaySize(30, 30).setTint(this.color);
        }

    },
    die: function () {
        this.body.destroy(true);
    }

});

  let Food = new Phaser.Class({

    Extends: Phaser.GameObjects.Image,

    initialize:

    function Food (scene, x, y)
    {
        Phaser.GameObjects.Image.call(this, scene)

        this.setTexture('food');
        this.setPosition(x, y);
        this.setOrigin(0);

        this.total = 0;

        scene.children.add(this);
    },

    eat: function ()
    {
        this.total++;

        var x = Phaser.Math.Between(100, 700);
        var y = Phaser.Math.Between(100, 500);

        this.setPosition(x, y);
    }

});
   
  function preload() {
    this.load.image('circle', 'assets/eye-white.png');
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
                        // console.log(snakes[id])
                        // player.setPosition(players[id].x, players[id].y);
                        snake.worm.move(self.foods, snakes[id].x, snakes[id].y);
                        snake.worm.grow();
                    }
                });
            });
        });        
        self.physics.add.overlap(self.snakes, self.foods, eatFood, null, this);
    }
   
  function update() {
      this.socket.emit('playerInput', { x: this.input.mousePointer.x,  y: this.input.mousePointer.y });
  }

  displaySnakes = (self, playerInfo) => {
    const snake = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'circle').setOrigin(0.5, 0.5).setDisplaySize(0, 0);
    snake.setTint(playerInfo.color);
    snake.playerId = playerInfo.playerId;
    snake.color = playerInfo.color;
    snake.worm = new Snake(self, playerInfo.x, playerInfo.y, playerInfo.length, playerInfo.color)
    self.snakes.add(snake);
  }
  displayFoods = (self, foodInfo) => {
    const food = self.physics.add.sprite(foodInfo.x, foodInfo.y, 'food').setOrigin(0.5, 0.5).setDisplaySize(25, 25);
    food.setTint('0x0ffff');
    food.id = foodInfo.foodId;
    food.x = foodInfo.x;
    food.y = foodInfo.y;
    // food.worm = new Food(self, x, y,);

    self.foods.add(food);
  }
  eatFood = (snake, food) => {
      console.log('yooo')
  }
