// https://www.shadertoy.com/view/MdfBz7
#define M_PI 3.1415926535897932384626433832795

float random(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec4 outColor = vec4(0.0);
	float time = iTime * 0.1;
    vec2 uvNorm = fragCoord.xy / iResolution.xy;
	vec2 uv = -0.5 + 1.0 * uvNorm;
    uv /= vec2(iResolution.y / iResolution.x, 1.);

    for(float i=0.0; i<600.0 ;i++){
        float f1 = mod(i * 0.101213, 0.28);
        float fft1 = texture(iChannel0, vec2(f1)).x;
        float r = (fft1 / 2.);
        float r1 = (fft1 / 8.) * random(vec2(uv));
        float a = random(vec2(i))*(M_PI*2.);
        vec2 center = vec2(cos(a), sin(a)) * r;
        vec2 center2 = vec2(cos(a), sin(a)) * r1;
        float dist = length(uv - center);
        float dist2 = length(uv - center - center2);
        float birghtness = 1./pow(0.001 + dist*350., 2.);
        float birghtness2 = 1./pow(0.001 + dist2*500., 2.);
        vec3 color = vec3(fft1-0.8, 0.3, fft1-0.2);
        vec3 col = color * birghtness2 * fft1 * 2.;
        col += color * birghtness * fft1 * 1.5;
        //Out :D
        outColor.rgb += col;
    }


    float grid = smoothstep((sin(length(uv.y-0.5)*(800.*length(uv.y+0.5))) * sin(length(uv.x+0.5)*(800.*length(uv.x-0.5)))), 0.0, 1.0);
    outColor.rgb += (outColor.rgb * vec3(grid) * 0.6);

	fragColor = outColor;
}
