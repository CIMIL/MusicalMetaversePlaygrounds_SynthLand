//Get NAF schemas
NAF.schemas.getComponentsOriginal = NAF.schemas.getComponents;

//Spatial audio
Tone.Transport.start();
now = Tone.now();

//Waves - test
wavesetting = ['sine', 'square', 'sawtooth'];
myWave = "";

arrayMusic = []; //every position in the array identifies the state of a component (0=off,1=on,etc...)
index = 0;
dropEnable = 0; 
start = 0; //start Tone.js

//Any single array will containg the settings of each musical object at the current position
//Position of values in the array: 0 volume, 1 Detune, 2 attack, 3 decay, 4 sustain, 5 release ...
cubeSettings = [];
musicalObjectsSettings = [];

//Contains all the notes 
musicDrop = [];

//used when a new musical object is created
externalDrop = [];

// intial octave
octave = 4;

cubeEnvelopeAttack = 3;
cubeEnvelopeDecay = 2;
cubeEnvelopeRelease = 0.5;
cubeEnvelopeSustain = 0.5;

//mixins to create blocks
AFRAME.registerComponent('intersection-spawn', {
    schema: {
        default: '',
        parse: AFRAME.utils.styleParser.parse
    },

    init: function () {
        var data = this.data;
        var el = this.el;

        el.addEventListener(data.event, evt => {
            if (evt.detail.intersection.object.el.id == "ground" && musicDrop.length != 0) {

                //send notes to other clients
                NAF.connection.broadcastDataGuaranteed('note-received', musicDrop);

                //creation
                var spawnEl = document.createElement('a-entity');
                var correctPosition = evt.detail.intersection.point;
                correctPosition.y = 1.0; //0.550
                spawnEl.setAttribute('networked', { persistent: true, template: this.data.template });
                spawnEl.setAttribute('position', correctPosition);
                arrayMusic[index] = 0;
                el.sceneEl.appendChild(spawnEl);
                NAF.utils.getNetworkedEntity(spawnEl).then((networkedEl) => {
                    document.body.dispatchEvent(new CustomEvent('persistentEntityCreated', { detail: { el: spawnEl } }));
                });

                //sendTimeStamp('creation');

                document.querySelector('#notebox').setAttribute('value', '');

                //GUI creation
                var gui = document.createElement('a-entity');
                var guipos = correctPosition;
                guipos.x += 1.2; //2１
                guipos.y += 0.4; //１
                gui.setAttribute('networked', { persistent: true, template: this.data.template2 });
                gui.setAttribute('position', guipos);
                gui.setAttribute('rotation', '-15 0 0');
                el.sceneEl.appendChild(gui);
                NAF.utils.getNetworkedEntity(gui).then((networkedEl) => {
                    document.body.dispatchEvent(new CustomEvent('persistentEntityCreated', { detail: { el: gui } }));
                });

            }
        });
    }
});

//Get the index of the objects
AFRAME.registerComponent('index', {
    schema: {
        indice: { type: 'int' },
    },
    init: function () {
        this.data.indice = index;
    }
});

AFRAME.registerComponent('indexgui', {
    schema: {
        indice: { type: 'int' },
    },
    init: function () {
        this.data.indice = index - 1; 
    }
});


