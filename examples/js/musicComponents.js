/*  Necessario per Networked Aframe  */
NAF.schemas.getComponentsOriginal = NAF.schemas.getComponents;



/*  Funzionamento audio spaziale  */
Tone.Transport.start();
now = Tone.now();


wavesetting = ['sine', 'square', 'sawtooth'];
myWave = "";



/*  Ogni posizione di arrayMusicale identifica lo stato di un componente musicale, 0 = spento, 1 = attivo (parte da 1)  */
/*  dropEnable sarà 1 quando prendo un blocco dagli esempi per piazzarlo dopo, per il momento non lo uso  */
/*  start serve per far partire Tone, anche se non sembra essere necessario per il funzionamento, viene comunque consigliato  */
arrayMusicale = [];
index = 0;
dropEnable = 0;
start = 0;

/*  Vado a creare un array di array, ogni singolo array interno conterrà i dati dei setting del cubo in data posizione  */
/*  On connect manderò l'array intero mentre per i singoli cambiamenti solo il contenuto della suddetta cella preceduto dalla posizione nell'array  */
/*  Composizione Array:  */
/*  Posizione 0 Volume  */
/*  Posizione 1 Detune (forse lo cambio con qualcos'altro)  */
/*  Posizione 2 Envelope Attack  */
/*  Posizione 3 Envelope Decay  */
/*  Posizione 4 Envelope Sustain  */
/*  Posizione 5 Envelope Release  */
cubeSettings = [];
cubeSettings1 = [];

/*  array che contiene quali note saranno inserite nell'elemento che verrà posizionato con il prossimo click  */
/*  viene pulito dopo ogni drop e viene riempito clickando su dei blocchi appositi preposizionati quando il mondo viene creato  */
//Default è vuoto ma mi serve per fare testing fin quando non implemento un metodo per selezionare le note
//musicDrop = ["D4", "F4", "A4", "C5", "E5"];
musicDrop = [];

/*  array che uso come supporto per quando viene creato un cubo da un altro utente  */
/*  prima di assegnare le note, se questo è vuoto, allora uso musicDrop, altrimenti uso questo e poi lo svuoto  */
/*  dovrebbe essere vuoto la maggior parte del tempo, quando si popula è solo per creare dare le note al synth e poi si svuota subito  */
externalDrop = [];

/*  Indica l'ottava in cui si trovano i componenti da prendere, quindi se è 1, tutti i componenti hanno note in prima ottava etc  */
octave = 4;

/*  Volume del suono riprodotto dai cubi in dB, OUTDATED  */
//cubeVolume = -12;

/*  detune applicato al suono riprodotto dai cubi, OUTDATED  */
//cubeDetune = 0;

cubeEnvelopeAttack = 3;
cubeEnvelopeDecay = 2;
cubeEnvelopeRelease = 0.5;
cubeEnvelopeSustain = 0.5;

//defaultCubeSettings = [0, 0, 3, 2, 0.5, 0.5]; usando il push poi va a modificare l'oggetto quindi rimane lo stesso per tutti

//OUTDATED, usato per i gli oggetti statici
//riproducisynth = 0;
//riproduciosc = 0;


/*  Creo grazie a dei mixins i blocchi, con un componente che mi permette di modificarne le proprietà  */
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

                // Invia in broadcast le note che vanno nel polysynth agli altri utenti connessi
                NAF.connection.broadcastDataGuaranteed('note-received', musicDrop);

                //Cube creation
                var spawnEl = document.createElement('a-entity');
                var correctPosition = evt.detail.intersection.point;
                correctPosition.y = 1.0; //0.550
                spawnEl.setAttribute('networked', { persistent: true, template: this.data.template });
                spawnEl.setAttribute('position', correctPosition);
                arrayMusicale[index] = 0;
                el.sceneEl.appendChild(spawnEl);
                NAF.utils.getNetworkedEntity(spawnEl).then((networkedEl) => {
                    document.body.dispatchEvent(new CustomEvent('persistentEntityCreated', { detail: { el: spawnEl } }));
                });

                sendTimeStamp('CreazioneCubo');

                //document.getElementById("notebox").value = "";
                document.querySelector('#notebox').setAttribute('value', '');

                //GUI creation
                var gui = document.createElement('a-entity');
                var guipos = correctPosition;
                guipos.x += 1.2; //2１
                guipos.y += 0.4; //１
                gui.setAttribute('networked', { persistent: true, template: this.data.template2 });
                gui.setAttribute('position', guipos);
                gui.setAttribute('rotation', '-15 0 0');
                //gui.setAttribute('id', index);
                el.sceneEl.appendChild(gui);
                NAF.utils.getNetworkedEntity(gui).then((networkedEl) => {
                    document.body.dispatchEvent(new CustomEvent('persistentEntityCreated', { detail: { el: gui } }));
                });

            }
        });
    }
});


/*  Serve per recuperare l'index degli oggetti visto che non posso modificare correttamente l'id originale  */
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
        this.data.indice = index - 1; //-1 perchè creandolo dopo il cubo l'index viene incrementato
    }
});


