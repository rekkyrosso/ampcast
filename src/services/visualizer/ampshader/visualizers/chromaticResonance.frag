// https://www.shadertoy.com/view/tlySzm
//
// Chromatic Resonance by Philippe Desgranges
// Email: Philippe.desgranges@gmail.com
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
//

#define MUSIC_REACTION 0.2

#define S(a, b, c) smoothstep(a, b, c)
#define sat(a) clamp(a, 0.0, 1.0)

#define pi 3.14159265359
#define pi2 (pi * 2.0)
#define halfPi (pi * 0.5)


// Some hash function 2->1
float N2(vec2 p)
{	// Dave Hoskins - https://www.shadertoy.com/view/4djSRW
    p = mod(p, vec2(1456.2346));
	vec3 p3  = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}


float CosineInterpolate(float y1, float y2, float t)
{
   float mu = (1.0 -cos(t * pi)) * 0.5;
   return (y1 * (1.0 - mu) + y2 * mu);
}

// A 2d Noise (Cosine interpolation is more plasing for this effect)
float Noise2(vec2 uv)
{
    vec2 corner = floor(uv);
	float c00 = N2(corner + vec2(0.0, 0.0));
	float c01 = N2(corner + vec2(0.0, 1.0));
	float c11 = N2(corner + vec2(1.0, 1.0));
	float c10 = N2(corner + vec2(1.0, 0.0));

    vec2 diff = fract(uv);

    return CosineInterpolate(CosineInterpolate(c00, c10, diff.x), CosineInterpolate(c01, c11, diff.x), diff.y);
}

float LineNoise(float x, float t)
{
    float n = Noise2(vec2(x * 0.6, t * 0.2));
    //n += Noise2(vec2(x * 0.8, t * 0.2 + 34.8)) * 0.5;
    //n += Noise2(vec2(x * 1.2, t * 0.3 + 56.8)) * 0.25;

    return n - (1.0) * 0.5;
}


float line(vec2 uv, float t, float scroll)
{

    float ax = abs(uv.x);
    uv.y *= 0.5 + ax * ax * 0.3;


    uv.x += iTime * scroll;

    float n1 = LineNoise(uv.x, t);


    float n2 = LineNoise(uv.x + 0.5, t + 10.0) * 2.0;

    float ay = abs(uv.y - n1);
    float lum = S(0.02, 0.00, ay) * 1.5;
    lum += S(1.5, 0.00, ay) * 0.1;


    float r = (uv.y - n1) / (n2 - n1);
    float h = sat(1.0 - r);
    if (r > 0.0) lum = max(lum, h * h * 0.7);

    return lum;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = (2.0*fragCoord-iResolution.xy)/iResolution.y;


    float xWave = fragCoord.x / iResolution.x;

    float wave = texture(iChannel0, vec2(xWave * 0.2, 1.0)).r * sin(iTime * 0.2 ) * MUSIC_REACTION;
    float wave1 = texture(iChannel0, vec2(xWave * 0.2 + 0.2, 1.0)).r * sin(iTime * 0.2 + 0.5) * MUSIC_REACTION;
    float wave2 = texture(iChannel0, vec2(xWave * 0.2 + 0.4, 1.0)).r * sin(iTime * 0.2 + 1.0) * MUSIC_REACTION;
    float wave3 = texture(iChannel0, vec2(xWave * 0.2 + 0.6, 1.0)).r * sin(iTime * 0.2 + 1.5) * MUSIC_REACTION;
    float wave4 = texture(iChannel0, vec2(xWave * 0.2 + 0.8, 1.0)).r * sin(iTime * 0.2 + 2.0) * MUSIC_REACTION;

  //  fragColor = vec4(lum, lum, lum, 1.0); return;


    float lum = line(uv * vec2(2.0, 1.0)+  vec2(0.0, wave), iTime * 0.3, 0.1) * 0.6;
    lum += line(uv * vec2(1.5, 0.9) +  vec2(0.33, wave1), iTime * 0.5 + 45.0, 0.15) * 0.5;
    lum += line(uv * vec2(1.3, 1.2) +  vec2(0.66, wave2), iTime * 0.4 + 67.3, 0.2) * 0.3;
    lum += line(uv * vec2(1.5, 1.15) +  vec2(0.8, wave3), iTime * 0.77 + 1235.45, 0.23) * 0.43;
    lum += line(uv * vec2(1.5, 1.15) +  vec2(0.8, wave4), iTime * 0.77 + 456.45, 0.3) * 0.25;


    float ax = abs(uv.x);

    lum += ax * ax * 0.05;


    vec3 col;

    float x = uv.x * 1.2 + iTime * 0.2;

    vec3 hue = (sin(vec3(x, x + pi2 * 0.33, x + pi2 * 0.66)) + vec3(1.0)) * 0.7;


    // overlay mix
    float thres = 0.7;
    if (lum < thres)
        col = hue * lum / thres;
    else
        col = vec3(1.0) - (vec3(1.0 - (lum - thres)) * (vec3(1.0) - hue));


    // Output to screen
    fragColor = vec4(col,1.0);
}