//add to musical objects created at runtime
AFRAME.registerComponent("polysynth", {
    schema: {
        note: { type: 'string' },
        volume: { type: 'number' }, //0
        distortion: { type: 'number' }, //1
        attack: { type: 'number' }, //2
        decay: { type: 'number' }, //3
        sustain: { type: 'number' }, //4
        release: { type: 'number' }, //5

        frequency: { type: 'number' },
        
        square: {type: 'number'},
        sine: {type: 'number'},

        qval: { type: 'number' }
        
    },
    init: function () {
        //add obj to array
        this.objPos = index;
        // Creazione musical objects
        this.physicalObj = this.el.object3D;

        cubeSettings[this.objPos] = [0,0,2,1,0,220,1,0,0,0,0]; 
        musicalObjectsSettings[this.objPos] = ["","sine","","","","","","","sine", "square", "sawtooth"]; //?

        this.pannerpolysynth = new Tone.Panner3D(this.physicalObj.position.x, this.physicalObj.position.y, this.physicalObj.position.z); 
            
        //WIP
        var dawave = cubeSettings[this.objPos][9];
        var iswave ="triangle";
        if(dawave == 0){
            iswave = "sine";
        }
        if(dawave == 1){
            iswave = "sine";
        }
        if(dawave == 2){
            iswave = "square";
        }
        if(dawave == 3){
            iswave = "sawtooth";
        }

        //console.log("aa " + musicalObjectsSettings[this.objPos][1]);

        this.polysynth = new Tone.PolySynth().set({
            oscillator: {
                    type: musicalObjectsSettings[this.objPos][1]
            },
            polyphony : 4 ,
            voice : Tone.Synth,
            envelope: {
                attackCurve: "exponential",
                attack: cubeSettings[this.objPos][1],
                decay: cubeSettings[this.objPos][2],
                sustain: cubeSettings[this.objPos][3],
                release: cubeSettings[this.objPos][4],    
            }
        });

        this.distortion = new Tone.Distortion(0);  //amount of distortion, between 0-1

        this.filter = new Tone.Filter(200, "bandpass",-24);
        this.polysynth.chain(this.filter, this.distortion, this.pannerpolysynth, Tone.Destination); //original
        
        this.polysynth.volume.value = cubeSettings[this.objPos][0];
        this.distortion.set({ distortion: cubeSettings[this.objPos][7] });

        this.filter.frequency.value = cubeSettings[this.objPos][5];
        this.filter.Q.value = cubeSettings[this.objPos][6];
  
        //save all data in the matrix containing the settings
        // 1: index of musical object, 2: index
        this.data.volume = cubeSettings[this.objPos][0];
        this.data.distortion = cubeSettings[this.objPos][7];
        this.data.attack = cubeSettings[this.objPos][1];
        this.data.decay = cubeSettings[this.objPos][2];
        this.data.sustain = cubeSettings[this.objPos][3];
        this.data.release = cubeSettings[this.objPos][4];
   
        this.data.note = notePopuling();
    },
    tick: function () {
        //force position
        this.pannerpolysynth.setPosition(this.el.object3D.position.x, this.el.object3D.position.y, this.el.object3D.position.z);
    },
    updateColor() {
        if (this.el.getAttribute('material').color == "#005AB5")
            this.el.setAttribute('material', 'color', "#DC3220") 
        else
            this.el.setAttribute('material', 'color', "#005AB5")
    },
    events: {
        click: function (evt) { 
            //shared changes
            NAF.utils.takeOwnership(this.el);

            //sendTimeStamp('activation');

            //Best pratice di Tone.js, call Tone.start() before anything else
            if (!start) {
                Tone.start();
                start++;
            }
            if (arrayMusic[this.objPos]) {
                //deactivate object, when off
                arrayMusic[this.objPos] = 0;
                this.polysynth.triggerRelease(this.data.note);
            
                //Send off message to all connected clients
                var command = this.objPos + '-off'
                NAF.connection.broadcastDataGuaranteed('cube-commands', command);
                this.updateColor();
            }
            else {
                //activate cube 
                arrayMusic[this.objPos] = 1;
                this.polysynth.triggerAttack(this.data.note);
                
                //Send on message to all connected clients
                var command = this.objPos + '-on'
                NAF.connection.broadcastDataGuaranteed('cube-commands', command);
                this.updateColor();
            }
        },
        //avoid message loops between clients
        eventOn: function () {
            arrayMusic[this.objPos] = 1;
            this.polysynth.triggerAttack(this.data.note);
            //sendTimeStamp('activation');
        },
        eventOff: function () {
            arrayMusic[this.objPos] = 0;
            this.polysynth.triggerRelease(this.data.note);            
        },
        changeSettings: function () {
            
            //Synchronize the settings saved in the matrix, then with all connected clients
            this.polysynth.volume.value = cubeSettings[this.objPos][0];      
            
            this.data.attack = cubeSettings[this.objPos][1];
            this.data.decay = cubeSettings[this.objPos][2];
            this.data.sustain = cubeSettings[this.objPos][3];
            this.data.release = cubeSettings[this.objPos][4];
            
            this.filter.frequency.value = cubeSettings[this.objPos][5];
            this.filter.Q.value = cubeSettings[this.objPos][6];

            this.distortion.set({ distortion: cubeSettings[this.objPos][7] });

            //sendTimeStamp('Change value');

            //WIP
            var dawave = cubeSettings[this.objPos][9];            
            var iswave ="triangle";
            if(dawave == 0){
                iswave = "sine";
            }
            if(dawave == 1){
                iswave = "sine";
            }
            if(dawave == 2){
                iswave = "square";
            }
            if(dawave == 3){
                iswave = "sawtooth";
            }

            this.polysynth.set({
                oscillator: {
                    type: musicalObjectsSettings[this.objPos][1]
                },
                envelope: {
                    attackCurve: "exponential",
                    attack: cubeSettings[this.objPos][1],
                    decay: cubeSettings[this.objPos][2],
                    sustain: cubeSettings[this.objPos][3],
                    release: cubeSettings[this.objPos][4],
                }
            });

            //When data are synchronized, change the text
            var GUIs = document.querySelectorAll('[text-changer]');
            for (var i = 0; i < GUIs.length; i++) {
                if (GUIs[i].getAttribute('text-changer').indexcube == this.objPos)
                    GUIs[i].dispatchEvent(updateComponent);
            }
        }
        
    }
});


