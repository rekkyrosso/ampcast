import {WaveformVisualizer} from 'types/Visualizer';
import {isFullscreenMedia} from 'utils';
import theme from 'services/theme';

const visualizers: WaveformVisualizer[] = [
    {
        providerId: 'waveform',
        name: 'time-domain-test',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const sliceWidth = width / bufferSize;
                let x = 0;
                context2D.clearRect(0, 0, width, height);
                context2D.lineWidth = Math.round(theme.fontSize / (isFullscreenMedia() ? 2 : 4));

                const dataArray = new Uint8Array(bufferSize);
                analyser.getByteTimeDomainData(dataArray);
                context2D.beginPath();
                context2D.strokeStyle = 'lime';
                x = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const v = dataArray[i] / 255;
                    const y = v * height;
                    if (i === 0) {
                        context2D.moveTo(x, y);
                    } else {
                        context2D.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                context2D.stroke();

                const dataArray2 = new Float32Array(bufferSize);
                analyser.getFloatTimeDomainData(dataArray2);
                context2D.beginPath();
                context2D.strokeStyle = 'red';
                x = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const v = dataArray2[i] * height;
                    const y = (height + v) / 2;
                    if (i === 0) {
                        context2D.moveTo(x, y);
                    } else {
                        context2D.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                context2D.stroke();
            },
        },
    },
    {
        providerId: 'waveform',
        name: 'frequency-domain-test',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const visualBarCount = bufferSize;
                const barWidth = width / visualBarCount;
                let x = 0;
                context2D.clearRect(0, 0, width, height);

                const dataArray = new Uint8Array(bufferSize);
                analyser.getByteFrequencyData(dataArray);
                context2D.fillStyle = 'lime';
                x = 0;
                for (let i = 0; i < visualBarCount; i++) {
                    const value = dataArray[i];
                    const barHeight = height * (value / 128);
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth;
                }

                const dataArray2 = new Float32Array(bufferSize);
                const {minDecibels, maxDecibels} = analyser;
                analyser.getFloatFrequencyData(dataArray2);
                context2D.fillStyle = 'red';
                x = 0;
                for (let i = 0; i < visualBarCount; i++) {
                    const value = dataArray2[i];
                    const barHeight = height * (-(value - minDecibels) / maxDecibels) + maxDecibels;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth;
                }
            },
        },
    },
];

export default visualizers;
