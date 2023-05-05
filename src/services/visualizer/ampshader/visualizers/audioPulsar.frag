// https://www.shadertoy.com/view/fssXD4
float Catmull_Rom(float x, float v0,float v1, float v2,float v3)
{
	float c2 = -.5 * v0	+ 0.5*v2;
	float c3 = v0		+ -2.5*v1 + 2.0*v2 + -.5*v3;
	float c4 = -.5 * v0	+ 1.5*v1 + -1.5*v2 + 0.5*v3;
	return(((c4 * x + c3) * x + c2) * x + v1);
}

float sampleFFT(float fftCoord)
{
    float atten = smoothstep(0.0, 0.05, 1.0 - fftCoord) * smoothstep(0.0, 0.05, fftCoord);
    return atten * texture( iChannel0, vec2(fftCoord,0.25) ).x;
}

vec2 opRep( in vec2 p, in vec2 c)
{
    return mod(p+0.5*c,c)-0.5*c;
}

#define PI 3.14159

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec3 col = vec3(0.0);

    // create pixel coordinates
	vec2 uv = fragCoord.xy / iResolution.xy;
    uv = uv * 2. - 1.;
    uv.x /= iResolution.y / iResolution.x;
    uv += 0.3 * vec2(sin(-iTime * 0.3), cos(iTime * 0.5));
    // second texture row is the sound wave

	float wave = texture( iChannel0, vec2(0.5,0.75) ).x;

    float angle = atan(uv.y, uv.x);  // atan2
    vec2 range = vec2(-PI, PI);  // The range of atan2 is [-pi / 1; pi / 1]
    float theta = smoothstep(range[0], range[1], angle);  // Normalize the range of atan to [0;1]
    theta = mod(theta + iTime * 0.05, 1.0);

    float ro = length(uv);
    ro *= 3.0 - 0.2 * clamp(0.0, 1.0, (pow(wave, 0.4)));
    uv = vec2(theta, ro);

    uv.y -= iTime * 0.65;
    uv.y = opRep(uv, vec2(1.5)).y;

    // Small perturbation of base circle
    uv.y += 0.005 * (sin(-iTime * 1.8 + theta * 8.0 * PI) + sin(iTime * 4.0 + theta * 32.0 * PI));

    float fftFreq = wave * clamp(0.0, 1.0, ro * 1.0) * 2.0 + 64.0;//10.0 + wave * 128.0;
    float fftX = floor(uv.x * fftFreq);
    float fftCoord1 = clamp(0.0, 1.0, fftX / fftFreq);
	float fft1 = sampleFFT(fftCoord1);

    float fftCoord = (fftX - 1.0) / fftFreq;
    float fft = sampleFFT(fftCoord);

    float fftCoord2 = (fftX + 1.0) / fftFreq;
    float fft2 = sampleFFT(fftCoord2);

    float fftCoord3 = (fftX + 2.0) / fftFreq;
    float fft3 = sampleFFT(fftCoord3);

    float f = 0.6 * Catmull_Rom(fract(uv.x * fftFreq), fft, fft1, fft2, fft3);

    float s = (0.01 + 1.6 * f) / abs(f-uv.y);
    s = pow(s, 2.0 - wave * 0.6 - ro * 0.45 * (0.8 + 0.4 * wave));
    s *= smoothstep(0.8, 0.0, uv.y);
    s *= smoothstep(0.8, 0.0, -uv.y);

	col += s;
    col += 1.0 - smoothstep(0.0, 0.1, ro);
    //col += fft - uv.y;
    col *= vec3(0.1 + f * 1.5, 0.2,1.0 - f * 1.0);

	// output final color
	fragColor = vec4(col, 1.0);
}
