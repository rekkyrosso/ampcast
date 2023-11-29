import AudioManager from 'types/AudioManager';
import {WaveformVisualizer} from 'types/Visualizer';
import WaveformPlayer from 'services/visualizer/waveform/WaveformPlayer';

export default class BeatsPlayer extends WaveformPlayer {
    private readonly visualizer: WaveformVisualizer = {
        providerId: 'waveform',
        name: 'beats',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const barCount = 12;
                const gapWidth = 4;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = `rgba(255, 255, 255, ${
                    document.fullscreenElement ? 0.45 : 0.6
                })`;
                context2D.strokeStyle = 'rgba(0, 0, 0, .9)';
                context2D.shadowColor = 'rgba(0, 0, 0, .6)';
                context2D.lineWidth = 1;
                context2D.shadowBlur = 2;
                context2D.shadowOffsetX = 2;
                context2D.shadowOffsetY = 2;
                const barWidth = (width - gapWidth * barCount) / barCount;
                const heightFactor = height * 0.0075;
                const chunkSize = bufferSize / barCount;
                let barHeight;
                let x = gapWidth;
                for (let i = 0; i < bufferSize; i += chunkSize) {
                    const chunkAverageValue =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    barHeight = heightFactor * chunkAverageValue;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2 + 4);
                    context2D.strokeRect(x, height - barHeight / 2, barWidth, barHeight / 2 + 4);
                    x += barWidth + gapWidth;
                }
            },
        },
    };

    constructor(audio: AudioManager, name = 'beats') {
        super(audio, name);
    }

    load(): void {
        super.load(this.visualizer);
    }
}
