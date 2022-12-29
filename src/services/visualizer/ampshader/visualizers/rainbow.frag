// Rainbow by avin
// https://www.shadertoy.com/view/ttfGzH


#define PI 3.1415926
#define PI2 6.2831852
#define hue(h)clamp(abs(fract(h + vec4(3, 2, 1, 0) / 3.0) * 6.0 - 3.0) - 1.0 , 0.0, 1.0)

void main(void) {
    vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
    float CIRCLES = 20.0;
    float cS = 0.375;
    float sm = 1.0 / iResolution.y * 2.0; // smooth
    float ps = 1.0 / iResolution.y * sqrt(iResolution.y) * 0.225; // circle thin
    float d = length(uv);
    float a = atan(uv.y, uv.x);
    a = a < 0.0 ? PI + (PI - abs(a)) : a;
    float lPos = a /PI2;
    float m = 0.0;
    float partSize = 1.0 / CIRCLES;
    vec3 col;
    for (float i = 20.0; i > 1.0; i -= 1.0) {
        float ilPos = fract(lPos + i*0.1 + iTime * 0.1);
        float cPos = partSize * i + ilPos * partSize;
        float invPos = partSize * (i + 1.0) - ilPos * partSize;
        float nzF = (1.0 - ilPos);
        float mP0 = texture(iChannel0, vec2(partSize * i, 0.0)).x;
        float mP = texture(iChannel0, vec2(cPos, 0.0)).x;
        float mPInv = texture(iChannel0, vec2(invPos, 0.0)).x;
        mP = (mP + mPInv) / 2.0;
        float rDiff = i*(1.0 / CIRCLES * 0.35);
        float r = mP * (1.0 / CIRCLES * 3.0) - rDiff;
        float subm = smoothstep(cS - ps + r, cS - ps + sm + r, d) * smoothstep(cS + r, cS - sm + r, d);
        if (subm > 0.0) {
            col = hue(i / CIRCLES * 0.5 + iTime * 0.05 + mP0 * 0.84).rgb;
        }
        m += subm;
    }
    m = clamp(m, 0.0, 1.0);
    float r = (sin(iTime * 0.5) * 0.5 + 0.5);
    float b = (cos(iTime * 0.5) * 0.5 + 0.5);
    vec3 backCol = vec3(r, 0.0, b) * length(uv * 0.75) * 0.5;
    col = mix(backCol, col, m);
    gl_FragColor = vec4(col, 1.0);
}
