// Quasicrystal by Ebanflo
// https://www.shadertoy.com/view/4sXfzj


const int numWaves = 6;
const float numStripes = 1.0;
const float numFreqs = 8.0;
const float meanFreq = 4.0;
const float stdDev = 2.0;
const float period = 3.0;
const float pi = 4.0 * atan(1.0);
const float pi2 = 2.0 * pi;
const float ln2 = log(2.0);
const float mean = meanFreq * .69314718;

float wavething(int n, float x) {
    float l = ln2 * float(n) + log(x);
    l -= mean;
    return exp(-l * l / stdDev) / 2.0;
}

void main(void) {
    gl_FragColor = vec4(0.0);
    float scale = exp2(-fract(time / period));
    float sum1 = 0.0;
    for(int n = 0; n < int(numFreqs); n++){
        sum1 += wavething(n, scale + 0.5*float(n));
    }
    vec2 xy = pi2 * numStripes
        * ((2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y);

    float sum2 = 0.0;
    for(int n = 0; n < numWaves; n++){
        float theta = pi * float(n) / float(numWaves);
        vec2 waveVec = vec2(cos(theta), sin(theta));
        float phase = dot(xy, waveVec);
        for(int k = 0; k < int(numFreqs); k++){
            sum2 += cos(phase * scale * exp2(float(k))) * wavething(k, scale + 0.5*float(n));
        }
    }
    gl_FragColor += vec4(1.0 - sum2 / sum1);
    xy /= pi2 * numStripes;
    float r = length(xy);
    gl_FragColor.x *= texture2D(spectrum, vec2(.161616 * r, .2)).x;
    gl_FragColor.y *= texture2D(spectrum, vec2(.161616 * r + .161616, .2)).x;
    gl_FragColor.z *= texture2D(spectrum, vec2(.161616 * r + .333333, .2)).x;
    gl_FragColor = 1.0 - gl_FragColor;
    gl_FragColor = 1.0 - (r + 1.0) * gl_FragColor;
    if(length(gl_FragColor) > 3.0) gl_FragColor = vec4(0.0);
}
