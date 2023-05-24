// https://www.shadertoy.com/view/WlB3zc
///
/// This post cloned from below post.
/// I also reduce code and add a sound.
/// I respect the post.
///
/// [[ Fire Storm Cube ]]
///
/// https://www.shadertoy.com/view/ldyyWm
///

#define R iResolution

float burn;

mat2 rot(float a)
{
    float s = sin(a);
    float c = cos(a);

    return mat2(s, c, -c, s);
}

float map(vec3 p)
{
    float i = texture(iChannel0, vec2(0.3, 0.5)).x;

    float d1 = length(p) - 1. * i;

    //mat2 r = rot(-iTime / 3.0 + length(p));
    mat2 r = rot(iTime * 2.0 + length(p));
    p.xy *= r;
    p.zy *= r;

    p = abs(p);// - iTime;
    p = abs(p - round(p)) *  2.5 * i;

    //r = rot(iTime);
    //p.xy *= r;
    //p.xz *= r;

    float l1 = length(p.xy);
    float l2 = length(p.yz);
    float l3 = length(p.xz);

    float g = 0.01;
    float d2 = min(min(l1, l2), l3) + g;

    burn = pow(d2 - d1, 2.0);

    return min(d1, d2);
}

void mainImage( out vec4 O, in vec2 U )
{
    vec2 uv = (2.0 * U - R.xy) / R.y;
    vec3 ro = normalize(vec3(uv, 1.5));

    vec3 ta = vec3(0, 0, -2);

    float t = 0.;
    for  (int i = 0; i < 30; i++)
    {
        t += map(ta + ro * t) * 0.5;
    }

    O = vec4(1.0 - burn, 0, exp(-t), 0.0);
}
