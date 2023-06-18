import {TinyColor} from '@ctrl/tinycolor';
import SimpleAudioAnalyser from 'types/SimpleAudioAnalyser';
import {AmpShaderVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import theme from 'services/theme';
import {Logger} from 'utils';

const logger = new Logger('AmpShaderPlayer');

// Based on: https://noisehack.com/build-music-visualizer-web-audio-api/

export default class AmpShaderPlayer extends AbstractVisualizerPlayer<AmpShaderVisualizer> {
    private readonly canvas = document.createElement('canvas');
    private readonly gl = this.canvas.getContext('webgl2')!;
    private animationFrameId = 0;
    private fragTheme: WebGLUniformLocation | null = null;
    private fragTime: WebGLUniformLocation | null = null;
    private fragChannelTime: WebGLUniformLocation | null = null;
    private fragDate: WebGLUniformLocation | null = null;
    private shader: WebGLProgram | null = null;
    private startTime = performance.now();
    private currentVisualizer = '';

    constructor(private readonly analyser: SimpleAudioAnalyser) {
        super();

        const gl = this.gl;

        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-ampshader`;

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
            if (!hidden && !this.animationFrameId) {
                this.render();
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(visualizer: AmpShaderVisualizer): void {
        logger.log('load');
        if (visualizer) {
            if (this.currentVisualizer !== visualizer.name) {
                this.currentVisualizer = visualizer.name;
                this.createShader(visualizer.shader);
                logger.log(`Using Ampshader visualizer: ${visualizer.name}`);
            }
        }
        // A bit weird but `autoplay` controls looping.
        this.play();
    }

    play(): void {
        logger.log('play');
        if (!this.animationFrameId) {
            this.render();
        }
    }

    pause(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    stop(): void {
        this.pause();
        this.clear();
    }

    resize(width: number, height: number): void {
        const canvas = this.canvas;
        const gl = this.gl;

        canvas.width = width;
        canvas.height = height;

        gl.viewport(0, 0, width, height);

        if (this.shader) {
            const fragResolution = gl.getUniformLocation(this.shader, 'iResolution');
            gl.uniform2f(fragResolution, canvas.width, canvas.height);
            this.renderFrame();
        }
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

    private get themeColor(): [number, number, number, number] {
        const {r, g, b} = new TinyColor(theme.frameColor).toRgb();
        return [r, g, b, 1];
    }

    private clear(): void {
        // do nothing
    }

    private createShader(fragmentShaderSrc: string): void {
        const gl = this.gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
        const vertexShaderSrc = `#version 300 es\nin vec4 as_Position;void main(void){gl_Position=as_Position;}`;
        gl.shaderSource(vertexShader, vertexShaderSrc);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(vertexShader)!);
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragmentShader, fragmentShaderSrc);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(fragmentShader)!);
        }

        const shader = gl.createProgram()!;
        gl.attachShader(shader, vertexShader);
        gl.attachShader(shader, fragmentShader);
        gl.linkProgram(shader);
        gl.useProgram(shader);

        const position = gl.getAttribLocation(shader, 'as_Position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        this.fragTheme = gl.getUniformLocation(shader, 'iTheme');
        gl.uniform4f(this.fragTheme, ...this.themeColor);

        this.startTime = performance.now();
        const time = this.currentTime;
        this.fragTime = gl.getUniformLocation(shader, 'iTime');
        gl.uniform1f(this.fragTime, time);

        this.fragChannelTime = gl.getUniformLocation(shader, 'iChannelTime');
        gl.uniform1fv(this.fragChannelTime, new Float32Array([time, 0, 0, 0]));

        this.fragDate = gl.getUniformLocation(shader, 'iDate');
        gl.uniform4f(this.fragDate, ...this.currentDate);

        const fragResolution = gl.getUniformLocation(shader, 'iResolution');
        gl.uniform2f(fragResolution, this.canvas.width, this.canvas.height);

        this.shader = shader;
    }

    private render(): void {
        this.renderFrame();
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private renderFrame(): void {
        if (this.shader) {
            const gl = this.gl;
            const bufferSize = this.analyser.frequencyBinCount;
            const freq = new Uint8Array(bufferSize);
            const wave = new Uint8Array(bufferSize);
            const spectrum = new Uint8Array(1024);

            this.analyser.getByteFrequencyData(freq);
            this.analyser.getByteTimeDomainData(wave);

            for (let i = 0; i < 512; i++) {
                spectrum[i] = freq[i];
                spectrum[i + 512] = wave[i];
            }

            const time = this.currentTime;
            gl.uniform1f(this.fragTime, time);
            gl.uniform1fv(this.fragChannelTime, new Float32Array([time, 0, 0, 0]));
            gl.uniform4f(this.fragDate, ...this.currentDate);
            gl.uniform4f(this.fragTheme, ...this.themeColor);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 512, 2, 0, gl.RED, gl.UNSIGNED_BYTE, spectrum);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        }
    }
}
