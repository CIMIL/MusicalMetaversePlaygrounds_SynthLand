//OUTDATED
{
    eventOnSynth = new Event('eventOnSynth');
    eventOffSynth = new Event('eventOffSynth');
    eventOnOsc = new Event('eventOnOsc');
    eventOffOsc = new Event('eventOffOsc');
}


//Events
eventOn = new Event('eventOn');
eventOff = new Event('eventOff');
changeSettings = new Event('changeSettings');  //Update notes settings
updateComponent = new Event('updateComponent');  //Update text
changeOctave = new Event("changeOctave");  //Update Octaves

NAF.options.updateRate = 15; //?

var textCheck = '';
newClient = 0;

function onConnect() {
    //Increment the index when a new entity is created
    document.body.addEventListener('entityCreated', function (evt) {
        if (evt.detail.el.getAttribute('index') != null)
            if (evt.detail.el.getAttribute('index').indice != undefined)
                index++;
    });

    //callbacks
    NAF.connection.subscribeToDataChannel("initializedData", sendDataForInitialization);
    NAF.connection.subscribeToDataChannel("arraynote", createArray);
    NAF.connection.subscribeToDataChannel("arraymusic", fillMusicalArray);
    NAF.connection.subscribeToDataChannel("onconnect-setting", setSettings);
    NAF.connection.subscribeToDataChannel("cube-commands", musicObjectManager);
    NAF.connection.subscribeToDataChannel("note-received", noteSet);
    NAF.connection.subscribeToDataChannel("update-settings", updateSettings)

    NAF.connection.subscribeToDataChannel("msg-delay", calculateDelay);
    NAF.connection.broadcastDataGuaranteed("initializedData", NAF.clientId)
    
    //just for testing
    NAF.connection.subscribeToDataChannel("test-test", testTest);

    document.body.addEventListener('clientConnected', function (evt) {
        if (evt.detail.clientId == newClient) {

            var cubes = document.querySelectorAll('[polysynth]');
            var arrayNote = [];

            for (var i = 0; i < cubes.length; i++) {
                var index = cubes[i].getAttribute('index').indice;
                arrayNote[index] = cubes[i].getAttribute('polysynth').note;
            }

            NAF.connection.sendDataGuaranteed(evt.detail.clientId, "arraynote", arrayNote); //Send array with all notes
            NAF.connection.sendDataGuaranteed(evt.detail.clientId, "arraymusic", arrayMusic);  //send state of musical objects
            NAF.connection.sendDataGuaranteed(evt.detail.clientId, "onconnect-setting", cubeSettings); //send matrix with values of each musical object
            
        }
    });
}

// Listener OUTDATED,
NAF.connection.subscribeToDataChannel('sentmsg', function (senderId, dataType, data, targetId) {

    let objSynth1 = document.querySelector("#synth1");
    let objOsc1 = document.querySelector("#osc1");

    switch (data) {
        case 'synthon': {
            objSynth1.dispatchEvent(eventOnSynth);
        } break;
        case 'synthoff': {
            objSynth1.dispatchEvent(eventOffSynth);
        } break;
        case 'oscon': {
            objOsc1.dispatchEvent(eventOnOsc);
        } break;
        case 'oscoff': {
            objOsc1.dispatchEvent(eventOffOsc);
        } break;
        default: break;
    }
});


// Outdated
AFRAME.registerComponent("msgsender", {
    schema: {
        musictype: { type: 'string', default: '' },
    },
    init: function () {
        let switchCase = this.data.musictype;

        this.el.addEventListener("click", function () {
            switch (switchCase) {
                case 'synth': {
                    if (riproducisynth) {
                        NAF.connection.broadcastDataGuaranteed('sentmsg', 'synthon');
                    }
                    else {
                        NAF.connection.broadcastDataGuaranteed('sentmsg', 'synthoff');
                    }
                }; break;

                case 'osc': {
                    if (riproduciosc) {
                        NAF.connection.broadcastDataGuaranteed('sentmsg', 'oscon');
                    }
                    else {
                        NAF.connection.broadcastDataGuaranteed('sentmsg', 'oscoff');
                    }
                }; break;

                default: break;
            }
        });
    }
});

function createArray(senderId, dataType, data, targetObj) {
    //arrayNote [["D1","C2"],["B2","C3"], null,
    var cubes = document.querySelectorAll('[polysynth]');
    for (var i = 0; i < data.length; i++) {
        var index = cubes[i].getAttribute('index').indice;
        cubes[i].setAttribute('polysynth', 'note', data[index]);
        console.log(cubes[i].getAttribute('polysynth').note);
    }
}

//Activate and Deactivate the musical elements depending on the messaages received
/*  Funzione che va ad attivare e disattivare i cubi a seconda dei messaggi che gli vengono inviati  */
function musicObjectManager(senderId, dataType, data, targetObj) {
    var cmd = data.split('-'); // command-index es: 1-on, 23-off
    var ind = cmd[0];
    var acc = cmd[1];
    var cubes = document.querySelectorAll('[index]');
    //console.log(data); 
    for (var i = 0; i < cubes.length; i++) {
        if (cubes[i].getAttribute('index').indice == ind) {
            if (acc == 'on') {
                textCheck = '_on';
                cubes[i].dispatchEvent(eventOn);
            }
            else if (acc == 'off') {
                textCheck = 'off_';
                cubes[i].dispatchEvent(eventOff);
            }
        }
    }
}

//Save data when a user creates a new musical object and sends it to other clients
function noteSet(senderId, dataType, data, targetObj) {
    externalDrop = data;
}

//To identify if musical objects are active or not
function fillMusicalArray(senderId, dataType, data, targetObj) {
    arrayMusic = data;
}

//When a client connects, it received the matrix
function setSettings(senderId, dataType, data, targetObj) {
    cubeSettings = data;
    var cubes = document.querySelectorAll('[polysynth]');
    for (var i = 0; i < cubes.length; i++) {
        //this event applies all settings to the client's musical objects
        cubes[i].dispatchEvent(changeSettings);
    }
}

//Avoid clients to overwrite their settings
function sendDataForInitialization(senderId, dataType, data, targetObj) {
    //console.log(data);
    newClient = data;
}

//When other clients modify properties on musical objects
function updateSettings(senderId, dataType, data, targetObj) {
    //Message idex cube : index setting : new value
    var cmd = data.split(':');
    var cubeInd = cmd[0];
    var cube;
    var cubes = document.querySelectorAll('[index]');
    for (var i = 0; i < cubes.length; i++) {
        if (cubes[i].getAttribute('index').indice == cubeInd)
            cube = cubes[i];
    }
    cubeSettings[cmd[0]][cmd[1]] = cmd[2];
    cube.dispatchEvent(changeSettings);
}

/////////////////////////////////////////////////////////////////////

// Other functions
function calculateDelay(senderId, dataType, data, targetObj){
    var event = data.split(':')[0];
    var generatedTime = data.split(':')[1];
    var receivedTime = new Date().getTime();
    var timeDelay = generatedTime -receivedTime;
    //console.log('Event: ' + event + ' _ '+ senderId);
    //console.log('Starting time: ' + new Date(parseInt(generatedTime)).toString() + ', Received time: ' + new Date(receivedTime).toString() + ', Time delay: '  + timeDelay + ' ms');
}


function myMessages(senderId, dataType, data, targetObj) {
    myMsg = data;
}

function testTest(senderId, dataType, data, targetOb){
        myDatas = data;
        //console.log('my test: ' + myDatas);
}