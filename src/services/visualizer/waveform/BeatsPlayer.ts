import {distinctUntilChanged, map} from 'rxjs';
import AudioManager from 'types/AudioManager';
import LinearType from 'types/LinearType';
import {WaveformVisualizer} from 'types/Visualizer';
import {isFullscreenMedia, isMiniPlayer} from 'utils';
import theme from 'services/theme';
import {observeCurrentItem} from 'services/mediaPlayback/playback';
import WaveformPlayer from './WaveformPlayer';

export default class BeatsPlayer extends WaveformPlayer {
    #beatsColor = '';
    #waveColor = '';
    #style: 'beats' | 'wave' = 'beats';

    private readonly beats: WaveformVisualizer = {
        providerId: 'waveform',
        name: 'beats',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const barCount = 10;
                const visualBarCount = barCount - 2;
                const unit = width / 480;
                const gapWidth = Math.round(unit * 5) || 1;
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const barWidth = (width - gapWidth * visualBarCount) / visualBarCount;
                const heightFactor = height / 128;
                const chunkSize = bufferSize / barCount;
                const stop = bufferSize - 2 * chunkSize;
                const minBarHeight = Math.round(unit * 12);
                analyser.getByteFrequencyData(dataArray);
                context2D.clearRect(0, 0, width, height);
                context2D.fillStyle = this.beatsColor;
                context2D.strokeStyle = 'rgba(0, 0, 0, .9)';
                context2D.lineWidth = Math.round(unit * 2) || 1;
                let x = 2;
                for (let i = 0; i < stop; i += chunkSize) {
                    const chunkAverageValue =
                        dataArray
                            .slice(i, i + chunkSize)
                            .reduce((total, value) => total + value, 0) / chunkSize;
                    const barHeight = heightFactor * chunkAverageValue + minBarHeight;
                    context2D.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2 + 4);
                    context2D.strokeRect(x, height - barHeight / 2, barWidth, barHeight / 2 + 4);
                    x += barWidth + gapWidth;
                }
            },
        },
    };

    private readonly wave: WaveformVisualizer = {
        providerId: 'waveform',
        name: 'wave',
        config: {
            onPaint: ({context2D, width, height, analyser}) => {
                const bufferSize = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferSize);
                const sliceWidth = width / bufferSize;
                const unit = width / 480;
                analyser.getByteTimeDomainData(dataArray);
                context2D.lineWidth = Math.round(unit * 4) || 1;
                context2D.clearRect(0, 0, width, height);
                context2D.strokeStyle = this.waveColor;
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
    };

    constructor(audio: AudioManager) {
        super(audio, 'visualizer-beats');

        observeCurrentItem()
            .pipe(
                map((item) =>
                    !item?.linearType || item.linearType === LinearType.MusicTrack
                        ? 'beats'
                        : 'wave'
                ),
                distinctUntilChanged()
            )
            .subscribe((style) => (this.style = style));
    }

    get beatsColor(): string {
        return this.#beatsColor || `rgba(255, 255, 255, ${isFullscreenMedia() ? 0.4 : 0.6})`;
    }

    set beatsColor(color: string) {
        this.#beatsColor = color;
    }

    get style(): 'beats' | 'wave' {
        return this.#style;
    }

    set style(style: 'beats' | 'wave') {
        this.#style = style;
        super.load(style === 'beats' ? this.beats : this.wave);
    }

    get waveColor(): string {
        return this.#waveColor || '#ffffff';
    }

    set waveColor(color: string) {
        this.#waveColor = color;
    }

    load(): void {
        super.load(this.style === 'beats' ? this.beats : this.wave);
    }

    resize(parentWidth: number): void {
        const maxWidth = document.body.clientWidth / 4;
        const width = Math.min(
            Math.max(parentWidth / 3, theme.fontSize * 11.25),
            isFullscreenMedia() ? (isMiniPlayer ? maxWidth * 3 : maxWidth) : maxWidth * 0.75
        );
        super.resize(width, width * 0.225);
    }
}