/*  Componente da aggiungere ai cubi creati a run time, versione precedente
AFRAME.registerComponent("polysynth", {
    schema: {
        note: { type: 'string' }, //mind che probabilmente qui ci saranno più note da dividere con un parser
    },
    init: function () {

        //add obj to array
        this.objPos = index;

        // Creazione Componenti Musicali
        this.physicalObj = this.el.object3D;
        this.pannerpolysynth = new Tone.Panner3D(this.physicalObj.position.x, this.physicalObj.position.y, this.physicalObj.position.z).toDestination();
        this.polysynth = new Tone.PolySynth().connect(this.pannerpolysynth);

        // Senza fa troppo casino
        this.polysynth.volume.value = -12;

        //let note = this.data.note.split(",");
        this.noteA = notePopuling();

        //Serve solo per mostrare le note nell'editor (Ctrl + Alt + i)
        this.data.note = this.noteA;

        //Quando creo un oggetto la posizione di spawn sulle altre macchine risulta 0,0,0, il che da ovviamente problemi con la corretta
        //percezione dell'audio
        console.log("index:" + this.objPos + ", x:" + this.physicalObj.position.x + ", y:" + this.physicalObj.position.y + ", z:" + this.physicalObj.position.z);


        // Eventi per attivare e disattivare audio in seguito ad un messaggio
        this.el.addEventListener("eventOn", function () {
            arrayMusicale[objPos] = 1;
            polysynth.triggerAttack(noteA, now, 1); //scambiare now con "+0" se qualcosa non dovesse andare
            console.log("index:" + objPos + ", x:" + physicalObj.x + ", y:" + physicalObj.y + ", z:" + physicalObj.z);
        });

        this.el.addEventListener("eventOff", function () {
            arrayMusicale[objPos] = 0;
            polysynth.triggerRelease(noteA, now);
        });

        this.el.addEventListener("click", function () {
            console.log(this.el);
            if (!start) {
                Tone.start();
                start++;
            }
            if (arrayMusicale[objPos]) {
                arrayMusicale[objPos] = 0;
                polysynth.triggerRelease(noteA, now);

                //Invio messaggio disattivazione
                var command = objPos + '-off'
                NAF.connection.broadcastDataGuaranteed('cube-commands', command);
                console.log("index:" + objPos + ", x:" + physicalObj.x + ", y:" + physicalObj.y + ", z:" + physicalObj.z);

            }
            else {
                arrayMusicale[objPos] = 1;
                polysynth.triggerAttack(noteA, now, 1);

                //Invio messaggio attivazione
                var command = objPos + '-on'
                NAF.connection.broadcastDataGuaranteed('cube-commands', command);
                console.log("index:" + objPos + ", x:" + physicalObj.x + ", y:" + physicalObj.y + ", z:" + physicalObj.z);

            }
        });

    },
});*/

/*
//su test_2.html --> cerca: test-it
AFRAME.registerComponent("test-it",{
    schema: {
        tit: { type: 'string' },
    },
    init: function () {
    },
    tick: function () {
    NAF.connection.broadcastDataGuaranteed('myMessage', 'a');
    },
})
*/


