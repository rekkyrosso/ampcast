// https://www.shadertoy.com/view/Wll3Df
#define hue(h) clamp( abs( fract(h + vec4(3,2,1,0)/3.) * 6. - 3.) -1. , 0., 1.)
#define BLACK_COL vec3(32,43,51)/255.

float line(vec2 p,vec2 size){
	float mask =
        smoothstep(size.x, size.x-.1, abs(p.x)) *
        smoothstep(size.y, size.y-.1, abs(p.y));

    return smoothstep(.45, .5, mask);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.y;

    vec2 aRatio = vec2(30., 1.);
    vec2 guv = uv * aRatio;
    vec2 id = floor(guv);
    guv = fract(guv);
    guv -= .5;

    vec2 muzUV = floor(uv * aRatio) / aRatio;
    vec4 muz = texture(iChannel0, muzUV * .5);
    muz.x +=  (sin(iTime + id.x*.25)*.5+.5)*.25;
    vec2 size = vec2(0.75, muz.x*.3 + .05);

    vec2 sf = aRatio * .025;
    float mask =
        smoothstep(size.x, size.x-sf.x, abs(guv.x)) *
        smoothstep(size.y, size.y-sf.y, abs(guv.y));

    float m = smoothstep(.25, .5, mask);

    vec3 col = hue(fract(size.y*5. + iTime*.05)).rgb;

    col = mix(BLACK_COL, col, m);

    fragColor = vec4(col,1.0);
}
