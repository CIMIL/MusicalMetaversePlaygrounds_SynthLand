let micStream;
let micNode;
let analyser;
let featureExtractorNode;
let analyserDataArray = null;
let audioCtx;
let essentiaNode;
let init = false;
let dataArray;
let chord;

let x = 0;

//Tonejs - FFT
const meter = new Tone.Meter();
const fft = new Tone.FFT(256);
const toneMic = new Tone.UserMedia();
var toneRms = null;
var toneFFT = null;

//Microphone
let micEnabled;
let started = false;

//Create audio worklet for essentia js
async function createEssentiaNode(audioCtx) {
  let url = './js/SecondPlayground/essentia-process.js';
  await audioCtx.audioWorklet.addModule(url);
  return new AudioWorkletNode(audioCtx, 'essentia-worklet-processor'); // instantiate our custom processor as an AudioWorkletNode
}

function loop() {
  analyserProc.getFloatTimeDomainData(analyserDataArray);
  analyser.getFloatTimeDomainData(dataArray);

  featureExtractorNode.port.onmessage = (e) => {
    chord = e.data;
    sendTimeStamp('CHORD');
  };

  //get tonejs rms and fft
  meter.getValue();
  toneRms = meter._rms;
  //console.log("Tone: " + meter._rms);
  //console.log("Essentia: " + analyserDataArray[0]);
  toneFFT = fft.getValue();
  //console.log(toneFFT)
}

function getEsSamples() {
  analyser.getFloatTimeDomainData(dataArray);
  //console.log(dataArray)
  return dataArray;
}

function start() {
  requestMicAccess()
    .then(startAudioProcessing)
    .then(() => {
      setInterval(loop, 10);
    })
    .catch((err) => {
      if (err.name == 'NotAllowedError') {
        alert(
          'Could not access microphone - Please allow microphone access for this site'
        );
      } else {
        alert(err);
        console.log('Exception name: ', err.name);
        throw err;
      }
    });
}

async function requestMicAccess() {
  console.log('Initializing mic stream...');

  let micStream = await navigator.mediaDevices.getUserMedia({
    //audio: true,
    video: false,
    audio:{
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
      latency: 0,
    },
    sampleRate: 48000,
  });
  return micStream;
}

async function startAudioProcessing(stream) {
  micStream = stream;

  if (!micStream.active) {
    throw 'Mic stream not active';
  }

  if (audioCtx.state == 'closed') {
    audioCtx = new AudioContext({ latencyHint: 0.00001});
  } else if (audioCtx.state == 'suspended') {
    audioCtx.resume();
  }

  micNode = audioCtx.createMediaStreamSource(micStream);

  analyser = audioCtx.createAnalyser();
  analyserProc = audioCtx.createAnalyser();

  analyser.fftSize = 256; // twice the web audio quantum (blocks of 128 samples)
  dataArray = new Float32Array(analyser.frequencyBinCount);

  analyserProc.fftSize = 256; // twice the web audio quantum (blocks of 128 samples)
  analyserDataArray = new Float32Array(analyserProc.frequencyBinCount);

  featureExtractorNode = await createEssentiaNode(audioCtx);
  init = true;
  //console.log(featureExtractorNode);

  micNode.connect(analyser);

  micNode.connect(featureExtractorNode);
  featureExtractorNode.connect(analyserProc);
}

function stop() {
  console.error('Error');
}

//Set mute button -- onConnect() called by Networked-Aframe when connected to server
function onConnect() {
  console.log('onConnect', new Date());

  const micBtnEle = document.getElementById('mic-btn');
  NAF.connection.adapter.enableMicrophone(false);

  // Handle mic button click (Mute and Unmute)
  micBtnEle.addEventListener('click', function () {
    NAF.connection.adapter.enableMicrophone(true);
    micEnabled = !micEnabled;
    micBtnEle.textContent = micEnabled ? 'Mute Mic' : 'Unmute Mic';

    //tonejs init
    toneMic.open();
    toneMic.connect(meter);
    toneMic.connect(fft);
    Tone.context.resume();

    NAF.connection.subscribeToDataChannel("msg-delay", calculateDelay);

    if (audioCtx == undefined || audioCtx.state == 'closed') {
      audioCtx = new AudioContext({ latencyHint: 0.00001});
    } else if (audioCtx.state == 'suspended') {
      audioCtx.resume();
    }
    //start/stop audio analysis
    if (!started) {
      start();
      started = true;
    } else {
      stop();
    }
  });
}

window.onload = () => {
  AudioContext = window.AudioContext || window.webkitAudioContext;
  micEnabled = true;
};

////////////////// Other

function calculateDelay(senderId, dataType, data, targetObj){
  var event = data.split(':')[0];
  var generatedTime = data.split(':')[1];
  var receivedTime = new Date().getTime();
  var timeDelay = receivedTime - generatedTime;

  console.log('Evento: ' + event + ' _ '+ senderId);
  console.log('Generated Time: ' + (parseInt(generatedTime)).toString() + ' ... ' +  'Received Time: ' + (parseInt(receivedTime)).toString() + ' ... ' +'Starting time: ' + new Date(parseInt(generatedTime)).toString() + ', Received time: ' + new Date(receivedTime).toString() + ', Time delay: '  + timeDelay + ' ms');
}

function sendTimeStamp(nameEvent){
  var creationTime = new Date().getTime();
  NAF.connection.broadcastDataGuaranteed("msg-delay", nameEvent + ':' + creationTime);
}