/*  Componente da aggiungere ai cubi creati a run time  */
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
        
        // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
        
        //Q: { type: 'number' },
        //octaves: { type: 'number' },
        //delayTime: { type: 'number' },
        //depth: { type: 'number' },
    },
    init: function () {

        //add obj to array
        this.objPos = index;

        // Creazione Componenti Musicali
        this.physicalObj = this.el.object3D;

        //cubeSettings[this.objPos] = defaultCubeSettings;
        //cubeSettings.push(defaultCubeSettings); //questo non va bene perchè mette lo stesso oggetto, quindi quando ne cambio uno, cambiano tutti
        cubeSettings[this.objPos] = [0,0,2,1,0,220,1,0,0,0,0]; //[0, 0, 3, 2, 0.5, 0.5];
        cubeSettings1[this.objPos] = ["","sine","","","","","","","sine", "square", "sawtooth"];

        /*this.pannerpolysynth = new Tone.Panner3D(this.physicalObj.position.x, this.physicalObj.position.y, this.physicalObj.position.z).toDestination();
        this.polysynth = new Tone.PolySynth().set({
            envelope: {
                attackCurve: "exponential",
                attack: cubeSettings[this.objPos][2],
                decay: cubeSettings[this.objPos][3],
                sustain: cubeSettings[this.objPos][4],
                release: cubeSettings[this.objPos][5],
            }
        }).connect(this.pannerpolysynth);*/

        this.pannerpolysynth = new Tone.Panner3D(this.physicalObj.position.x, this.physicalObj.position.y, this.physicalObj.position.z); //non sono sicuro funzioni correttamente tbh
        //Tone.PolySynth()
        /*
        this.polysynth = new Tone.PolySynth().set({
            envelope: {
                attackCurve: "exponential",
                attack: cubeSettings[this.objPos][2],
                decay: cubeSettings[this.objPos][3],
                sustain: cubeSettings[this.objPos][4],
                release: cubeSettings[this.objPos][5],
            }
        });
        */

            /*
            if(cubeSettings[this.objPos][8]  == 1){
                myWave = "sine";
                this.data.sine = cubeSettings[this.objPos][8];
            }
            if(cubeSettings[this.objPos][9] == 1){
                myWave = "square";
                this.data.square = cubeSettings[this.objPos][9];
            }
            if(cubeSettings[this.objPos][10] == 1){
                myWave = "sine";
                this.data.sine = cubeSettings[this.objPos][8];
            }
            */

            
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

            console.log("aa " + cubeSettings1[this.objPos][1]);

           

            //polysynth.oscillator.type = iswave;

            this.polysynth = new Tone.PolySynth().set({
                oscillator: {
                    type: cubeSettings1[this.objPos][1]//iswave//"sine" //the type of waveform the synthesizer produces. Can be: square, sine, triangle, or sawtooth
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

            //this.polysynth.oscillator.set({ type: iswave });

            //this.polysynth.oscillator.type.set("triangle") 

            /*
            // SET - FILTER
            poly.set({
                "filter" : {
                    "type" : "bandpass"
                    // + https://tonejs.github.io/docs/r13/Filter
                },
                "envelope" : {
                    "attack" : 0.25
                }
            });
            */

            /*
            this.polysynth = new Tone.PolySynth().set({
                oscillator: {
                    type: "sawtooth" //the type of waveform the synthesizer produces. Can be square, since, triangle, or sawtooth
                  }
            });
            */

        /*
        this.polysynth = new Tone.PolySynth({
            oscillator: {
              type: "sawtooth" //the type of waveform the synthesizer produces. Can be square, since, triangle, or sawtooth
            },
            envelope: { //sets the various sound properties for the synth
                attackCurve: "exponential",
              attack: cubeSettings[this.objPos][2],
              decay: cubeSettings[this.objPos][3],
              sustain: cubeSettings[this.objPos][4],
              release: cubeSettings[this.objPos][5],
            }
          }).toDestination();; //sends the synth's output to the master speakers
        */

        this.distortion = new Tone.Distortion(0);    //amount of distortion, between 0-1
        
        /*
        // PHASER
        this.phaser = new Tone.Phaser({
            "frequency" : cubeSettings[this.objPos][6],
            "octaves" : 1,
            "baseFrequency" : 100
        });
        */

        this.filter = new Tone.Filter(200, "bandpass",-24);

        /*
        this.autoWah = new Tone.AutoWah({
            baseFrequency : 20 ,
            octaves : cubeSettings[this.objPos][8],
            sensitivity : 0 ,
            Q : cubeSettings[this.objPos][7],
            gain : 2 ,
            follower : {
            attack : 0.3 ,
            release : 0.5
            }
        });
        */

        //PHASER
        //this.polysynth.chain(this.phaser, this.distortion , this.pannerpolysynth, Tone.Destination);
        this.polysynth.chain(this.filter, this.distortion, this.pannerpolysynth, Tone.Destination); //original
        //this.polysynth.chain(this.distortion, this.filter, this.pannerpolysynth, Tone.Destination);

/*
//Original
        this.polysynth.set({  
            envelope: {
                attackCurve: "exponential",
                attack: cubeSettings[this.objPos][2],
                decay: cubeSettings[this.objPos][3],
                sustain: cubeSettings[this.objPos][4],
                release: cubeSettings[this.objPos][5],
            }           
        });
*/
/*
        var env = new Tone.Envelope({
            "attack" : cubeSettings[this.objPos][2],
            "decay" : cubeSettings[this.objPos][3],
            "sustain" : ubeSettings[this.objPos][4],
            "release" : cubeSettings[this.objPos][5],
            });
*/
        // Imposta il volume iniziale del suono riprodotto e il valore del detune
        this.polysynth.volume.value = cubeSettings[this.objPos][0];
        this.distortion.set({ distortion: cubeSettings[this.objPos][7] });

        //PHASER
        //this.phaser.frequency.value = cubeSettings[this.objPos][6];
        this.filter.frequency.value = cubeSettings[this.objPos][5];
        this.filter.Q.value = cubeSettings[this.objPos][6];
  
        //vado a salvare tutti i dati nella matrice delle impostazioni (1° posizione = indice del cubo, 2° posizione = indice dell'impostazione)
        this.data.volume = cubeSettings[this.objPos][0];
        this.data.distortion = cubeSettings[this.objPos][7];
        this.data.attack = cubeSettings[this.objPos][1];
        this.data.decay = cubeSettings[this.objPos][2];
        this.data.sustain = cubeSettings[this.objPos][3];
        this.data.release = cubeSettings[this.objPos][4];

        //this.polysynth.oscillator.type = myWave;

        //this.data.frequency = cubeSettings[this.objPos][5];
        //this.data.qval = cubeSettings[this.objPos][6];

        /*
        if(cubeSettings[this.objPos][8]  == 1){
            myWave = "sine";
            this.data.sine = cubeSettings[this.objPos][8];
        }
        if(cubeSettings[this.objPos][9] == 1){
            myWave = "square";
            this.data.square = cubeSettings[this.objPos][9];
        }
        if(cubeSettings[this.objPos][10] == 1){
            myWave = "sine";
            this.data.sine = cubeSettings[this.objPos][8];
        }

        console.log("$$$$$$$$$$$$ " + myWave);
        */
        
        //this.autoWah.Q.value = cubeSettings[this.objPos][7];
        //this.autoWah.octaves.value = cubeSettings[this.objPos][8];
        
        //this.chorus.delayTime.value = cubeSettings[this.objPos][7];
        //this.chorus.depth.value = cubeSettings[this.objPos][8];
   
        this.data.note = notePopuling();

        //this.myGUI = document.getElementById(this.objPos); non credo sia utile, controllare se succedono danni è per colpa di questo testo commentato


    },
    tick: function () {
        //serve per tenere la posizione corretta, altrimenti viene costantemente portato a 0,0,0
        this.pannerpolysynth.setPosition(this.el.object3D.position.x, this.el.object3D.position.y, this.el.object3D.position.z);
        //console.log((new Date()).getTime());
        //NAF.connection.broadcastDataGuaranteed('myMessage', command);

    },
    updateColor() {
        //cambia il colore del cubo a seconda e è accesso o meno, non è sincronizzato direttamente, ma non dovrebbe succedere che siano desincronizzati
        if (this.el.getAttribute('material').color == "#005AB5")
            this.el.setAttribute('material', 'color', "#DC3220") 
        else
            this.el.setAttribute('material', 'color', "#005AB5")

    },
    events: {
        click: function (evt) { //click: function (evt) { //click-------
            //serve per far si che le modifiche fatte al cubo siano condivise per tutti (in questo caso agisce solo sul colore)
            NAF.utils.takeOwnership(this.el);

            sendTimeStamp('AttivazioneCubo');

            //Best pratice di Tone.js, prima di far partire qualunque suono viene consigliato di chiamare Tone.start();
            if (!start) {
                Tone.start();
                start++;
            }
            if (arrayMusicale[this.objPos]) {
                //vado a disattivare il cubo nel momento in cui questo è acceso
                arrayMusicale[this.objPos] = 0;
                this.polysynth.triggerRelease(this.data.note);
                
                
                //Invio messaggio disattivazione a tutti i client connessi
                var command = this.objPos + '-off'
                NAF.connection.broadcastDataGuaranteed('cube-commands', command);
                this.updateColor();
            }
            else {
                //vado ad attivare il cubo nel momento in cui questo è spento
                arrayMusicale[this.objPos] = 1;
                this.polysynth.triggerAttack(this.data.note);
                
                //Invio messaggio attivazione a tutti i client connessi
                var command = this.objPos + '-on'
                NAF.connection.broadcastDataGuaranteed('cube-commands', command);
                this.updateColor();

            }
        },
        /*  Eventi creati per evitare loop di messaggi, se una volta ricevuto il messaggio d'attivazione da un altro client, avessi chiamato il click, poi si  */
        /*  sarebbe generato un ulteriore messaggio e questo avrebbe continuato a rimbalzare  */
        eventOn: function () {
            arrayMusicale[this.objPos] = 1;
            this.polysynth.triggerAttack(this.data.note);
            sendTimeStamp('AttivazioneCuboAAAA');
            //console.log("myindex1");
        },
        eventOff: function () {
            arrayMusicale[this.objPos] = 0;
            this.polysynth.triggerRelease(this.data.note);
            //console.log("myindex2");
            
        },
        changeSettings: function () {
            
            /*  Quando chiamato va a sincronizzare le impostazioni con quelle salvate nella matrice delle impostazioni, questo perchè quando andiamo a clickare su  */
            /*  uno degli elementi per andare a modificare i valori delle impostazioni, la modifica viene prima applicata alla matrice, poi viene chiamato questo evento  */
            /*  per sincronizzare il tutto e poi viene inviato il messaggio agli altri client connessi, con le modifiche da effettuare  */
            
            this.polysynth.volume.value = cubeSettings[this.objPos][0];      
            
            this.data.attack = cubeSettings[this.objPos][1];
            this.data.decay = cubeSettings[this.objPos][2];
            this.data.sustain = cubeSettings[this.objPos][3];
            this.data.release = cubeSettings[this.objPos][4];
            
            this.filter.frequency.value = cubeSettings[this.objPos][5];
            this.filter.Q.value = cubeSettings[this.objPos][6];

            this.distortion.set({ distortion: cubeSettings[this.objPos][7] });


            //this.polysynth.volume.value = cubeSettings[this.objPos][0];
            //this.distortion.set({ distortion: cubeSettings[this.objPos][7] });
            //this.filter.frequency.value = cubeSettings[this.objPos][5];
            //this.filter.Q.value = cubeSettings[this.objPos][6];
            //vado a salvare tutti i dati nella matrice delle impostazioni (1° posizione = indice del cubo, 2° posizione = indice dell'impostazione)
            //this.data.volume = cubeSettings[this.objPos][0];
            //this.data.distortion = cubeSettings[this.objPos][7];
            //this.data.attack = cubeSettings[this.objPos][1];
            //this.data.decay = cubeSettings[this.objPos][2];
            //this.data.sustain = cubeSettings[this.objPos][3];
            //this.data.release = cubeSettings[this.objPos][4];

            sendTimeStamp('CambioValore');

            //myWave = "sine"
            /*
            if(cubeSettings[this.objPos][8]  == 1){
                myWave = "sine";
                this.data.sine = cubeSettings[this.objPos][8];
            }
            if(cubeSettings[this.objPos][9] == 1){
                this.data.square = cubeSettings[this.objPos][9];
                myWave = "square";
            }
            if(cubeSettings[this.objPos][10] == 1){
                myWave = "sine";
                this.data.sine = cubeSettings[this.objPos][8];
            }
            */

            //console.log("$$$$$$$$$$$$ " + myWave);
            //console.log("jhfsd" + myWave);

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

            console.log("bb " + cubeSettings1[this.objPos][1]);

            //console.log(this.distortion.get());
            this.polysynth.set({
                /////////////////////////
                oscillator: {
                    type: cubeSettings1[this.objPos][1]//myWave - works only local - "sine" //the type of waveform the synthesizer produces. Can be: square, sine, triangle, or sawtooth
                },
                //////////////////////////////
                envelope: {
                    attackCurve: "exponential",
                    attack: cubeSettings[this.objPos][1],
                    decay: cubeSettings[this.objPos][2],
                    sustain: cubeSettings[this.objPos][3],
                    release: cubeSettings[this.objPos][4],
                }
            });

            //this.polysynth.oscillator.set({ type: iswave });

            //PHASER
            //this.phaser.frequency.value = cubeSettings[this.objPos][6];
            

            //xTEST
            //this.polysynth.oscillator.type.value = cubeSettings[this.objPos][7];

            //this.autoWah.Q.value = cubeSettings[this.objPos][7];
            //this.autoWah.octaves.value = cubeSettings[this.objPos][8];
            //this.chorus.delayTime.value = cubeSettings[this.objPos][7];
            //this.chorus.depth.value = cubeSettings[this.objPos][8];

            /*  Una volta effettuata la sincronizzazione vado a cambiare anche il testo che indica il valore nella GUI corrispondente al cubo  */
            var GUIs = document.querySelectorAll('[text-changer]');
            for (var i = 0; i < GUIs.length; i++) {
                if (GUIs[i].getAttribute('text-changer').indexcube == this.objPos)
                    GUIs[i].dispatchEvent(updateComponent);
            }

        }
        //andranno cambiati quando finisco il cambiamento per la GUI, OUTDATED
        /*volumeChange: function () {
            this.polysynth.volume.value = cubeVolume;
        },
        detuneChange: function () {
            this.polysynth.set({ detune: cubeDetune });

        },
        updateEnvelope: function () {
            this.polysynth.set({
                envelope: {
                    attackCurve: "exponential",
                    attack: cubeEnvelopeAttack,
                    decay: cubeEnvelopeDecay,
                    sustain: cubeEnvelopeSustain,
                    release: cubeEnvelopeRelease,
                }
            });
        },*/
    }
});

/*  Component che aggiunge un synth OUTDATED, per elementi statici  */
/*
AFRAME.registerComponent("pannersynth", {
    schema: {
        nota: { type: 'string', default: 'A1' },
    },

    init: function () {

        let physicalObj = this.el.object3D;
        let pannersynth = new Tone.Panner3D(physicalObj.position.x, physicalObj.position.y, physicalObj.position.z).toDestination();
        let synthet = new Tone.Synth().connect(pannersynth);


        let notaM = this.data.nota;

        //  Eventi in seguito ai messaggi  
        this.el.addEventListener("eventOnSynth", function () {
            riproducisynth = 1;
            synthet.triggerAttack(notaM, "+0", 1);
        });

        this.el.addEventListener("eventOffSynth", function () {
            riproducisynth = 0;
            synthet.triggerRelease();
        });

        //  Evento sul click   //click
        this.el.addEventListener("click", function () { //click-----------
            if (!start) {
                Tone.start();
                start++;
            }
            if (riproducisynth) {
                riproducisynth = 0;
                synthet.triggerRelease();
                NAF.connection.broadcastDataGuaranteed('sentmsg', 'synthoff');
            }
            else {
                riproducisynth = 1;
                synthet.triggerAttack("C2", "+0", 1);
                NAF.connection.broadcastDataGuaranteed('sentmsg', 'synthon');
            }
        });
    }
});
*/

/*  Component che aggiunge un osc OUTDATED, per elementi statici  */
/*
AFRAME.registerComponent("pannerosc", {
    schema: { //frequenza e forma?

    },

    init: function () {
        let physicalObj = this.el.object3D;
        let pannerosc = new Tone.Panner3D(physicalObj.position.x, physicalObj.position.y, physicalObj.position.z).toDestination();
        let osc = new Tone.Oscillator(220, "sine").connect(pannerosc);
        osc.volume.value = -15;

        //Ogni tanto si sentono dei pop quando viene ruotato l'avatar (probabilmente colpa del volume alto)


        // Eventi in seguito ai messaggi  
        this.el.addEventListener("eventOnOsc", function () {
            if (!riproduciosc) {
                riproduciosc = 1;
                osc.start();
            }
        });

        this.el.addEventListener("eventOffOsc", function () {
            if (riproduciosc) {
                riproduciosc = 0;
                osc.stop();
            }

        });

        //  Evento sul click  
        this.el.addEventListener("click", function () { //click-----
            if (!start) {
                Tone.start();
                start++;
            }
            if (riproduciosc) {
                riproduciosc = 0;
                osc.stop();
                NAF.connection.broadcastDataGuaranteed('sentmsg', 'oscoff');
            }
            else {
                riproduciosc = 1;
                osc.start();
                NAF.connection.broadcastDataGuaranteed('sentmsg', 'oscon');
            }
        });
    }
});
*/

/*  assegna correttamente le note ai blocchi musicali  */
/*  externalDrop riceve le note da assegnare al cubo, quando questo viene creato all'esterno, se è vuoto vuol dire che la creazione avviene  */
/*  in locale e poi dopo verrà inviata  */
function notePopuling() {
    var toFill;

    //prima era externalDrop.length != []
    if (externalDrop.length != 0) {
        //console.log("presoDaExternal");
        toFill = externalDrop;
        externalDrop = [];
    }
    else if (musicDrop.length != 0) {
        //console.log("presoDaInternal");
        //console.log(musicDrop);
        toFill = musicDrop;
        musicDrop = [];
    }
    else {
        console.log("Default A1");
        toFill = ["A1"];
    }
    return toFill;
}


/*  Componente che gestisce la memorizzazione delle note nell'array che verrà usato per creare i cubi, si occupa di unire il valore dell'ottava con quello della nota  */
AFRAME.registerComponent('note-mem', {
    schema: {
        addnota: { type: 'string', default: 'A' }
    },
    init: function () {
        this.nota = this.data.addnota + 4;
    },
    events: {
        click: function () { //click------------
            if (!musicDrop.includes(this.nota)) {
                musicDrop.push(this.nota);
                //document.getElementById("notebox").value = musicDrop;
                document.querySelector('#notebox').setAttribute('value', musicDrop);
            }
            console.log(musicDrop);
        },
        changeOctave: function () {
            this.nota = this.data.addnota + octave;
        }
    }
});

/*  Componente che va a cambiare il valore dell'ottava selezionata  */
AFRAME.registerComponent('change-octave', {
    schema: {
        action: { type: 'string' },
    },
    init: function () {
        this.noteSelectors = document.querySelectorAll('[note-mem]');
        octave = 4;
    },
    events: {
        click: function () { //click---------------
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
            document.querySelector("#valoreottava").setAttribute('value', octave);
        }
    }
});


/*  Componente che gestiva il cambiamento del volume dei cubi, OUTDATED  */
/*
AFRAME.registerComponent('change-volume', {
    schema: {
        action: { type: 'string' }
    },

    events: {
        click: function () { //click--------
            var cmd = 'volume:';
            if (this.data.action == 'add') {
                cubeVolume++;
            }
            else if (this.data.action == 'sub') {
                cubeVolume--;
            }

            cmd += cubeVolume;

            document.getElementById("volume-value").setAttribute('value', cubeVolume);

            var cubes = document.querySelectorAll('[polysynth]');
            for (var i = 0; i < cubes.length; i++) {
                cubes[i].dispatchEvent(volumeChange);
            }

            NAF.connection.broadcastDataGuaranteed('setting-commands', cmd);
        }


    }
});
*/

/*  Componente che gestiva il cambiamento del detune dei cubi, OUTDATED  */
/*
AFRAME.registerComponent('change-detune', {
    schema: {
        action: { type: 'string' }
    },

    events: {
        click: function () { //click------------
            var cmd = 'detune:';
            if (this.data.action == 'add') {
                cubeDetune += 100;
            }
            else if (this.data.action == 'sub') {
                cubeDetune -= 100;
            }

            cmd += cubeDetune;

            document.getElementById("detune-value").setAttribute('value', cubeDetune);

            var cubes = document.querySelectorAll('[polysynth]');
            for (var i = 0; i < cubes.length; i++) {
                cubes[i].dispatchEvent(updateEnvelope);
            }

            NAF.connection.broadcastDataGuaranteed('setting-commands', cmd);
        }


    }
});
*/
/*  Componente che gestiva il cambiamento dei valori dell'envelope dei cubi, OUTDATED  */
/*
AFRAME.registerComponent('change-envelope', {
    schema: {
        argument: { type: 'string' },
        action: { type: 'string' }
    },

    events: {
        click: function () { //click------

            var cmd = '';

            switch (this.data.argument) {
                case 'envelope-attack': {

                    cmd = 'envelope-attack:';

                    if (this.data.action == 'add') {
                        cubeEnvelopeAttack += 0.5;
                    }
                    else if (this.data.action == 'sub') {
                        if (cubeEnvelopeAttack > 0)
                            cubeEnvelopeAttack -= 0.5;
                    }

                    cmd += cubeEnvelopeAttack;

                    document.getElementById("attack-value").setAttribute('value', cubeEnvelopeAttack);


                    break;
                }
                case 'envelope-decay': {

                    cmd = 'envelope-decay:';

                    if (this.data.action == 'add') {
                        cubeEnvelopeDecay += 0.5;
                    }
                    else if (this.data.action == 'sub') {
                        if (cubeEnvelopeDecay > 0)
                            cubeEnvelopeDecay -= 0.5;
                    }

                    cmd += cubeEnvelopeDecay;

                    document.getElementById("decay-value").setAttribute('value', cubeEnvelopeDecay);

                    break;
                }

                case 'envelope-sustain': {

                    cmd = 'envelope-sustain:';

                    if (this.data.action == 'add') {

                        cubeEnvelopeSustain += 0.1;
                        if (cubeEnvelopeSustain > 1) cubeEnvelopeSustain = 1;
                    }
                    else if (this.data.action == 'sub') {
                        cubeEnvelopeSustain -= 0.1;
                        if (cubeEnvelopeSustain < 0) cubeEnvelopeSustain = 0;

                    }

                    cmd += cubeEnvelopeSustain;

                    document.getElementById("sustain-value").setAttribute('value', cubeEnvelopeSustain.toFixed(1));

                    break;
                }
                case 'envelope-release': {

                    cmd = 'envelope-release:';

                    if (this.data.action == 'add') {
                        cubeEnvelopeRelease += 0.5;
                    }
                    else if (this.data.action == 'sub') {
                        if (cubeEnvelopeRelease > 0)
                            cubeEnvelopeRelease -= 0.5;
                    }

                    cmd += cubeEnvelopeRelease;

                    document.getElementById("release-value").setAttribute('value', cubeEnvelopeRelease);

                    break;
                }
                default: {
                    console.error("Input Erratto: " + this.data.argument + ": " + this.data.action);
                    break;
                }
            }

            var cubes = document.querySelectorAll('[polysynth]');
            for (var i = 0; i < cubes.length; i++) {
                cubes[i].dispatchEvent(updateEnvelope);
            }

            NAF.connection.broadcastDataGuaranteed('setting-commands', cmd);
        }
    }
});
*/

/*  Componente che va ad applicare le modifiche dei valori delle impostazioni, al testo sulle GUIs  */
AFRAME.registerComponent('text-changer', {
    schema: {
        indexcube: { type: 'int' },
        settingindex: { type: 'int' }
    },

    init: function () {
        //this.data.indexcube = this.el.parentNode.parentNode.id; //mi condivide l'id giusto nell'editor, ma poi nella pagina html rimane l'id networked
        /*var GUIs = document.querySelectorAll('[indexgui]');
        for(var i = 0; i < GUIs.length; i++){
            if(GUIs[i] == this.el.parentNode.parentNode)
                this.data.indexcube = GUIs[i].getAttribute('indexgui').indice - 1;
        }*/

        //Vado a prelevare il valore 'indexgui' del padre del padre dell'elemento in cui mi trovo (questo dovuto a come è strutturata la GUI), mi muovo nel DOM perchè mi è più semplice
        this.data.indexcube = this.el.parentNode.parentNode.getAttribute("indexgui").indice;
        this.el.setAttribute('value', cubeSettings[this.data.indexcube][this.data.settingindex]);
    },
    events: {
        updateComponent: function () {
            this.el.setAttribute('value', cubeSettings[this.data.indexcube][this.data.settingindex]);
        }
    }
});

/*  Componente che va a modificare i valori nella matrice delle impostazioni, una volta che l'entità a cui è attaccato, viene modificata  */
AFRAME.registerComponent('setting-changer', {
    schema: {
        indexcube: { type: 'int' },
        settingindex: { type: 'int' },
        action: { type: 'string' }
    },
    init: function () {
        this.cube;
        //this.data.indexcube = this.el.parentNode.parentNode.id;

        /*var GUIs = document.querySelectorAll('[indexgui]');
        for(var i = 0; i < GUIs.length; i++){
            if(GUIs[i] == this.el.parentNode.parentNode)
                this.data.indexcube = GUIs[i].getAttribute('indexgui').indice - 1;
        }*/
        this.data.indexcube = this.el.parentNode.parentNode.getAttribute("indexgui").indice;
        var cubes = document.querySelectorAll('[polysynth]');
        for (var i = 0; i < cubes.length; i++) {
            if (cubes[i].getAttribute('index').indice == this.data.indexcube)
                this.cube = cubes[i];
        }
    },
    events: {
        click: function () { //click-----
            
            //cambio il valore dell'array
            if (this.data.action == 'add') {
                if (this.data.settingindex == 4 || this.data.settingindex == 1) {//sustain e distortion si modificano con +-0.1 invece che +-0.5
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
                    console.log("-----------------=== " + cubeSettings[this.data.indexcube]);
                }
                if (cubeSettings[this.data.indexcube][this.data.settingindex] < 0 && this.data.settingindex != 0) //detune e volume possono andare sotto 0
                    cubeSettings[this.data.indexcube][this.data.settingindex] = 0;
                /////////////////////////////////----------------------------------------
                
                var wavez = 0;
                
                //SINE
                if(this.data.settingindex == 9)
                {
                    wavez = 1;
                 
                    //cubeSettings[this.data.indexcube][9] = 1;
                    //cubeSettings[this.data.indexcube][8] = 0;
                    //cubeSettings[this.data.indexcube][10] = 0;

                    cubeSettings1[this.data.indexcube][1] = "square";

                }
                //SQUARE
                if(this.data.settingindex == 8)
                {
                    wavez = 2;
                  
                    //cubeSettings[this.data.indexcube][9] = 0;
                    //cubeSettings[this.data.indexcube][8] = 1;
                    //cubeSettings[this.data.indexcube][10] = 0;
                    cubeSettings1[this.data.indexcube][1] = "sine";
                    
                }
                //SAW
                if(this.data.settingindex == 10)
                {
                    wavez = 3;

                    //cubeSettings[this.data.indexcube][9] = 0;
                    //cubeSettings[this.data.indexcube][8] = 0;
                    //cubeSettings[this.data.indexcube][10] = 1;
                    cubeSettings1[this.data.indexcube][1] = "sawtooth";
                }
                

                cubeSettings[this.data.indexcube][9] = wavez;

                console.log("zzzzzzzzzzz " + cubeSettings1[this.data.indexcube][1]);

                console.log("@@@@@@@@@ " + cubeSettings[this.data.indexcube][9]);

                console.log("ssssssss " + cubeSettings[this.data.indexcube][this.data.settingindex]);

                console.log("######### " + cubeSettings[this.data.indexcube][this.data.settingindex]);

                //console.log("one " + this.data.settingindex);
                //console.log("two " + this.data.settingindex);
                //console.log("mywave " + myWave);
                
            }
            
          

            //genero l'evento per la modifica dei valori sul cubo, che a sua volta andrà a generare l'evento che andrà a modificare il testo
            this.cube.dispatchEvent(changeSettings);

            var cmd = '';
            cmd += this.data.indexcube + ':' + this.data.settingindex + ':' + cubeSettings[this.data.indexcube][this.data.settingindex];
            NAF.connection.broadcastDataGuaranteed("update-settings", cmd);
            
            NAF.connection.broadcastDataGuaranteed("test-test", this.data.settingindex);


            //console.log('****EVENT 2: ' + cmd );

            //console.log("++++++++++ " + this.data.settingindex);

        }
    }
});

AFRAME.registerComponent('clear-array', {
    events: {
        click: function () { //click-----------
            musicDrop = [];
            document.querySelector('#notebox').setAttribute('value', musicDrop);
        }
    }
});

//////

function sendTimeStamp(nomeEvento){
    var creationTime = new Date().getTime();
    NAF.connection.broadcastDataGuaranteed("msg-delay", nomeEvento + ':' + creationTime);
    
}

///////////////////////////

/*
AFRAME.registerComponent('rotate-cursor', {
  schema: {
    
  },

  init: function () {
    
    var data = this.data;
    var el = this.el;  // <a-box>
    var getCursor = document.getElementById('myCursor');

    el.addEventListener('mouseenter', function () {
        //console.log("iuyuihi " + number.opacity);
        getCursor.setAttribute('rotation', '0 90 0');
      
    });
    el.addEventListener('mouseleave', function () {
        //el.setAttribute('material', 'color', 'orange');
        getCursor.setAttribute('rotation', '0 0 0');
      
    });
  }
});
*/

AFRAME.registerComponent('rotate-cursor-a', {
    schema: {
      
    },
  
    init: function () {
      
      var data = this.data;
      var el = this.el;  // <a-box>
      var getCursor = document.getElementById('sceneCursor');

      var checkit = false;

      var correctPosition = getCursor.getAttribute('position');


/*
      el.addEventListener('mouseenter', function (evt) {

        //var correctPosition = evt.detail.intersection.point;
        //correctPosition.y = 0.550;

        console.log("lnjdfkjsdjkf> " + getCursor.getAttribute('rotation')['x']);
        
        if(evt.detail.intersection.object.el.id=="ground1"){
            if(evt.detail.intersection.distance < 5){
                //var correctPosition = evt.detail.intersection.point;
                getCursor.setAttribute('position', evt.detail.intersection.point);
                getCursor.setAttribute('rotation', {x: 45, y: 0, z: 90});
                //checkit = false;
            }
            console.log("%%%% " + evt.detail.intersection.distance);
            //console.log("data: ----------> "+ evt.detail.intersection.object.el.position);
            
            

        }else{
            getCursor.setAttribute('rotation', {x: 0, y: 0, z: 0});
            getCursor.setAttribute('position', correctPosition);
            checkit = true;
        }
        
      });
      
      if(checkit == true){
        getCursor.setAttribute('rotation', {x: 0, y: 0, z: 0});
        getCursor.setAttribute('position', correctPosition);
        checkit == false;
      }

      */
    }

  });


////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('change-wave', {
    schema: {
        action: { type: 'string' },
    },
    init: function () {
        this.noteSelectors = document.querySelectorAll('[note-mem]');
        octave = 4;
    },
    events: {
        click: function () { //click---------------
            if (this.data.action == "sine") {
                myWave = wavesetting[0];
            }
            else if (this.data.action == "square") {
                myWave = wavesetting[1];
            }
            else if(this.data.action == "sawtooth"){
                myWave = wavesetting[2];
            }

            console("---> " + myWave);
            /*
            for (var i = 0; i < this.noteSelectors.length; i++) {
                this.noteSelectors[i].dispatchEvent(changeOctave);
            }
            document.querySelector("#valoreottava").setAttribute('value', octave);
            */
        }
    }
});
