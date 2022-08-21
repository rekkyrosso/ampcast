/**
 * @class Sketch - a simple 2d <canvas> animation interface.
 */
export default class Sketch {
    animationFrameId = 0;

    constructor({main = null, hidpi = true, fill = null} = {}) {
        this.hidpi = hidpi;
        this.active = false;
        this.queue = [];
        this.fill = fill;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize(100, 100);

        if (main !== null) {
            this.add('main', main);
        }
    }

    appendTo(parentElement) {
        parentElement.appendChild(this.canvas);
    }

    resize(width, height) {
        const dpi = this.hidpi ? window.devicePixelRatio : 1;
        this.width = width;
        this.height = height;
        this.canvas.width = width * dpi;
        this.canvas.height = height * dpi;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.ctx.scale(dpi, dpi);
    }

    /**
     * @method add – Add an item to the animation queue.
     *
     * NOTE: If duration is specified, the item will remove itself from the queue upon completion.
     *
     * @param {string} name
     * @param {function} method
     * @param {number} duration
     */
    add(name, method, duration = null) {
        this.queue.push({
            name,
            method,
            duration,
            start: window.performance.now(),
        });
    }

    /**
     * @method remove - Remove an item from the animation queue by name.
     * @param {string} name
     */
    remove(name) {
        this.queue = this.queue.filter((item) => item.name !== name);
    }

    /**
     * @method start - Begin animation loop.
     */
    start() {
        if (this.active === true) return;
        this.active = true;
        this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    }

    /**
     * @method stop - Stop animation loop.
     */
    stop() {
        if (this.active === false) return;
        this.active = false;
        cancelAnimationFrame(this.animationFrameId);
    }

    /**
     * @method paint - Paint a single item in the animation queue.
     * @param {DOMHighResTimeStamp} now
     * @param {object} - Item in the animation queue.
     */
    paint(now, {name, start, duration, method}) {
        const elapsed = now - start;
        const progress = typeof duration === 'number' ? Math.min(elapsed / duration, 1) : null;
        const state = {
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

    loop(now) {
        if (this.active) {
            this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
        }

        this.queue.forEach((item) => this.paint(now, item));
    }
}
