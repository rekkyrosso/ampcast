import AudioManager from 'types/AudioManager';
import {WaveformVisualizer} from 'types/Visualizer';
import {isFullscreenMedia} from 'utils';
import theme from 'services/theme';
import WaveformPlayer from './WaveformPlayer';

export default class BeatsPlayer extends WaveformPlayer {
    #color = '';

    private readonly visualizer: WaveformVisualizer = {
        providerId: 'waveform',
        name: 'beats',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const barCount = 10;
                const visualBarCount = barCount - 2;
                const isFullscreen = isFullscreenMedia()
                const gapWidth = isFullscreen ? 5 : 3;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const barWidth = (width - gapWidth * visualBarCount) / visualBarCount;
                const heightFactor = height / 128;
                const chunkSize = bufferSize / barCount;
                const stop = bufferSize - 2 * chunkSize;
                const minHeight = isFullscreen ? 12 : 8;
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = this.color;
                context2D.strokeStyle = 'rgba(0, 0, 0, .9)';
                context2D.lineWidth = isFullscreen ? 2 : 1;
                let x = 2;
                for (let i = 0; i < stop; i += chunkSize) {
                    const chunkAverageValue =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    const barHeight = heightFactor * chunkAverageValue + minHeight;
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
        return this.#color || `rgba(255, 255, 255, ${isFullscreenMedia() ? 0.4 : 0.6})`;
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
