import Sync from './Sync';
import Sketch from './Sketch';

export default class Visualizer {
    constructor(hidpi = true) {
        /** Initialize Sync class. */
        this.sync = new Sync();

        /** Initialize Sketch class. Assign `this.paint` as the main animation loop. */
        this.sketch = new Sketch({
            main: this.paint.bind(this),
            hidpi,
        });

        this.watch();
        this.hooks();
    }

    appendTo(parentElement) {
        this.sketch.appendTo(parentElement);
    }

    load(preset) {
        this.preset = preset;
        this.sync.volumeSmoothing = preset?.volumeSmoothing ?? 100;
    }

    /**
     * @method watch - Watch for changes in state.
     */
    watch() {
        this.sync.watch('active', (val) => {
            /** Start and stop sketch according to the `active` property on our Sync class. */
            if (val === true) {
                this.sketch.start();
            } else {
                this.sketch.stop();
            }
        });
    }

    /**
     * @method hooks - Attach hooks to interval change events.
     */
    hooks() {
        this.sync.on('tatum', (tatum) => {
            this.preset?.onTatum?.(tatum);
        });

        this.sync.on('segment', (segment) => {
            this.preset?.onSegment?.(segment);
        });

        this.sync.on('beat', (beat) => {
            this.preset?.onBeat?.(beat);
        });

        this.sync.on('bar', (bar) => {
            this.preset?.onBar?.(bar);
        });

        this.sync.on('section', (section) => {
            this.preset?.onSection?.(section);
        });
    }

    /**
     * @method paint - Paint a single frame of the main animation loop.
     */
    paint({ctx, height, width, now}) {
        this.preset?.onPaint?.({ctx, height, width, now, sync: this.sync});
    }

    resize(width, height) {
        this.sketch.resize(width, height);
    }

    start() {
        this.sketch.start();
    }

    stop() {
        this.sketch.stop();
    }
}
