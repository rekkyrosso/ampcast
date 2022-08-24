import {Logger} from 'utils';
import AbstractVisualizer from './AbstractVisualizer';
import ampshaderPresets from './ampshaderPresets';

const logger = new Logger('AmpShader');

export default class AmpShader extends AbstractVisualizer<string> {
    private readonly canvas = document.createElement('canvas');
    private readonly gl = this.canvas.getContext('webgl')!;
    private animationFrameId = 0;
    private spectrum: Uint8Array;
    private fragSpectrumArray: Uint8Array;
    private fragTime: WebGLUniformLocation | null = null;
    private shader: WebGLProgram | null = null;

    constructor(
        private readonly audioContext: AudioContext,
        private readonly analyser: AnalyserNode
    ) {
        super();

        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-ampshader`;

        this.spectrum = new Uint8Array(this.analyser.frequencyBinCount);
        this.fragSpectrumArray = new Uint8Array(4 * this.spectrum.length);

        createTexture(this.gl);
        initQuad(this.gl);
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

    load(presetName: string): void {
        logger.log('load');
        const preset = ampshaderPresets.find((preset) => preset.name === presetName);
        if (preset) {
            logger.log(`Using Ampshader preset: ${preset.name}`);
            this.createShader(preset.shader);
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
            const fragResolution = gl.getUniformLocation(this.shader, 'resolution');
            gl.uniform2f(fragResolution, canvas.width, canvas.height);
            this.renderFrame();
        }
    }

    private clear(): void {
        // do nothing
    }

    private createShader(shader: string): void {
        const gl = this.gl;
        this.shader = createShader(gl, shader);
        const position = gl.getAttribLocation(this.shader, 'position');
        gl.enableVertexAttribArray(position);
        this.fragTime = gl.getUniformLocation(this.shader, 'time')!;
        gl.uniform1f(this.fragTime, this.audioContext.currentTime);
        const fragResolution = gl.getUniformLocation(this.shader, 'resolution');
        gl.uniform2f(fragResolution, this.canvas.width, this.canvas.height);
    }

    private render(): void {
        this.renderFrame();
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private renderFrame(): void {
        if (this.shader) {
            this.analyser.getByteFrequencyData(this.spectrum);
            this.gl.uniform1f(this.fragTime, this.audioContext.currentTime);
            copyAudioDataToTexture(this.gl, this.spectrum, this.fragSpectrumArray);
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
    }
}

// From: https://noisehack.com/build-music-visualizer-web-audio-api/

function initQuad(gl: WebGLRenderingContext): void {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

function createShader(gl: WebGLRenderingContext, fragmentShaderSrc: string): WebGLProgram {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `attribute vec2 position;void main(void){gl_Position=vec4(position, 0, 1);}`);
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

    return shader;
}

function createTexture(gl: WebGLRenderingContext): WebGLTexture {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function copyAudioDataToTexture(
    gl: WebGLRenderingContext,
    audioData: Uint8Array,
    textureArray: Uint8Array
): void {
    for (let i = 0; i < audioData.length; i++) {
        textureArray[4 * i + 0] = audioData[i]; // R
        textureArray[4 * i + 1] = audioData[i]; // G
        textureArray[4 * i + 2] = audioData[i]; // B
        textureArray[4 * i + 3] = 255; // A
    }
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        audioData.length,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        textureArray
    );
}
