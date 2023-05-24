// https://www.shadertoy.com/view/MsdXzl
// Used to have https://soundcloud.com/twistedmusic/younger-brother-crumblenaut but not working anymore
#define M_PI 3.1415926535897932384626433832795
#define r iResolution
#define t iChannelTime[0]
#define lw 1.5

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
	vec2 uv = fragCoord.xy / r.x;
    float s1 = 0.01 + 0.99 * min(texture(iChannel0, vec2(0.65, 0.0)).x * 1.5, 1.0);
    float s2 = 0.1 + 0.9 * min(texture(iChannel0, vec2(0.9, 0.0)).x * 1.5, 1.0);
    float s3 = 0.2 * min(texture(iChannel0, vec2(0.0, 0.0)).x * 1.5, 1.0);
    vec2 m = vec2(1.0, r.y / r.x) / 2.0;
    float d = distance(uv, m);
    float rd = (m.y / 1.5) + (s1 / 10.0);
    float ad = abs(d - rd);
    float a = mod(atan(uv.y - m.y, uv.x - m.x) + (t / 1.0), M_PI / ceil(32.0 * s2));
    ad += a / 10.;

    float c = 0.0;
    if (ad < lw * s1) c = (lw * s1 / ad) / 6.0;

	fragColor = vec4(c, c * s3, c * s1, 0.0);
}
