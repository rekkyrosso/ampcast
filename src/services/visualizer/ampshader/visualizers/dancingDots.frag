// https://www.shadertoy.com/view/XsyXz
#define PI 3.14159265359

vec3 hsv2rgb (in vec3 hsv) {
    return hsv.z * (1.0 + 0.5 * hsv.y * (cos (2.0 * PI * (hsv.x + vec3 (0.0, 0.6667, 0.3333))) - 1.0));
}

float hash(vec3 uv) {
    return fract(sin(dot(uv, vec3(7.13, 157.09, 113.57))) * 48543.5453);
}

// better distance function thanks to Shane
float map(vec3 p) {
    float radius = texture(iChannel0, vec2(hash(floor(p)), .25)).x * .99 + .01;
    return length(fract(p) - .5) - .25 * radius;
}

// raymarching function
float trace(vec3 o, vec3 r) {

    float t = 0.;

    for (int i = 0; i < 32; ++i) { // Low iterations for blur.
        float d = map(o + r * t);
        t += d * .9; // Ray shortening to blur a bit more.
    }

    return t;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy * 2. - 1.;
    uv.x *= iResolution.x / iResolution.y;

    // ray
    vec3 r = normalize(vec3(uv, 2.));
    // origin
    vec3 o = vec3(-3, iTime, -1);

    // rotate origin and ray
    float a = -iTime * .5;
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    o.xz *= rot;
    r.xy *= rot;
    r.xz *= rot;

    // march
    float f = trace(o, r);

    // calculate color from angle on xz plane
    vec3 p = o + f * r;
    float angel = atan(p.x, p.z) / PI / 2.;
    vec3 c = hsv2rgb(vec3(angel, 1., 1.));

    // add with fog
	fragColor = vec4(c / (1. + f * f * .1),1.0);
}
