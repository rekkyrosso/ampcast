type SimpleAudioAnalyser = Pick<
    AnalyserNode,
    'fftSize' | 'frequencyBinCount' | 'getByteFrequencyData' | 'getByteTimeDomainData'
>;

export default SimpleAudioAnalyser;
