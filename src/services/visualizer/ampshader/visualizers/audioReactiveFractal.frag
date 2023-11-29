// https://www.shadertoy.com/view/dtSBR1
#define freq(f) texture(iChannel0, vec2(f, 0.25)).x * 0.8
float avgFreq(float start, float end, float step) {
    float div = 0.0;
    float total = 0.0;
    for (float pos = start; pos < end; pos += step) {
        div += 1.0;
        total += freq(pos);
    }
    return total / div;
}


vec3 palette( float t ) {

    float bassFreq = pow(avgFreq(0.0, 0.1, 0.01), 0.2);
    float medFreq = pow(avgFreq(0.1, 0.6, 0.01), 0.85);
    float topFreq = pow(avgFreq(0.6, 1.0, 0.01), 0.85);

    vec3 a = vec3(0.5, 0.5, 0.5)/sin(bassFreq);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263,0.416,0.557)/sin(bassFreq/2.);

    return a + b*cos( 6.28318*(c*t+d) );
}



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;
    vec3 coll = palette(length(uv));

    vec3 col = vec3(0);

    float bassFreq = pow(avgFreq(0.0, 0.1, 0.01), 0.2);
    float medFreq = pow(avgFreq(0.1, 0.6, 0.01), 0.85);
    float topFreq = pow(avgFreq(0.6, 1.0, 0.01), 0.85);

    float a = .7853982;
    float s = sin(a);
    float c = cos(a);
    uv *= mat2(c, -s, s, c);
    uv *= 20.;
    vec2 gv = fract(uv)-.5;
    vec2 id = floor( uv);

    float m = 0.-bassFreq;
    float t = iTime+sin(medFreq);



    for(float y=-1. ; y<=1. ; y++) {
        for(float x=-1. ; x<=1. ; x++) {
            vec2 offs = vec2(x, y);

            float bassFreq = pow(avgFreq(0.0, 0.1, 0.01), 0.85);
            float medFreq = pow(avgFreq(0.1, 0.6, 0.01), 0.85);
            float topFreq = pow(avgFreq(0.6, 1.0, 0.01), 0.85);


            float d = length(gv-offs)+mix(.1, .5, sin(medFreq));
            float dist = length(id+offs)*.4;

            float r = mix(.3, 1.5, sin(dist-t)*.5+.5)+mix(.1, .8, sin(bassFreq));
            m += smoothstep(r,r*.9, d)-sin(bassFreq/6.);

            }
        }
    float y=-1. ; y<=1. ; y++;
    float x=-1. ; x<=1. ; x++;
    vec2 offs = vec2(x, y);

    float dist = length(id+offs)*.4;
    //col.rg = gv;
    col += mod(m, 1.2);
    col *= coll + sin(dist-t)*medFreq;

    fragColor = vec4(col,1.0);
}