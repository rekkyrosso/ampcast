// https://www.shadertoy.com/view/ssXfD7
#define yellow vec3(248.0, 223.0, 118.0)/256.0
#define gray vec3(69.0, 41.0, 52.0)/256.0
#define red vec3(255.0, 74.0, 68.0)/256.0
#define green vec3(0.0, 255.0, 0.0)/256.0
#define blue vec3(.0, 74.0, 255.0)/256.0

vec3 circles(
    vec2 uv,
    vec2 position,
    vec3 circles_color
) {
    return circles_color *
    smoothstep(
        (cos(iTime)+1.0)/4.0+0.5,
        0.0,
        length((uv+position)*length(fract(uv*5.0)-0.5))
    );
}

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float lowf=texelFetch( iChannel0, ivec2(0,0), 0 ).x;
    float medf=texelFetch( iChannel0, ivec2(127,0), 0 ).x;
    float highf=texelFetch( iChannel0, ivec2(511,0), 0 ).x;

    vec2 uv = (fragCoord*2.0-iResolution.xy)/min(iResolution.x, iResolution.y);
    uv=uv+vec2(cos(iTime/3.),sin(iTime/5.0));
    uv=uv*rotate2d(iTime/3.0);

    vec3 color=vec3(0);

    color+=circles(
        uv,
        vec2(cos(iTime/5.0*4.0), sin(iTime/5.0*3.0)),
        blue
    )*highf*4.;

    color+=circles(
        uv,
        vec2(cos(iTime/5.0*6.0), sin(iTime/5.0*7.0)),
        green
    )*lowf;

    color+=circles(
        uv,
        vec2(cos(iTime/5.0*2.0), sin(iTime/5.0*5.0)),
        red
    )*medf*5.;

	fragColor = vec4(color, 1.0);
}
