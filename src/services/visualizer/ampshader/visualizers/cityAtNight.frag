// https://www.shadertoy.com/view/3tXBWS
#define AA 6.0 / iResolution.y

float hash21(vec2 v) {
    return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453123);
}

float line(vec2 uv, vec2 a, vec2 b, float width)
{
    vec2 pa = uv - a;
    vec2 ba = b - a;
	float h = clamp(dot(pa,ba) / dot(ba,ba), 0.0, 1.0);
	return 1.0 - smoothstep(-AA, AA, length(pa - ba * h) - width);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    float ar = iResolution.y / iResolution.x;
    uv = uv * 2.0 - 1.0;
    uv *= 1.0 + sin(iTime * 0.5) * 0.35;

    uv.y *= ar;


    vec3 comp = vec3(0.0);
    float lines = 0.0;
    for(int i = 0; i < 100; i++)
    {
       	float ifloat = float(i);
        vec2 seed = vec2(ifloat * 1.0, ifloat * 3.0);
        vec2 pos = (vec2((hash21(seed) * 2.0 - 1.0) * 2.0,
                         (hash21(seed*2.0) * 2.0 - 1.0)) * 0.5);

        float soundsample = texture( iChannel0, vec2(floor(abs(pos.x*0.5) * 32.0) / 32.0,0.0) ).x * 1.10;
        if(soundsample < 0.55)
            continue;

        float burst = pow(soundsample, 5.0) * 20.0;

        pos.x += sin(iTime + ifloat) * 0.25;
        pos.y += cos(iTime * 2.0 + ifloat) * 0.15;
        float value = length(uv + pos) * 4.25;

        // circles
        vec3 col = normalize(vec3(sin(pos.x*5.0) + 0.25, 0.1, sin(pos.y*10.0))) * 3.0;
    	comp += clamp(col * smoothstep(value - AA, value + AA, 0.01 + burst * 0.02) * 0.155, vec3(0.0), vec3(1.0));
        comp += clamp(col * smoothstep(value - 0.5, value + 0.5, 0.01 + burst * 0.075) * 0.01, vec3(0.0), vec3(1.0)) * 2.0;

        // Lines
        float L = 0.0;
        for(int j = 0; j < int(pow(soundsample, 3.0) * 15.8); j++)
        {
            float jfloat = float(j);
            vec2 Lseed = vec2(jfloat, jfloat);
            vec2 Lpos = (vec2((hash21(Lseed) * 2.0 - 1.0) * 2.0,
                         (hash21(Lseed*2.0) * 2.0 - 1.0)) * 0.5);
            Lpos.x += sin(iTime + jfloat) * 0.25;
        	Lpos.y += cos(iTime * 2.0 + jfloat) * 0.15;
            L = max(L, line(uv, -pos, -Lpos, 0.001));
        }
        lines += L;

    }
    comp *= 0.25;
    comp += lines * 0.01;
    vec3 bg = vec3(0.35*(uv.y * 0.5 + 0.5), 0.0, 0.15);
    fragColor = vec4(bg + vec3(comp)*12.0, 1.0);
}
