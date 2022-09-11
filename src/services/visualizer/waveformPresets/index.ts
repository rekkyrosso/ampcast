import {WaveformVisualizer} from 'types/Visualizer';
import theme from 'services/theme';

const mdn =
    'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API';

function getThemeColor(): string {
    return theme.isLight && theme.isFrameLight ? theme.frameColor : theme.textColor;
}

const presets: WaveformVisualizer[] = [
    {
        provider: 'waveform',
        name: 'wave',
        externalUrl: `${mdn}#creating_a_waveformoscilloscope`,
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const sliceWidth = width / bufferSize;
                let x = 0;
                context2D.lineWidth = Math.round(theme.fontSize / 4);
                context2D.clearRect(0, 0, width, height);
                context2D.strokeStyle = getThemeColor();
                context2D.beginPath();
                analyser.getByteTimeDomainData(dataArray);
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
                context2D.lineTo(width, height / 2);
                context2D.stroke();
            },
        },
    },
    {
        provider: 'waveform',
        name: 'bars',
        externalUrl: `${mdn}#creating_a_frequency_bar_graph`,
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const barCount = 16;
                const gapWidth = 2;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = getThemeColor();
                const barWidth = (width - gapWidth * (barCount - 1)) / barCount;
                const heightFactor = height * 0.005;
                const chunkSize = bufferSize / barCount;
                let barHeight;
                let x = 0;
                for (let i = 0; i < bufferSize; i += chunkSize) {
                    const chunkAverageValue =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    barHeight = heightFactor * chunkAverageValue;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth + gapWidth;
                }
            },
        },
    },
];

export default presets;
