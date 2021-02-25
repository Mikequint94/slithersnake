var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
   
  var game = new Phaser.Game(config);
  let snake;
   
  function preload() {
    this.load.image('ship', 'assets/eye-white.png');
    this.load.image('circle','assets/circle.png');
    this.load.image('shadow', 'assets/white-shadow.png');
    this.load.image('background', 'assets/tile.png');

    this.load.image('eye-white', 'assets/eye-white.png');
    this.load.image('eye-black', 'assets/eye-black.png');

    this.load.image('food', 'assets/hex.png');
  }
   
    function create() {
        var self = this;
        this.socket = io();
        this.players = this.add.group();

        var Snake = new Phaser.Class({

            initialize:
    
            function Snake (scene, x, y, color)
            {
                this.headPosition = new Phaser.Geom.Point(x, y);
                this.body = scene.add.group();
                this.head = this.body.create(x, y, 'ship');
                this.color=color;
                this.head.setOrigin(0.5, 0.5).setDisplaySize(53, 40).setTint(this.color);
                this.speed = 100;
                this.growth = 50;
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
                    var newPart = this.body.create(this.tail.x, this.tail.y, 'ship');
                    newPart.setOrigin(0.5, 0.5).setDisplaySize(40, 40).setTint(this.color);
                }

            },
    
        });
        
        this.socket.on('currentPlayers', function (players) {
            console.log(players)
            Object.keys(players).forEach(function (id) {
                snake = new Snake(self, players[id].x, players[id].y, players[id].color);
                console.log(snake)
                displayPlayers(self, players[id], 'ship');
            });
            console.log(self.players.children.entries)
        });
        this.socket.on('newPlayer', function (playerInfo) {
            displayPlayers(self, playerInfo, 'ship');
          });
        this.socket.on('disconnect', function (playerId) {
            self.players.getChildren().forEach(function (player) {
                if (playerId === player.playerId) {
                    player.destroy();
                }
            });
        });
        this.socket.on('playerUpdates', function (players) {
            Object.keys(players).forEach(function (id) {
                self.players.getChildren().forEach(function (player) {
                    if (players[id].playerId === player.playerId) {
                        // player.setRotation(players[id].rotation);
                        // player.setPosition(players[id].x, players[id].y);
                        if (snake) {
                            snake.move(players[id].x, players[id].y);
                        }
                    }
                });
            });
        });        
    }
   
  function update() {
      if (snake) {
          snake.grow();
      }
      this.socket.emit('playerInput', { x: this.input.mousePointer.x,  y: this.input.mousePointer.y });
  }

  function displayPlayers(self, playerInfo, sprite) {
    const player = self.add.sprite(playerInfo.x, playerInfo.y, sprite).setOrigin(0.5, 0.5).setDisplaySize(0, 0);
    player.setTint(playerInfo.color);
    player.playerId = playerInfo.playerId;
    self.players.add(player);
  }