//Assign notes and fiil data
function notePopuling() {
    var toFill;

    if (externalDrop.length != 0) {
        toFill = externalDrop;
        externalDrop = [];
    }
    else if (musicDrop.length != 0) {
        toFill = musicDrop;
        musicDrop = [];
    }
    else {
        console.log("Default A1");
        toFill = ["A1"];
    }
    return toFill;
}

//Manage the notes in the array, used to synchronize notes with corresponding octaves
AFRAME.registerComponent('note-mem', {
    schema: {
        addnota: { type: 'string', default: 'A' }
    },
    init: function () {
        this.nota = this.data.addnota + 4;
    },
    events: {
        click: function () { 
            if (!musicDrop.includes(this.nota)) {
                musicDrop.push(this.nota);
                document.querySelector('#notebox').setAttribute('value', musicDrop);
            }
            console.log(musicDrop);
        },
        changeOctave: function () {
            this.nota = this.data.addnota + octave;
        }
    }
});

//Change selected octave
AFRAME.registerComponent('change-octave', {
    schema: {
        action: { type: 'string' },
    },
    init: function () {
        this.noteSelectors = document.querySelectorAll('[note-mem]');
        octave = 4;
    },
    events: {
        click: function () { 
            if (this.data.action == "add") {
                //if (octave < 8) {
                octave++;
                //}
                if(octave > 8){
                   octave = 8;
                }
            }
            else if (this.data.action == "sub") {
                //if (octave > 1)
                octave--;
                if(octave < 1){
                    octave = 1;
                }
            }
            for (var i = 0; i < this.noteSelectors.length; i++) {
                this.noteSelectors[i].dispatchEvent(changeOctave);
            }
            document.querySelector("#octaveValue").setAttribute('value', octave);
        }
    }
});

//Change text on 3D ui
AFRAME.registerComponent('text-changer', {
    schema: {
        indexcube: { type: 'int' },
        settingindex: { type: 'int' }
    },

    init: function () {
        this.data.indexcube = this.el.parentNode.parentNode.getAttribute("indexgui").indice;
        this.el.setAttribute('value', cubeSettings[this.data.indexcube][this.data.settingindex]);
    },
    events: {
        updateComponent: function () {
            this.el.setAttribute('value', cubeSettings[this.data.indexcube][this.data.settingindex]);
        }
    }
});

