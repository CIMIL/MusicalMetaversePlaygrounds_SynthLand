//Essentia js
import { EssentiaWASM } from 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.es.js';
import Essentia from 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-core.es.js';

//FOR HCPC
//CHECK HERE: https://github.com/MTG/essentia.js/blob/dev/examples/demos/hpcp-chroma-rt/index.html

let essentia = new Essentia(EssentiaWASM);

class EssentiaWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.essentia = essentia;
    console.log(
      'Backend - essentia:' +
        this.essentia.version +
        '- http://essentia.upf.edu'
    );
  }

  //System-invoked process callback function.
  process(inputs, outputs, parameters) {
    // <inputs> and <outputs> will have as many as were specified in the options passed to the AudioWorkletNode constructor, each subsequently spanning potentially multiple channels
    let input = inputs[0];
    let output = outputs[0];
    // convert the input audio frame array from channel 0 to a std::vector<float> type for using it in essentia
    let vectorInput = this.essentia.arrayToVector(input[0]);
    // In this case we compute the Root Mean Square of every input audio frame
    // check https://mtg.github.io/essentia.js/docs/api/Essentia.html#RMS
    let rmsFrame = this.essentia.RMS(vectorInput); 
    if(rmsFrame.rms >= 0.001) {
      let hpcp = this.essentia.TonalExtractor(vectorInput);
      //let hpcp = this.essentia.hpcpExtractor(vectorInput);
      //const scaledHPCP = hpcp.map(i => 100* Math.tanh(Math.pow(i*0.5, 2)));
      this.port.postMessage(hpcp.chords_key);
      //console.log(`scaled: ${scaledHPCP}`);
    }   
    //Outputs
    output[0][0] = rmsFrame.rms;  
    return true; // keep the process running
  }
}

registerProcessor('essentia-worklet-processor', EssentiaWorkletProcessor); // must use the same name we gave our processor in `createEssentiaNode`
