AFRAME.registerComponent('random-color', {
  dependencies: ['material'], 
  //material="side: double; color: #DC3220; transparent: true; opacity: 0.1"
  init: function () {
    //this.el = reference to the entity that the component is attached to
    //set material component's color property to a random color
    this.el.setAttribute('material', 'color', getRandomColor());
  },
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  var color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

AFRAME.registerComponent('random-char-color', {
  schema: {
    min: { default: { x: 0, y: 0, z: 0 }, type: 'vec3' },
    max: { default: { x: 1, y: 1, z: 1 }, type: 'vec3' },
  },

  update: function () {
    var data = this.data;
    var max = data.max;
    var min = data.min;
    this.el.setAttribute(
      'material',
      'color',
      '#' +
        new THREE.Color(
          Math.random() * max.x + min.x,
          Math.random() * max.y + min.y,
          Math.random() * max.z + min.z
        ).getHexString()
    );
  },
});
