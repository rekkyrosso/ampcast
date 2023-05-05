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
    private readonly gl = this.canvas.getContext('webgl')!;
    private animationFrameId = 0;
    private fragTheme: WebGLUniformLocation | null = null;
    private fragTime: WebGLUniformLocation | null = null;
    private fragChannelTime: WebGLUniformLocation | null = null;
    private fragDate: WebGLUniformLocation | null = null;
    private shader: WebGLProgram | null = null;
    private startTime = performance.now();

    constructor(private readonly analyser: SimpleAudioAnalyser) {
        super();

        const gl = this.gl;

        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-ampshader`;

        gl.getExtension('OES_standard_derivatives');
        gl.getExtension('EXT_shader_texture_lod');

        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
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
            logger.log(`Using Ampshader visualizer: ${visualizer.name}`);
            this.createShader(visualizer.shader);
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
            date.getMonth() + 1,
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
        const vertexShaderSrc = `attribute vec2 position;void main(void){gl_Position=vec4(position,0,1);}`;
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

        const position = gl.getAttribLocation(shader, 'position');
        gl.enableVertexAttribArray(position);

        this.fragTheme = gl.getUniformLocation(shader, 'iTheme');
        gl.uniform4f(this.fragTheme, ...this.themeColor);

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
            const iChannel0 = new Uint8Array(this.analyser.frequencyBinCount);
            const fragSpectrumArray = new Uint8Array(4 * iChannel0.length);

            this.analyser.getByteFrequencyData(iChannel0);

            for (let i = 0; i < iChannel0.length; i++) {
                fragSpectrumArray[4 * i + 0] = iChannel0[i]; // R
                fragSpectrumArray[4 * i + 1] = iChannel0[i]; // G
                fragSpectrumArray[4 * i + 2] = iChannel0[i]; // B
                fragSpectrumArray[4 * i + 3] = 255; // A
            }

            const time = this.currentTime;
            gl.uniform1f(this.fragTime, time);
            gl.uniform1fv(this.fragChannelTime, new Float32Array([time, 0, 0, 0]));
            gl.uniform4f(this.fragDate, ...this.currentDate);
            gl.uniform4f(this.fragTheme, ...this.themeColor);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                iChannel0.length,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                fragSpectrumArray
            );

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
    }
}
