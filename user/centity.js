
//centity.js

/*
 *  This class is for the main player and his controls.
 *  It is actually a singleton but to my knowledge implementing it with
 *  prototyping is faster. Just DON'T make another cEntity since there is 
 *  no reason. The aim() method actually refers to the singleton character
 *  rather than its own instance for special reasons.
 */
var cEntity = function(pos){
  //should only have y component for testing ceiling collision
  this.thickness = new THREE.Vector3(0,PLAYER_HEIGHT,0);
  pos.y = this.thickness.y + 5;
  this.position = pos;
  this.pointed = new THREE.Vector3();
  this.pointed.copy(pointed);

  this.stepFoot = BASE_STEP_FOOT;
  this.speed = BASE_SPEED;

  this.grounded = false;
  this.jumping = false;

  this.air_o = 0;
  this.air_v =  0;
  this.start_t = -1;

  this.weapon = null;
  this.health = 100;
  this.respawn_time = 0;
  this.dead = false;
  //to stop from firing too fast
  var curr_time = new Date().getTime() + 3000;

  this.last_shot = curr_time;
  this.weapon_index = 0;

  this.last_pressed_r = curr_time;
  this.last_pressed_z = curr_time;

}

cEntity.prototype = {

  constructor: cEntity,

  act: function (){
    this.move();
  },
  
  aim: function (e){
    if(character.dead)
      return;

    var movementX = e.movementX ||
    e.mozMovementX          ||
    e.webkitMovementX       ||
    0;

    var movementY = e.movementY ||
    e.mozMovementY      ||
    e.webkitMovementY   ||
    0;


    character.pointed.applyAxisAngle (up,-mouseSensitivity*movementX);
    left.x = character.pointed.z;
    left.z = (-1) * character.pointed.x;
    left.normalize();
    character.pointed.applyAxisAngle (left,mouseSensitivity*movementY);
    camera.lookAt(tmpVec.addVectors(camera.position, character.pointed));
  },

  shoot: function (){

    var curr_time = new Date().getTime();
    if(curr_time - this.last_shot < this.weapon.duration){
      return;
    }else{
      this.last_shot = curr_time;
    }

    this.weapon.animate();

    var end_vec = new THREE.Vector3(),
        start_Vec = new THREE.Vector3();
    calcVec.addVectors(this.position, this.thickness);
    start_Vec.copy(calcVec);
    end_vec.copy(this.pointed);
    end_vec.multiplyScalar(this.weapon.range);
    end_vec.add(calcVec);    
    


    if(this.weapon.name == "pistol" || this.weapon.name == "fist"){

      var ray_hit = this.rayShoot(start_Vec, end_vec, this.pointed);
      //check the players to see if we've hit any
      for(var p in players){
        calcVec.copy(start_Vec);
        var pt = players[p].rayDetect(calcVec, this.pointed);
        if(pt != null && pt.len <= ray_hit.len){
            //shot someone

            //eventually this should be server side since this is easily hacked 
            console.log("struck a player");

            socket.emit('damage', {
              hash : pt.cw.id,
              amount : 20
            });    
        }
      }

      shots.add([start_Vec, ray_hit.end], 0x222222, 8);

    }else if(this.weapon.name == "shotgun"){
      //make shotgun shorter range


      var left_ray = new THREE.Vector3(),
          middle_ray = new THREE.Vector3(),
          right_ray = new THREE.Vector3(),
          left_end = new THREE.Vector3(),
          right_end = new THREE.Vector3();
      
      left_ray.copy(this.pointed);
      middle_ray.copy(this.pointed);
      right_ray.copy(this.pointed);

      left_ray.applyAxisAngle(up, 0.075);
      left_end.copy(left_ray);
      left_end.multiplyScalar(this.weapon.range);
      left_end.add(calcVec);   

      right_ray.applyAxisAngle(up, -0.075);
      right_end.copy(right_ray);
      right_end.multiplyScalar(this.weapon.range);
      right_end.add(calcVec);   
      

      var ray_hit = this.rayShoot(start_Vec, end_vec, this.pointed),
          left_ray_hit = this.rayShoot(start_Vec, left_end, left_ray),
          right_ray_hit = this.rayShoot(start_Vec, right_end, right_ray);
      
      //array of DEATH!!!
      var hashes = [];

      //find min dist here
      for(var p in players){
        if(!players[p].alive)
          return;

        calcVec.copy(start_Vec);
        var pt = players[p].rayDetect(calcVec, middle_ray);
        if(pt != null && pt.len <= ray_hit.len && hashes.indexOf(pt.cw.id) == -1){
          hashes.push(pt.cw.id);      
        }

        calcVec.copy(start_Vec);
        var pt = players[p].rayDetect(calcVec, left_ray);
        if(pt != null && pt.len <= left_ray_hit.len && hashes.indexOf(pt.cw.id) == -1){
          hashes.push(pt.cw.id);        
        }

        calcVec.copy(start_Vec);
        var pt = players[p].rayDetect(calcVec, right_ray);
        if(pt != null && pt.len <= right_ray_hit.len && hashes.indexOf(pt.cw.id) == -1){
          hashes.push(pt.cw.id);           
        }
      }

      for(var h in hashes){
        console.log("struck a player");
        socket.emit('damage', {
          hash      : hashes[h],
          attacker  : p_hash,
          amount    : 40
        }); 
      }

      //change 58 to 8 when not testing
      shots.add([start_Vec, ray_hit.end], 0x222222, 8);
      shots.add([start_Vec, left_ray_hit.end], 0x222222, 8);
      shots.add([start_Vec, right_ray_hit.end], 0x222222, 8);

    }

  },

  rayShoot: function(start_Vec, end_vec, pointer){



    //this must detect the first wall that this ray hits
    //need to do floors and ceilings as well in a later loop    

    var wxStart,wxEnd,wzStart,wzEnd,t = 2*sqThick,

    wxStart = start_Vec.x;
    wxEnd = end_vec.x;
    wzStart = start_Vec.z;
    wzEnd = end_vec.z;

    if(wxStart >= wxEnd){
      wxStart = (wxStart - wxStart % t) + t;
      wxEnd = (wxEnd - wxEnd % t) - t;
    }else{
      wxStart = (wxStart - wxStart % t) - t;
      wxEnd = (wxEnd - wxEnd % t) + t;
    }

    if(wzStart >= wzEnd){
      wzStart = (wzStart - wzStart % t) + t;
      wzEnd = (wzEnd - wzEnd % t) - t;
    }else{
      wzStart = (wzStart - wzStart % t) - t;
      wzEnd = (wzEnd - wzEnd % t) + t;
    }

    wxEnd = (wxEnd > this.weapon.range) ? this.weapon.range : (wxEnd < -this.weapon.range) ? -this.weapon.range : wxEnd;
    wzEnd = (wzEnd > this.weapon.range) ? this.weapon.range : (wzEnd < -this.weapon.range) ? -this.weapon.range : wzEnd;

    

    /*  
     *  I tried to make this next series of control statements as simple as 
     *  possible. Of course there's a million other ways of doing this that are shorter, 
     *  but I didn't want to make it confusing. Also this God awful language combined with
     *  the unpredictable three.js library forced me to add ugly, odd looking code I feel
     *  ashamed as a programmer for writing.
     */
     var pt, min_dist = this.weapon.range, min_wall = null, tmp_v = new THREE.Vector3();

     if(wxStart >= wxEnd){
      if(wzStart >= wzEnd){

        for(var j=wxStart;j>=wxEnd;j-=t){
          for(var k=wzStart;k>=wzEnd;k-=t){
            for(var i in boundaries[j/t + 11][k/t + 11]){
              calcVec.copy(start_Vec);
              pt = boundaries[j/t + 11][k/t + 11][i].rayDetect(calcVec, pointer);
              if(pt != null && pt.len <= min_dist){
                min_dist = pt.len;
                end_vec.copy(pt.spot);
                
              }
            }
          }
        }

      }else{

        for(var j=wxStart;j>=wxEnd;j-=t){
          for(var k=wzStart;k<=wzEnd;k+=t){
            for(var i in boundaries[j/t + 11][k/t + 11]){
              calcVec.copy(start_Vec);
              pt = boundaries[j/t + 11][k/t + 11][i].rayDetect(calcVec, pointer);
              if(pt != null && pt.len <= min_dist){
                min_dist = pt.len;
                end_vec.copy(pt.spot);
                
              }

            }
          }
        }

      }
    }else{
      if(wzStart >= wzEnd){

        for(var j=wxStart;j<=wxEnd;j+=t){
          for(var k=wzStart;k>=wzEnd;k-=t){
            for(var i in boundaries[j/t + 11][k/t + 11]){
              calcVec.copy(start_Vec);
              pt = boundaries[j/t + 11][k/t + 11][i].rayDetect(calcVec, pointer);
              if(pt != null && pt.len <= min_dist){
                min_dist = pt.len;
                end_vec.copy(pt.spot);
                
              }
              
            }
          }
        }

      }else{

        for(var j=wxStart;j<=wxEnd;j+=t){
          for(var k=wzStart;k<=wzEnd;k+=t){
            for(var i in boundaries[j/t + 11][k/t + 11]){
              calcVec.copy(start_Vec);
              pt = boundaries[j/t + 11][k/t + 11][i].rayDetect(calcVec, pointer);
              if(pt != null && pt.len <= min_dist){
                min_dist = pt.len;
                end_vec.copy(pt.spot);
                
              }

            }
          }
        }

      }
    }

    //check the ground too, but not ceilings
    for(var g in ground){
      calcVec.copy(start_Vec);
      pt = ground[g].rayDetect(calcVec, pointer);
      if(pt != null && pt.len <= min_dist){
        min_dist = pt.len;
        end_vec.copy(pt.spot);
        
      }
    }

    return { len : min_dist, end : end_vec};
  },

  setWeapon: function(weapon){
    this.weapon = weapon;

    current_sprite = this.weapon.sprites[0];
    current_sprite.style.display = "block";
  },

  rotateWeapon: function(){
    if(current_sprite) current_sprite.style.display = "none";
    this.weapon_index = (this.weapon_index + 1) % weapons.length;
    this.setWeapon(weapons[this.weapon_index]); 
  },

  damage: function(amount, attacker){

    this.health -= amount;
    
    //you died
    if(this.health <= 0){
      socket.emit('death', {
        victim    : p_hash,
        attacker  : attacker
      });
    }else{
      effects['damage'].play();
    }

  },

  kill: function(){
    //just for fun lol
    effects['die'].play();
    //effects['death'].play();

    //do a timed death sequence here

    this.respawn_time = RESPAWN_TIME + new Date().getTime();
    this.dead = true;
    
    //reset everything
    this.health = 100;
    ui_health.innerHTML = 100;

    this.setWeapon(weapons[0]);
    this.weapon.close();
    this.weapon_index = 0;
  },

  respawn: function(pos){
    this.weapon.open();
    this.dead = false;
    this.position.copy(pos);
  },

  move: function (){
    if(!Controller || this.dead)
      return;

    var s = this.stepFoot * this.speed;
    var diagS = s / Math.sqrt(2);
    this.position.y = isNaN(this.position.y) ? 0: this.position.y;
    var new_y = this.position.y;

    if(!this.dead && mouseDown){
      this.shoot();
      mouseDown = 0;
    }

    if(Controller.keyIsDown[32] && this.grounded){
      var d = new Date();
      console.log('jumping');
      this.jumping = true;
      this.grounded = false;
      this.ground = null; //redundant

      this.air_v = BASE_JUMP_POWER;
      this.start_t = d.getTime();
      this.air_o = this.position.y;
      s *= 0.4;
    }

    else if(this.grounded){
      new_y = this.ground.yAt(this.position);
      //walked off ledge or switching platforms

      //check if walked onto ramp here
      for(var r in ramps){
        if(ramps[r].over(this.position)){
          var r_y = ramps[r].yAt(this.position);
          if(Math.abs(new_y - r_y) < 8){//for slight error. It was 5 but yAt is given an artificial offset of 3
            this.ground = ramps[r];
            new_y = r_y;
          }
        }
      }

      if(!this.ground.over(this.position)){
        console.log('falling');
        
        this.grounded = false;

        for(var g in ground){
          if(ground[g].over(this.position)){
            //changing platforms
            if(Math.abs(this.position.y - ground[g].points[0].y) < GROUND_TOLERANCE){
              this.grounded = true;
              this.jumping = false;
              this.ground = ground[g];
              break;
            }      
          }
        }

        if(!this.grounded){
          var d = new Date();
          this.jumping = false;
          this.ground = null;


          this.air_v = 0;
          this.start_t = d.getTime();
          this.air_o = this.position.y;
        }
      }
    }
    else if(!this.grounded){

      var d = new Date();
      var dt = (d.getTime() - this.start_t) / 100;       
      new_y = -GRAVITY_ACC * (dt*dt) + this.air_v*dt + this.air_o;
      var hit = false;

      var new_pos = new THREE.Vector3(this.position.x, new_y, this.position.z);

      if(this.jumping){

        for(var c in ceil){
          if(ceil[c].over(this.position)){
            var a = ceil[c].below(tmpVec.addVectors(this.position, this.thickness));
            var b = ceil[c].below(tmpVec.addVectors(new_pos, this.thickness));

            if((!a && b)||(a && !b)){
              var d = new Date();
              this.start_t = d.getTime();
              new_y = this.position.y - GROUND_TOLERANCE;
              this.air_o = new_y;
              this.air_v = 0;
              hit = true;
              break;
            }
          }
        }

        for(var g in ground){
          if(ground[g].over(this.position)){
            if(Math.abs(ground[g].yAt(this.position) - new_pos.y) < GROUND_TOLERANCE){
              var a = ground[g].above(this.position), b = ground[g].above(new_pos);
              if((!a && b)||(a && !b)){
                new_y = ground[g].yAt(this.position);
                this.grounded = true;
                this.jumping = false;
                this.ground = ground[g];
                break;
              }
            }
          }
        }

      }

      if(!hit){
        for(var g in ground){
          if(ground[g].over(this.position)){

            var a = ground[g].above(this.position), b = ground[g].above(new_pos);
            if((!a && b)||(a && !b)){
              new_y = ground[g].yAt(this.position);
              this.grounded = true;
              this.jumping = false;
              this.ground = ground[g];
              break;
            }

          }
        }
      }
    }

    this.position.y = new_y;
    tmpVec.copy(this.position);
    tmpPos.copy(this.position);

    var curr_time = new Date().getTime();

    if(Controller.keyIsDown[82] && (curr_time - this.last_pressed_r > BUTTON_PRESS_TIME)){
      this.last_pressed_r = curr_time;
      this.rotateWeapon();
    }


    if((Controller.keyIsDown[87] && Controller.keyIsDown[83]) || (Controller.keyIsDown[68] && Controller.keyIsDown[65]))
      1;
    else if(Controller.keyIsDown[87] && Controller.keyIsDown[65]) //w + a
    {
      tmpVec.x += diagS * (this.pointed.z + this.pointed.x);
      tmpVec.z += diagS * (this.pointed.z - this.pointed.x);
    }
    else if(Controller.keyIsDown[87] && Controller.keyIsDown[68]) //w + d
    {
      tmpVec.x += diagS * (this.pointed.x - this.pointed.z);
      tmpVec.z += diagS * (this.pointed.x + this.pointed.z);
    }
    else if(Controller.keyIsDown[83] && Controller.keyIsDown[65]) //s + a
    {
      tmpVec.x += diagS * (this.pointed.z - this.pointed.x);
      tmpVec.z += diagS * ( -1 * this.pointed.x - this.pointed.z);
    }
    else if(Controller.keyIsDown[83] && Controller.keyIsDown[68]) //s + d
    {
      tmpVec.x += diagS * (this.pointed.z - this.pointed.x);
      tmpVec.z += diagS * (this.pointed.x - this.pointed.z);
    }
    else if(Controller.keyIsDown[87]){ //w
      tmpVec.x += s * this.pointed.x;
      tmpVec.z += s * this.pointed.z;
    }
    else if(Controller.keyIsDown[65]){ //a
      tmpVec.x += s * this.pointed.z;
      tmpVec.z -= s * this.pointed.x;
    }
    else if(Controller.keyIsDown[83]){ //s
      tmpVec.x -= s * this.pointed.x;
      tmpVec.z -= s * this.pointed.z;
    }
    else if(Controller.keyIsDown[68]){ //d
      tmpVec.x -= s * this.pointed.z;
      tmpVec.z += s * this.pointed.x;
    }
    else if(Controller.keyIsDown[90] && (curr_time - this.last_pressed_z > BUTTON_PRESS_TIME)){//z
      this.last_pressed_z = curr_time;
      if($('#stats-screen').css("display") == "none")
        $('#stats-screen').show();
      else
        $('#stats-screen').hide();
    }
    
    tmpVec.y = new_y;
    tmpVec.copy(this.detectCol(tmpPos,tmpVec));

    this.position.copy(tmpVec);
  },

  detectCol: function (present,future){
    if (present.equals(future))
      return present;

    var wxMax,wxMin,wzMax,wzMin,t = 2*sqThick;

    wxMax = Math.max(present.x,future.x);
    wxMin = Math.min(present.x,future.x);
    wzMax = Math.max(present.z,future.z);
    wzMin = Math.min(present.z,future.z);
    wxMax = (wxMax - wxMax % t) + t;
    wxMin = (wxMin - wxMin % t) - t;
    wzMax = (wzMax - wzMax % t) + t;
    wzMin = (wzMin - wzMin % t) - t;

    for(var j=wxMin;j<=wxMax;j+=t){
      for(var k = wzMin;k<wzMax;k+=t){
        for(var i in boundaries[j/t + 11][k/t + 11]){
          if( boundaries[j/t + 11][k/t + 11][i].collides(present, future)){
            //later will want to subtract the 'bad' part of the vector so that the 
            //user may 'slide' along the wall
            return present;
          }
        }
      }
    }

    return future;
  }

};