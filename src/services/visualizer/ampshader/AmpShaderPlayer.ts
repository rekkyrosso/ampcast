import Color from 'colorjs.io';
import AudioManager from 'types/AudioManager';
import {AmpShaderVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import theme from 'services/theme';
import {Logger} from 'utils';
import header from './header.frag';
import footer from './footer.frag';

// Based on: https://noisehack.com/build-music-visualizer-web-audio-api/

export default class AmpShaderPlayer extends AbstractVisualizerPlayer<AmpShaderVisualizer> {
    private readonly logger = new Logger(`AmpShaderPlayer/${this.name}`);
    private readonly analyser: AnalyserNode;
    private readonly source: AudioNode;
    private readonly canvas = document.createElement('canvas');
    private readonly gl = this.canvas.getContext('webgl2')!;
    private animationFrameId = 0;
    private fragFrameColor: WebGLUniformLocation | null = null;
    private fragBackgroundColor: WebGLUniformLocation | null = null;
    private fragColor: WebGLUniformLocation | null = null;
    private fragTime: WebGLUniformLocation | null = null;
    private fragChannelTime: WebGLUniformLocation | null = null;
    private fragDate: WebGLUniformLocation | null = null;
    private program: WebGLProgram | null = null;
    private vertexShader: WebGLShader | null = null;
    private fragmentShader: WebGLShader | null = null;
    private startTime = performance.now();
    private currentVisualizer = '';
    #backgroundColor = '';
    #color = '';

    constructor({context, source}: AudioManager, readonly name: string) {
        super();

        this.source = source;
        this.analyser = context.createAnalyser();

        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-ampshader`;

        const gl = this.gl;

        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 512, 2, 0, gl.RED, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
        );
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (hidden) {
                this.logger.log('disconnect');
                this.cancelAnimation();
                this.source.disconnect(this.analyser);
            } else {
                this.logger.log('connect');
                this.source.connect(this.analyser);
                if (!this.animationFrameId) {
                    this.render();
                }
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(visualizer: AmpShaderVisualizer): void {
        this.logger.log('load', visualizer.name);
        if (this.currentVisualizer !== visualizer.name) {
            this.currentVisualizer = visualizer.name;
            this.cancelAnimation();
            this.createShader(`${header}\n${visualizer.shader}\n${footer}`);
        }
        if (this.autoplay && !this.animationFrameId) {
            this.render();
        }
    }

    play(): void {
        this.logger.log('play');
        if (!this.animationFrameId) {
            this.render();
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.cancelAnimation();
    }

    stop(): void {
        this.logger.log('stop');
        this.cancelAnimation();
        this.clear();
    }

    resize(width: number, height: number): void {
        const canvas = this.canvas;
        const gl = this.gl;

        width = Math.round(width);
        height = Math.round(height);

        canvas.width = width;
        canvas.height = height;

        gl.viewport(0, 0, width, height);

        if (this.program) {
            const fragResolution = gl.getUniformLocation(this.program, 'iResolution');
            gl.uniform2f(fragResolution, width, height);
            this.renderFrame();
        }
    }

    get backgroundColor(): string {
        return this.#backgroundColor || theme.backgroundColor;
    }

    set backgroundColor(backgroundColor: string) {
        this.#backgroundColor = backgroundColor;
    }

    get color(): string {
        return this.#color || theme.textColor;
    }

    set color(color: string) {
        this.#color = color;
    }

    private get currentDate(): [number, number, number, number] {
        const date = new Date();
        return [
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours() * 3600 +
                date.getMinutes() * 60 +
                date.getSeconds() +
                date.getMilliseconds() * 0.001,
        ];
    }

    private get currentTime(): number {
        return (performance.now() - this.startTime) / 1000;
    }

    private get frameColor(): string {
        return theme.frameColor;
    }

    private clear(): void {
        // do nothing
    }

    private createShader(fragmentShaderSrc: string): void {
        const gl = this.gl;

        if (this.program) {
            gl.detachShader(this.program, this.vertexShader!);
            gl.detachShader(this.program, this.fragmentShader!);
            gl.deleteProgram(this.program);
            this.program = null;
            this.vertexShader = null;
            this.fragmentShader = null;
        }

        const vertexShaderSrc = `#version 300 es\nin vec4 as_Position;void main(void){gl_Position=as_Position;}`;
        const vertexShader = (this.vertexShader = gl.createShader(gl.VERTEX_SHADER)!);
        gl.shaderSource(vertexShader, vertexShaderSrc);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vertexShader)!);
        }

        const fragmentShader = (this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!);
        gl.shaderSource(fragmentShader, fragmentShaderSrc);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fragmentShader)!);
        }

        const program = gl.createProgram()!;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        const position = gl.getAttribLocation(program, 'as_Position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        this.fragFrameColor = gl.getUniformLocation(program, 'iFrameColor');
        gl.uniform3f(this.fragFrameColor, ...this.toRgb(this.frameColor));

        this.fragBackgroundColor = gl.getUniformLocation(program, 'iBackgroundColor');
        gl.uniform3f(this.fragBackgroundColor, ...this.toRgb(this.backgroundColor));

        this.fragColor = gl.getUniformLocation(program, 'iColor');
        gl.uniform3f(this.fragColor, ...this.toRgb(this.color));

        this.startTime = performance.now();
        const time = this.currentTime;
        this.fragTime = gl.getUniformLocation(program, 'iTime');
        gl.uniform1f(this.fragTime, time);

        this.fragChannelTime = gl.getUniformLocation(program, 'iChannelTime');
        gl.uniform1fv(this.fragChannelTime, new Float32Array([time, 0, 0, 0]));

        this.fragDate = gl.getUniformLocation(program, 'iDate');
        gl.uniform4f(this.fragDate, ...this.currentDate);

        const fragResolution = gl.getUniformLocation(program, 'iResolution');
        gl.uniform2f(fragResolution, this.canvas.width, this.canvas.height);

        this.program = program;
    }

    private render(): void {
        this.renderFrame();
        if (this.autoplay && !this.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private renderFrame(): void {
        if (this.program) {
            const gl = this.gl;
            const bufferSize = this.analyser.frequencyBinCount;
            const freq = new Uint8Array(bufferSize);
            const wave = new Uint8Array(bufferSize);

            this.analyser.getByteFrequencyData(freq);
            this.analyser.getByteTimeDomainData(wave);

            const time = this.currentTime;
            gl.uniform1f(this.fragTime, time);
            gl.uniform1fv(this.fragChannelTime, new Float32Array([time, 0, 0, 0]));
            gl.uniform4f(this.fragDate, ...this.currentDate);
            gl.uniform3f(this.fragFrameColor, ...this.toRgb(this.frameColor));
            gl.uniform3f(this.fragBackgroundColor, ...this.toRgb(this.backgroundColor));
            gl.uniform3f(this.fragColor, ...this.toRgb(this.color));

            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 512, 1, gl.RED, gl.UNSIGNED_BYTE, freq);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 1, 512, 1, gl.RED, gl.UNSIGNED_BYTE, wave);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        }
    }

    private cancelAnimation(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    private toRgb(color: string): [number, number, number] {
        const [r, g, b] = new Color(color).srgb;
        return [r, g, b];
    }
}
