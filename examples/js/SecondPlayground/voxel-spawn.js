//Spawn entity at the intersection point on click, given the properties passed.
//<a-entity intersection-spawn="mixin: box; material.color: red">` will spawn
//<a-entity mixin="box" material="color: red">` at intersection point.
AFRAME.registerComponent('intersection-spawn', {
  schema: {
    default: '',
    parse: AFRAME.utils.styleParser.parse,
  },

  init: function () {
    const data = this.data;
    const el = this.el;

    el.addEventListener(data.event, (evt) => {
      // Create element.
      const spawnEl = document.createElement('a-entity');

      spawnEl.setAttribute('networked', 'template:' + data.template + ';attachTemplateToLocal:true;');         
      
      // Snap intersection point to grid and offset from center.
      spawnEl.setAttribute('position', evt.detail.intersection.point);  
          
      var scene = this.el.sceneEl;
      scene.appendChild(spawnEl);
    });
  },
});

