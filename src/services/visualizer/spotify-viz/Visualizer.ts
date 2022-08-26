import Sync, {ActiveIntervals, SyncData} from './Sync';
import Sketch from './Sketch';

export interface PaintData {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    largest: number;
    smallest: number;
    now: number;
    progress: number | null;
    duration: number | null;
    elapsed: number;
    start: number;
    sync: SyncData;
}

export interface SpotifyVizConfig {
    volumeSmoothing?: number;
    onPaint?: (data: PaintData) => void;
    onBar?: (bar: ActiveIntervals['bars']) => void;
    onBeat?: (beat: ActiveIntervals['beats']) => void;
    onSection?: (section: ActiveIntervals['sections']) => void;
    onSegment?: (segment: ActiveIntervals['segments']) => void;
    onTatum?: (tatum: ActiveIntervals['tatums']) => void;
}

export default class Visualizer {
    private sync: Sync = new Sync();
    private sketch: Sketch;
    private config?: SpotifyVizConfig;

    constructor(hidpi = true) {
        /** Initialize Sketch class. Assign `this.paint` as the main animation loop. */
        this.sketch = new Sketch({
            main: this.paint.bind(this),
            hidpi,
        });

        this.watch();
        this.hooks();
    }

    appendTo(parentElement: HTMLElement): void {
        this.sketch.appendTo(parentElement);
    }

    load(config: SpotifyVizConfig): void {
        this.config = config;
        this.sync.volumeSmoothing = config?.volumeSmoothing ?? 100;
    }

    /**
     * @method watch - Watch for changes in state.
     */
    watch(): void {
        this.sync.watch('active', (active: boolean) => {
            /** Start and stop sketch according to the `active` property on our Sync class. */
            if (active) {
                this.sketch.start();
            } else {
                this.sketch.stop();
            }
        });
    }

    /**
     * @method hooks - Attach hooks to interval change events.
     */
    hooks(): void {
        this.sync.on('bar', (bar: ActiveIntervals['bars']) => {
            this.config?.onBar?.(bar);
        });

        this.sync.on('beat', (beat: ActiveIntervals['beats']) => {
            this.config?.onBeat?.(beat);
        });

        this.sync.on('section', (section: ActiveIntervals['sections']) => {
            this.config?.onSection?.(section);
        });

        this.sync.on('segment', (segment: ActiveIntervals['segments']) => {
            this.config?.onSegment?.(segment);
        });

        this.sync.on('tatum', (tatum: ActiveIntervals['tatums']) => {
            this.config?.onTatum?.(tatum);
        });
    }

    /**
     * @method paint - Paint a single frame of the main animation loop.
     */
    paint(data: Omit<PaintData, 'sync'>): void {
        this.config?.onPaint?.({...data, sync: this.sync.data});
    }

    resize(width: number, height: number): void {
        this.sketch.resize(width, height);
    }

    start(): void {
        this.sync.start();
    }

    stop(): void {
        this.sync.stop();
    }
}
