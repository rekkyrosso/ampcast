// https://www.shadertoy.com/view/3sdfDB
/*
Version four of my Audio Waveform Visualizer.
Added some cool but rather trippy coloring.
*/

// 0 for frequency mode, 1 for amplitude mode:
#define VIEW_MODE 0

float samplePiecewiseSmooth(in float x, in float res) {
    float xTimesRes = x * res;

    // Left sample point:
    float x1 = floor(xTimesRes) / res;
    float y1 = texture(iChannel0, vec2(x1, VIEW_MODE)).x;

    // Right sample point:
    float x2 = ceil(xTimesRes) / res;
    float y2 = texture(iChannel0, vec2(x2, VIEW_MODE)).x;

    // Prevent small breaks in the line:
    x2 += 0.001;

    // Fit half of a sine wave between sample points:
    float sine = sin(((x - x1) / (x2 - x1) * 2.0 - 1.0) * 1.5707963267);
    return y1 + (0.5 + 0.5 * sine) * (y2 - y1);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float curSample = samplePiecewiseSmooth(uv.x, 20.0);
    // How close the pixel is to the wave:
    float smoothError = smoothstep(0.03, 0.0, abs(uv.y - curSample));
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    if (smoothError > 0.0) {
        // Mix red and white based on closeness:
        fragColor = vec4(mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), smoothError), 1.0);
    }

    // Multiply by some changing colors:
    fragColor.rgb *= 0.5 + 0.5 * cos(iTime + uv.xyx * vec3(20.0, 1.0, 1.0) + vec3(0.0, 2.0, 4.0));
}
