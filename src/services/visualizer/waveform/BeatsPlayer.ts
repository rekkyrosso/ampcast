import AudioManager from 'types/AudioManager';
import {WaveformVisualizer} from 'types/Visualizer';
import theme from 'services/theme';
import WaveformPlayer from 'services/visualizer/waveform/WaveformPlayer';

export default class BeatsPlayer extends WaveformPlayer {
    #color = '';

    private readonly visualizer: WaveformVisualizer = {
        providerId: 'waveform',
        name: 'beats',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const barCount = 12;
                const visualBarCount = barCount - 2;
                const gapWidth = 4;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = this.color;
                context2D.strokeStyle = 'rgba(0, 0, 0, .9)';
                context2D.lineWidth = document.fullscreenElement ? 2 : 1;
                const barWidth = (width - gapWidth * visualBarCount) / visualBarCount;
                const heightFactor = height * 0.0075;
                const chunkSize = bufferSize / barCount;
                const stop = bufferSize -  2 * chunkSize;
                let x = gapWidth;
                for (let i = 0; i < stop; i += chunkSize) {
                    const chunkAverageValue =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    const barHeight = heightFactor * chunkAverageValue;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2 + 4);
                    context2D.strokeRect(x, height - barHeight / 2, barWidth, barHeight / 2 + 4);
                    x += barWidth + gapWidth;
                }
            },
        },
    };

    constructor(audio: AudioManager) {
        super(audio, 'beats');
    }

    get color(): string {
        return this.#color || `rgba(255, 255, 255, ${document.fullscreenElement ? 0.4 : 0.6})`;
    }

    set color(color: string) {
        this.#color = color;
    }

    load(): void {
        super.load(this.visualizer);
    }

    resize(parentWidth: number): void {
        const width = Math.min(Math.max(parentWidth / 3, theme.fontSize * 9), 360);
        super.resize(width, width * 0.225);
    }
}
