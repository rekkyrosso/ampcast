type SimpleAudioAnalyser = Pick<
    AnalyserNode,
    | 'fftSize'
    | 'frequencyBinCount'
    | 'getByteFrequencyData'
    | 'getByteTimeDomainData'
    | 'getFloatFrequencyData'
>;

export default SimpleAudioAnalyser;
