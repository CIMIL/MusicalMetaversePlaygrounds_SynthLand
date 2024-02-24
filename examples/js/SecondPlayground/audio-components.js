
AFRAME.registerComponent('bar-volume', {
  dependencies: ['size'],
  init: function () {
  },
  tick: function (time, deltaTime) {
    if (init) {
      volume = analyserDataArray[0];
      if (volume > 0.1) this.el.object3D.scale.y = volume * 1000;
    }
  },
  events: {
    click: function (evt) { 
        //Share modifications with other clients
        NAF.utils.takeOwnership(this.el);
    }
},
});

//Share change of amplitude visualization
AFRAME.registerComponent('bar-volume-diff', {
  dependencies: ['size'],
  init: function () {
    sendTimeStamp('bar-vol-creation-event');
  },
  tick: function (time, deltaTime) {
    if (init && NAF.utils.isMine(this.el)) {
       volume = analyserDataArray[0]; 
      if (volume > 0.0025) {
        this.el.object3D.scale.y = toneRms * (Math.random()*500); 
      }
      else if (this.el.object3D.scale.y > 1) {
        this.el.object3D.scale.y -= 0.1; 
      }
    }
  },
});

AFRAME.registerComponent('bars-waveform', {
  dependencies: ['size'],
  schema: {
    num: {
      type: 'number',
      default: 32, 
    },
  },

  init: function () {
    const el = this.el;
    const data = this.data;

    this.bars = new Array(data.num);

    for (let i = 0; i < data.num; i++) {
      this.bars[i] = document.createElement('a-entity');

      this.bars[i].setAttribute('geometry', {
        primitive: 'box',
        height: 3,
        width: 1,
      });
      this.bars[i].setAttribute('position', {
        x: i,
        y: 0,
        z: -3, 
      });
      
      this.bars[i].setAttribute('random-color-transparent', '');
      el.appendChild(this.bars[i]);
    }
  },

  tick: function (time, deltaTime) {
    var data = this.data;

    if (init && toneFFT != null) {
      const samples = toneFFT;
      for (let i = 0; i < data.num; i++) {
        var bar = this.bars[i];
        if (samples[i] != 0) bar.object3D.scale.y = samples[i] / 10; 
      }
      //sendTimeStamp('FFT');
    }
  },
});

AFRAME.registerComponent('mouth-lips', {
  dependencies: ['size'],
  schema: {
    type: {
      type: 'string',
      default: 'sup',
    },
  },
  init: function () {
    const el = this.el;
    const data = this.data;
    this.pos = el.object3D.position.y;
  },

  tick: function (time, deltaTime) {
    if (init) {
      const el = this.el;
      const volume = analyserDataArray[0] * 2.5; 
      const data = this.data;
      if (volume > 0.002) { 
        sendTimeStamp('VolumeRMS');
        if (data.type == 'sup') {
          el.object3D.position.y = this.pos + volume;
          //sendTimeStamp('lip-up');
        } else if (data.type == 'inf') {
          el.object3D.position.y = this.pos - volume;
          //sendTimeStamp('lip-down');
        }
      } else {
        el.object3D.position.y = this.pos;
      }
    }
  },
});

// ----------------- HUD ----------------------
AFRAME.registerComponent('chord', {
  tick: function (time, deltaTime) {
    this.el.setAttribute('value', 'CHORD: ' + chord);
  },
});

AFRAME.registerComponent('rms', {
  tick: function (time, deltaTime) {
    const volume = toneRms;
    this.el.setAttribute(
      'value',
      'RMS: ' + Math.round(volume * Math.pow(10, 5), 2)
    );
  },
});

// -------------- Hairs ------------------- 
//--------- NOT USED
AFRAME.registerComponent('hairs', {
  dependencies: ['size'],
  schema: {
    num: {
      type: 'number',
      default: 3,
    },
  },

  init: function (time, deltaTime) {
    const data = this.data;
    const el = this.el;
    const width = 0.5 / data.num;

    this.bars = new Array(data.num);

    console.log(data.num);

    for (let i = 0; i < data.num; i++) {
      this.bars[i] = document.createElement('a-entity');

      this.bars[i].setAttribute('geometry', {
        primitive: 'box',
      });

      this.bars[i].setAttribute(
        'networked',
        'template:#hair-template;attachTemplateToLocal:false;'
      );

      this.bars[i].object3D.scale.set(width, 0.1, 0.1);
      this.bars[i].object3D.position.set(width * i - 0.25, 0.3, 0);

      this.bars[i].setAttribute('random-color', '');
      this.bars[i].setAttribute('hair', 'id:' + i);

      this.bars[i].setAttribute('visible', 'false');

      el.appendChild(this.bars[i]);
    }
  },
});

AFRAME.registerComponent('hair', {

  dependencies: ['size'],
  schema: {
    id: {
      type: 'number',
      default: -1,
    },
  },

  init: function () {
    const data = this.data;
    const el = this.el;

    el.setAttribute('class', 'hair');
  },
  tick: function () {
    const data = this.data;
    const el = this.el;

    if (data.id != -1 && init && toneFFT != null) {
      if (toneFFT[data.id] != 0) {
        el.object3D.scale.y = toneFFT[data.id] / Math.pow(2, 8);
      }
    }
  },
});

//////////////
function sendTimeStamp(nameEvent){
  var creationTime = new Date().getTime();
  NAF.connection.broadcastDataGuaranteed("msg-delay", nameEvent + ':' + creationTime);
  
}