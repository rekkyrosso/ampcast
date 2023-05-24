type SimpleAudioAnalyser = Pick<
    AnalyserNode,
    | 'fftSize'
    | 'frequencyBinCount'
    | 'getByteFrequencyData'
    | 'getByteTimeDomainData'
    | 'getFloatFrequencyData'
    | 'getFloatTimeDomainData'
>;

export default SimpleAudioAnalyser;
