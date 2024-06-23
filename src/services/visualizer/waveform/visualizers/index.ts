import {WaveformVisualizer} from 'types/Visualizer';
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
                context2D.lineWidth = Math.round(
                    theme.fontSize / (document.fullscreenElement ? 2 : 4)
                );
                context2D.clearRect(0, 0, width, height);
                context2D.strokeStyle = getThemeColor();
                context2D.beginPath();
                let x = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const v = dataArray[i] / 128;
                    const y = (v * height) / 2;
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
                const gapWidth = document.fullscreenElement ? 8 : 4;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const barWidth = (width - gapWidth * (visualBarCount - 1)) / visualBarCount;
                const heightFactor = height / 128;
                const chunkSize = bufferSize / barCount;
                const stop = bufferSize - 2 * chunkSize;
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = getThemeColor();
                let x = 0;
                for (let i = 0; i < stop; i += chunkSize) {
                    const chunkAverageValue =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    const barHeight = heightFactor * chunkAverageValue;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth + gapWidth;
                }
            },
        },
    },
];

export default visualizers;
