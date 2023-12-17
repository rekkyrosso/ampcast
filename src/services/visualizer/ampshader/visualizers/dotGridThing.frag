// https://www.shadertoy.com/view/Xd2cRG
/* NOT CURRENTLY USED */

float circle(vec2 p, float radius) {
 	return length(p)-radius;
}

vec2 dist(vec2 p, vec2 ns, vec2 split, float totalSquares) {
 	float amp1 = texture(iChannel0, vec2((ns.x + ns.y*split.x)/totalSquares, 0.25)).x;
    float amp2 = texture(iChannel0, vec2(mod(ns.x + ns.y*split.x +1., totalSquares)/totalSquares, 0.25)).x;
 	return vec2(circle(p, 0.5 + 0.9*amp1), circle(p, 0.40 + 0.60*amp2));

}

float smin( float a, float b, float k )
{
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}

const float ySplit = 10.0;
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
    vec2 split = vec2(floor(aspect*vec2(ySplit)));
    float totalSquares = split.x*split.y;
	vec2 ns = floor(uv*split);
    vec2 p = vec2(fract(uv*split))*2.0-vec2(1.0);


   	vec2 c = dist(p, ns, split, totalSquares);
   	vec2 w = dist(p+vec2(2.0,0.0), ns+vec2(-1.0,0.0), split, totalSquares);
   	vec2 nw = dist(p+vec2(2.0,-2.0), ns+vec2(-1.0,1.0), split, totalSquares);
   	vec2 ne = dist(p+vec2(-2.0,-2.0), ns+vec2(1.0,1.0), split, totalSquares);
   	vec2 sw = dist(p+vec2(2.0,2.0), ns+vec2(-1.0,-1.0), split, totalSquares);
   	vec2 se = dist(p+vec2(-2.0,2.0), ns+vec2(1.0,-1.0), split, totalSquares);
   	vec2 e = dist(p+vec2(-2.0,0.0), ns+vec2(1.0,0.0), split, totalSquares);
   	vec2 s = dist(p+vec2(0.0,2.0), ns+vec2(0.,-1.0), split, totalSquares);
   	vec2 n = dist(p+vec2(0.0,-2.0), ns+vec2(0.,1.0), split, totalSquares);

    float k = 3.0;
    float d1 = smin(c.x, w.x, k);
    d1 = smin(d1, e.x, k);
    d1 = smin(d1, n.x, k);
    d1 = smin(d1, s.x, k);
    d1 = smin(d1, nw.x, k);
    d1 = smin(d1, ne.x, k);
    d1 = smin(d1, sw.x, k);
    d1 = smin(d1, se.x, k);

    float d2 = smin(c.y, w.y, k);
    d2 = smin(d2, e.y, k);
    d2 = smin(d2, n.y, k);
    d2 = smin(d2, s.y, k);
    d2 = smin(d2, nw.y, k);
    d2 = smin(d2, ne.y, k);
    d2 = smin(d2, sw.y, k);
    d2 = smin(d2, se.y, k);

	fragColor =
        vec4(0.1,0.1,0.1,1.0) *  (1.0 - d1) +
        vec4(.3,0.5,0.3,1.0) *  (1.0 - smoothstep(0., 0.15, d1)) +
        vec4(0.5,0.2,0.1,1.0) *  (1.0 - smoothstep(0., 0.1, d2));

}