//change settings in matrix
AFRAME.registerComponent('setting-changer', {
    schema: {
        indexcube: { type: 'int' },
        settingindex: { type: 'int' },
        action: { type: 'string' }
    },
    init: function () {
        this.cube;
        this.data.indexcube = this.el.parentNode.parentNode.getAttribute("indexgui").indice;
        var cubes = document.querySelectorAll('[polysynth]');
        for (var i = 0; i < cubes.length; i++) {
            if (cubes[i].getAttribute('index').indice == this.data.indexcube)
                this.cube = cubes[i];
        }
    },
    events: {
        click: function () {          
            //change values in the array
            if (this.data.action == 'add') {
                if (this.data.settingindex == 4 || this.data.settingindex == 1) {
                    cubeSettings[this.data.indexcube][this.data.settingindex] = Math.round((cubeSettings[this.data.indexcube][this.data.settingindex] + 0.1) * 1e12) / 1e12;
                    if (cubeSettings[this.data.indexcube][this.data.settingindex] > 1)
                        cubeSettings[this.data.indexcube][this.data.settingindex] = 1;
                }
                else {
                    cubeSettings[this.data.indexcube][this.data.settingindex] = Math.round((cubeSettings[this.data.indexcube][this.data.settingindex] + 0.5) * 1e12) / 1e12;
                }
            }
            else if (this.data.action == 'sub') {
                if (this.data.settingindex == 4 || this.data.settingindex == 1) {//sustain si modifica con +-0.1 invece che +-0.5
                    cubeSettings[this.data.indexcube][this.data.settingindex] = Math.round((cubeSettings[this.data.indexcube][this.data.settingindex] - 0.1) * 1e12) / 1e12;   
                }
                else {
                    cubeSettings[this.data.indexcube][this.data.settingindex] = Math.round((cubeSettings[this.data.indexcube][this.data.settingindex] - 0.5) * 1e12) / 1e12;
                }
                if (cubeSettings[this.data.indexcube][this.data.settingindex] < 0 && this.data.settingindex != 0) //detune e volume possono andare sotto 0
                    cubeSettings[this.data.indexcube][this.data.settingindex] = 0;

                //WIP
                var wavez = 0;
                //SINE
                if(this.data.settingindex == 9)
                {
                    wavez = 1;
                    musicalObjectsSettings[this.data.indexcube][1] = "square";
                }
                //SQUARE
                if(this.data.settingindex == 8)
                {
                    wavez = 2;
                    musicalObjectsSettings[this.data.indexcube][1] = "sine";
                }
                //SAW
                if(this.data.settingindex == 10)
                {
                    wavez = 3;
                    musicalObjectsSettings[this.data.indexcube][1] = "sawtooth";
                }
                
                cubeSettings[this.data.indexcube][9] = wavez;
            }
            
            //event that will modify values on musical objects, then it will generate the event for modifying the text
            this.cube.dispatchEvent(changeSettings);

            var cmd = '';
            cmd += this.data.indexcube + ':' + this.data.settingindex + ':' + cubeSettings[this.data.indexcube][this.data.settingindex];
            NAF.connection.broadcastDataGuaranteed("update-settings", cmd);
            NAF.connection.broadcastDataGuaranteed("test-test", this.data.settingindex);

        }
    }
});

AFRAME.registerComponent('clear-array', {
    events: {
        click: function () { 
            musicDrop = [];
            document.querySelector('#notebox').setAttribute('value', musicDrop);
        }
    }
});

//////////////////////

function sendTimeStamp(nameEvent){
    var creationTime = new Date().getTime();
    NAF.connection.broadcastDataGuaranteed("msg-delay", nameEvent + ':' + creationTime);
    
}

///////////////////////////

//WIP
AFRAME.registerComponent('rotate-cursor-a', {
    schema: {
    },
  
    init: function () {
      
      var data = this.data;
      var el = this.el;  // <a-box>
      var getCursor = document.getElementById('myCursor');
      var checkit = false;
      var correctPosition = getCursor.getAttribute('position');
    }

  });

/////////////////////////////////////////////////////////////////////////////

//WIP
AFRAME.registerComponent('change-wave', {
    schema: {
        action: { type: 'string' },
    },
    init: function () {
        this.noteSelectors = document.querySelectorAll('[note-mem]');
        octave = 4;
    },
    events: {
        click: function () { 
            if (this.data.action == "sine") {
                myWave = wavesetting[0];
            }
            else if (this.data.action == "square") {
                myWave = wavesetting[1];
            }
            else if(this.data.action == "sawtooth"){
                myWave = wavesetting[2];
            }
        }
    }
});
