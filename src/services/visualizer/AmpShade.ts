import AbstractVisualizer from './AbstractVisualizer';
import {Logger} from 'utils';

// From: https://noisehack.com/build-music-visualizer-web-audio-api/

// This is an experiment. Maybe we can add some more shaders?

const logger = new Logger('AmpShade');

const vertexShaderSrc = `
attribute vec2 position;

void main(void) {
  gl_Position = vec4(position, 0, 1);
}
`;

// From: https://www.shadertoy.com/view/XsXXDn
// Creation by Silexars - Danguafer
const fragmentShaderSrc = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D spectrum;

void main(void) {
  vec3 c;
  float z = 0.1 * time;
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = uv - 0.5;
  p.x *= resolution.x / resolution.y;
  float l = 0.2 * length(p);
  for (int i = 0; i < 3; i++) {
    z += 0.07;
    uv += p / l * (sin(z) + 1.0) * abs(sin(l * 9.0 - z * 2.0));
    c[i] = 0.01 / length(abs(mod(uv, 1.0) - 0.5));
  }
  float intensity = texture2D(spectrum, vec2(l, 0.5)).x;
  gl_FragColor = vec4(c / l * intensity, time);
}
`;

function initQuad(gl: WebGLRenderingContext): void {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

function createShader(gl: WebGLRenderingContext, fragmentShaderSrc: string): WebGLProgram {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
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

export default class AmpShade extends AbstractVisualizer<void> {
    private readonly canvas = document.createElement('canvas');
    private readonly gl = this.canvas.getContext('webgl')!;
    private animationFrameId = 0;
    private spectrum: Uint8Array;
    private fragSpectrumArray: Uint8Array;
    private fragResolution: WebGLUniformLocation | null;
    private fragTime: WebGLUniformLocation;
    private shader: WebGLProgram;

    constructor(
        private readonly audioContext: AudioContext,
        private readonly analyser: AnalyserNode
    ) {
        super();
        const canvas = this.canvas;
        const gl = this.gl;

        canvas.hidden = true;
        canvas.className = `visualizer visualizer-ampshade`;

        this.shader = createShader(gl, fragmentShaderSrc);
        const position = gl.getAttribLocation(this.shader, 'position');
        gl.enableVertexAttribArray(position);
        this.fragTime = gl.getUniformLocation(this.shader, 'time')!;
        gl.uniform1f(this.fragTime, audioContext.currentTime);
        this.fragResolution = gl.getUniformLocation(this.shader, 'resolution');
        gl.uniform2f(this.fragResolution, canvas.width, canvas.height);
        this.spectrum = new Uint8Array(this.analyser.frequencyBinCount);
        this.fragSpectrumArray = new Uint8Array(4 * this.spectrum.length);
        createTexture(gl);
        initQuad(gl);
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

    load(): void {
        logger.log('load');
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
        this.fragResolution = gl.getUniformLocation(this.shader, 'resolution');
        gl.uniform2f(this.fragResolution, canvas.width, canvas.height);
        this.renderFrame();
    }

    private clear(): void {
        // do nothing
    }

    private render(): void {
        this.renderFrame();
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private renderFrame(): void {
        this.analyser.getByteFrequencyData(this.spectrum);
        this.gl.uniform1f(this.fragTime, this.audioContext.currentTime);
        copyAudioDataToTexture(this.gl, this.spectrum, this.fragSpectrumArray);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
