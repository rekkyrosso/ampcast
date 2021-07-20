import type {Observable} from 'rxjs';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import audioMotionPresets from './audioMotionPresets';
import AbstractVisualizer from './AbstractVisualizer';
import Logger from 'utils/Logger';

const logger = new Logger('AudioMotion');

// const myGradient: GradientOptions = {
//     bgColor: '#ffffff', // background color (optional) - defaults to '#111'
//     dir: 'h', // add this property to create a horizontal gradient (optional)
//     colorStops: [
//         // list your gradient colors in this array (at least 2 entries are required)
//         'cyan', // colors may be defined in any valid CSS format
//         {pos: 0.6, color: 'lime'}, // use an object to adjust the position (0 to 1) of a color
//         'yellow', // colors may be defined in any valid CSS format
//     ],
// };

export default class AudioMotion extends AbstractVisualizer<string> {
    private readonly element: HTMLElement;
    private readonly visualizer: AudioMotionAnalyzer;
    private audioSourceNode: AudioNode;

    constructor(audioContext: AudioContext, audioSourceNode$: Observable<AudioNode>) {
        super();

        const container = (this.element = document.createElement('div'));

        container.hidden = true;
        container.className = `visualizer visualizer-audiomotion`;

        this.audioSourceNode = audioContext.createMediaElementSource(new Audio());

        const visualizer = (this.visualizer = new AudioMotionAnalyzer(container, {
            source: this.audioSourceNode,
            showBgColor: false,
            overlay: true,
            showScaleX: false,
            showScaleY: false,
            connectSpeakers: false,
        }));

        audioSourceNode$.subscribe((audioSourceNode) => {
            this.audioSourceNode = audioSourceNode;
            if (!this.element.hidden) {
                visualizer.connectInput(audioSourceNode);
            }
        });

        // visualizer.registerGradient('my-grad', myGradient);
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.element.hidden !== hidden) {
            this.element.hidden = hidden;
            if (hidden) {
                this.visualizer.disconnectInput();
            } else {
                this.visualizer.connectInput(this.audioSourceNode);
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.element);
    }

    load(presetName: string): void {
        logger.log('load');
        const preset = audioMotionPresets.find((preset) => preset.name === presetName);
        if (preset) {
            logger.log(`Using AudioMotion preset: ${preset.name}`);
            this.visualizer.setOptions(preset.options);
        }
        if (this.autoplay) {
            this.play();
        }
    }

    play(): void {
        logger.log('play');
        this.visualizer.toggleAnalyzer(true);
    }

    pause(): void {
        this.visualizer.toggleAnalyzer(false);
    }

    stop(): void {
        this.visualizer.toggleAnalyzer(true);
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
}
