//Register the position and rotation of a client for spatial audio
AFRAME.registerComponent("position-listener", {
  init: function(){
    position = new THREE.Vector3();
    direction = new THREE.Vector3();
    lookat = new THREE.Vector3();

    //Get position and direction
    this.el.object3D.getWorldPosition(position);
    this.el.object3D.getWorldDirection(direction);

    Tone.Listener.positionX.value = position.x;
    Tone.Listener.positionY.value = position.y;
    Tone.Listener.positionZ.value = position.z;

    //invert
    Tone.Listener.forwardX.value = -direction.x;
    Tone.Listener.forwardY.value = direction.y; 
    Tone.Listener.forwardZ.value = -direction.z;

    //direction of the head
    Tone.Listener.upX.value = 0;
    Tone.Listener.upY.value = 1;
    Tone.Listener.upZ.value = 0;
  },
  tick: function(){

    this.el.object3D.getWorldPosition(position);
    this.el.object3D.getWorldDirection(direction);

    Tone.Listener.positionX.value = position.x;
    Tone.Listener.positionY.value = position.y;
    Tone.Listener.positionZ.value = position.z;

    Tone.Listener.forwardX.value = -direction.x;
    Tone.Listener.forwardY.value = direction.y; 
    Tone.Listener.forwardZ.value = -direction.z;

    //sendTimeStamp("_CONTINOUS_MESSAGE_");

  }
});

//Other function, just to test
function sendTimeStamp(nameEvent){
  var creationTime = new Date().getTime();
  NAF.connection.broadcastDataGuaranteed("msg-delay", nameEvent + ':' + creationTime);
  
}