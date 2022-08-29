import {WaveformVisualizer} from 'types/Visualizer';
import theme from 'services/theme';

const mdn = 'https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode';

function getThemeColor(): string {
    return theme.isLight && theme.isFrameLight ? theme.frameColor : theme.textColor;
}

const presets: WaveformVisualizer[] = [
    {
        provider: 'waveform',
        name: 'wave',
        externalUrl: `${mdn}/getByteTimeDomainData#examples`,
        config: {
            fftSize: 2048,
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const sliceWidth = width / bufferSize;
                let x = 0;
                context2D.lineWidth = 2;
                context2D.clearRect(0, 0, width, height);
                context2D.strokeStyle = getThemeColor();
                context2D.beginPath();
                analyser.getByteTimeDomainData(dataArray);
                for (let i = 0; i < bufferSize; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * height) / 2;
                    if (i === 0) {
                        context2D.moveTo(x, y);
                    } else {
                        context2D.lineTo(x, y);
                    }
                    x += sliceWidth;
                }
                context2D.lineTo(width, height / 2);
                context2D.stroke();
            },
        },
    },
    {
        provider: 'waveform',
        name: 'bars',
        externalUrl: `${mdn}/getByteFrequencyData#examples`,
        config: {
            fftSize: 64,
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = getThemeColor();
                const barWidth = (width / bufferSize) * 2.5;
                let barHeight;
                let x = 0;
                for (let i = 0; i < bufferSize; i++) {
                    barHeight = dataArray[i];
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth + 1;
                }
            },
        },
    },
];

export default presets;