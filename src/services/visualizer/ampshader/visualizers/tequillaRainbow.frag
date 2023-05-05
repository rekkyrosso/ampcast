// https://www.shadertoy.com/view/ddy3DD
// "Tequilla Rainbow" by wj
// based on avin's "Rainbow soundviz": https://www.shadertoy.com/view/ttfGzH
// license: CC-BY-NC-SA


#define PI 3.1415926
#define PI2 6.2831852

// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}
// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
//  Macro version of above to enable compile-time constants
#define HSV2RGB(c)  (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))



void mainImage(out vec4 fragColor, in vec2 fragCoord)
 {
    vec2 uv = (fragCoord - iResolution.xy * 0.5) / iResolution.y;

    float CIRCLES = 9.;
    float cS = .93275;

    float sm = 1.0 / iResolution.y * 25.0;
    float ps = 1.0 / iResolution.y * sqrt(iResolution.y) * 1.9;

    float d = length(uv);

    float a = atan(uv.y, uv.x);
    a = a < 0.0 ? PI + (PI - abs(a)) : a;

    float lPos = a /PI2;

    float m = 0.0;
    float partSize = 1.0 / CIRCLES * 1.05;
    vec3 col;

    float t= iTime;

    for(float i = 9.; i > 1.0; i -= 1.0) {

        float ilPos = fract(lPos + i*0.1 + t * 0.1);
        float cPos = partSize * i + ilPos * partSize;
        float invPos = partSize * (i + 1.0) - ilPos * partSize;
        float nzF = (1.0 - ilPos);
        float mP0 = texture(iChannel0, vec2(partSize * i, 0.0)).x * 0.8;
        float mP = texture(iChannel0, vec2(cPos, 0.0)).x * 0.8;
        float mPInv = texture(iChannel0, vec2(invPos, 0.0)).x * 0.8;

        mP = (mP + mPInv) * .5 ;

        float rDiff = i*(1.0 / CIRCLES * .8);
        float r = mP * (1.0 / CIRCLES * 5.0) - rDiff;

        float subm = smoothstep(cS - ps + r, cS - ps + sm + r, d) * smoothstep(cS + r, cS - sm + r, d);

        if (subm > 0.0) {
//            col += HSV2RGB(vec3(i / CIRCLES * 0.5 + t * 0.05 + mP0 * 0.184, 0.95, .0025))*400.;   // cycle hue
            col += HSV2RGB(vec3(i / CIRCLES * 0.5 + 14.4*0.05 + mP0 * 0.184, 0.95, .0025))*400.;
            m += subm;
        }
    }

    m = clamp(m, 0.0, 1.0);

    float r =  (sin(t * 0.5) * 0.5 + 0.5);
    float b = (cos(t * 0.5) * 0.5 + 0.5);
    vec3 backCol = vec3(r, 0.0, b) * length(uv * 0.75) * 0.5;

    col = mix(backCol, col, m);

    fragColor = vec4(col, 1.0);
}
