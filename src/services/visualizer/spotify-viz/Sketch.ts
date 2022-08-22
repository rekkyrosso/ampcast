import {PaintData} from './Visualizer';

interface QueueItem {
    name: string;
    method: PaintCallback;
    duration: number | null;
    start: number;
}

type PaintCallback = (data: Omit<PaintData, 'sync'>) => void;

export interface SketchOptions {
    main?: PaintCallback | null;
    hidpi?: boolean;
    fill?: string | null;
}

export default class Sketch {
    private animationFrameId = 0;
    private canvas = document.createElement('canvas');
    private ctx = this.canvas.getContext('2d')!;
    private hidpi = true;
    private fill: string | null = null;
    private width = 0;
    private height = 0;
    private queue: QueueItem[] = [];

    constructor({main = null, hidpi = true, fill = null}: SketchOptions = {}) {
        this.hidpi = hidpi;
        this.fill = fill;
        this.resize(100, 100);

        if (typeof main === 'function') {
            this.add('main', main);
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.canvas);
    }

    resize(width: number, height: number): void {
        const dpi = this.hidpi ? window.devicePixelRatio : 1;
        this.width = width;
        this.height = height;
        this.canvas.width = width * dpi;
        this.canvas.height = height * dpi;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.scale(dpi, dpi);
    }

    add(name: string, method: PaintCallback, duration: number | null = null): void {
        this.queue.push({
            name,
            method,
            duration,
            start: window.performance.now(),
        });
    }


    remove(name: string): void {
        this.queue = this.queue.filter((item) => item.name !== name);
    }

    start(): void {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        }
    }

    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    paint(now: number, {name, start, duration, method}: QueueItem): void {
        const elapsed = now - start;
        const progress = typeof duration === 'number' ? Math.min(elapsed / duration, 1) : null;
        const state: Omit<PaintData, 'sync'> = {
            ctx: this.ctx,
            width: this.width,
            height: this.height,
            largest: Math.max(this.width, this.height),
            smallest: Math.min(this.width, this.height),
            now,
            progress,
            duration,
            elapsed,
            start,
        };

        if (this.fill) {
            this.ctx.save();
            this.ctx.fillStyle = this.fill;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        method(state);

        if (progress === 1) {
            this.remove(name);
        }
    }

    loop(now: number): void {
        this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        this.queue.forEach((item) => this.paint(now, item));
    }
}
