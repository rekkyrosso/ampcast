// https://www.shadertoy.com/view/ldlBWH
/* DOES NOT WORK (doesn't look the same as in ShaderToy) */
// From Stackoveflow
// http://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}


#define rotate(a)  mat2(cos(a), -sin(a), sin(a), cos(a))


const float lineWidth = 0.08;
float plot(vec2 st, float pct){
  return smoothstep(pct - lineWidth, pct, st.y) - smoothstep(pct, pct + lineWidth, st.y);
}

vec3 getColor(vec2 fragCoord, float wave, float rotationRate, float colorCycleRate, float zoom, float colorDiff) {
    mat2 rot = rotate(iTime / rotationRate);
    vec2 uv = (fragCoord.xy -0.5 * iResolution.xy) / iResolution.x * zoom;
    uv *= rot;
    uv.y += 0.5;

    float c = plot(uv, wave);
    vec3 hsv = vec3(colorDiff + iTime / colorCycleRate, 0.8, 1.0 * c);
    vec3 rgb = hsv2rgb(hsv);
    return rgb;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord.xy -0.5 * iResolution.xy) / iResolution.x;
    int x = int((uv.x + 0.5) * 512.0);
    ivec2 tx = ivec2(x, 1);

    // Time domain
    float wave = texelFetch(iChannel0, tx, 0).x;

    vec3 rgb = getColor(fragCoord, wave, 3.0, 12.0, 1.0, 0.0);

    vec3 rgb2 = getColor(fragCoord, wave, 4.0, 10.0, 0.7, 0.9);

    vec3 rgb3 = getColor(fragCoord, wave, 20.0, 30.0, 1.9, 1.5) * 0.4;

    fragColor = vec4(rgb + rgb2 + rgb3, 1.0);
}
