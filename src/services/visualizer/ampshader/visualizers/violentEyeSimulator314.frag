// https://www.shadertoy.com/view/NdSGW3
/* DOES NOT WORK (doesn't look the same as in ShaderToy) */
float red (vec2 gv, float fft){
    float d = distance(gv, vec2(0.5));
    return smoothstep(0.15, fft, d);
}

float blue (vec2 gv, float fft){
    float d = distance(gv, vec2(0.5));
    return smoothstep(0., fft/2., d);
}

float green(vec2 gv, float fft){
    return smoothstep(0.75, 0.55, gv.y)*(fft-0.1);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;
    uv += vec2(0., 0.5);
    vec3 col = vec3(0.);
    vec2 gv = fract(uv);

    int tx = int(gv.y*512.);
    float fft = texelFetch(iChannel0, ivec2(tx, 0), 0).x;
    float fft2 = texelFetch(iChannel0, ivec2(tx, 1), 0).x;

    float r = red(gv, fft);
    float b = blue(gv, fft2);
    float g = green(gv, fft2);

    col.r += r;
    col.b += 1.-b*1.5;
    col.g += 1.-b*1.8;
    col.g += g;

    fragColor = vec4(col,1.0);
}
