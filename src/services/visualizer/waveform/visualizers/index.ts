import {WaveformVisualizer} from 'types/Visualizer';
import {isFullscreenMedia} from 'utils';
import theme from 'services/theme';

function getThemeColor(): string {
    return theme.isLight && theme.isFrameLight
        ? theme.frameColor
        : theme.isTextLight
        ? theme.textColor
        : theme.frameTextColor;
}

const visualizers: WaveformVisualizer[] = [
    {
        providerId: 'waveform',
        name: 'wave',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const sliceWidth = width / bufferSize;
                analyser.getByteTimeDomainData(dataArray);
                context2D.lineWidth = Math.round(theme.fontSize / (isFullscreenMedia() ? 2 : 4));
                context2D.clearRect(0, 0, width, height);
                context2D.strokeStyle = getThemeColor();
                context2D.beginPath();
                let x = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const y = (dataArray[i] / 255) * height;
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
        name: 'bars',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const barCount = 18;
                const visualBarCount = barCount - 2;
                const gapWidth = isFullscreenMedia() ? 8 : 4;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const barWidth = (width - gapWidth * (visualBarCount - 1)) / visualBarCount;
                const chunkSize = bufferSize / barCount;
                const stop = bufferSize - 2 * chunkSize;
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = getThemeColor();
                let x = 0;
                for (let i = 0; i < stop; i += chunkSize) {
                    const value =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    const barHeight = height * (value / 128);
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth + gapWidth;
                }
            },
        },
    },
    {
        providerId: 'waveform',
        name: 'graph',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const {minDecibels, maxDecibels, frequencyBinCount: bufferSize} = analyser;
                const dataArray = new Float32Array(bufferSize);
                const visualBarCount = Math.floor(bufferSize * 0.875);
                const barWidth = width / visualBarCount;
                analyser.getFloatFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = getThemeColor();
                let x = 0;
                for (let i = 0; i < visualBarCount; i++) {
                    const value = dataArray[i];
                    const barHeight = height * (-(value - minDecibels) / maxDecibels) + maxDecibels;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth;
                }
            },
        },
    },
];

export default visualizers;
