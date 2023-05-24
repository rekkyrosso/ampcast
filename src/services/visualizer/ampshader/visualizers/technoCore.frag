// https://www.shadertoy.com/view/wtdXzS
float det = .001;
vec3 objcol=vec3(0.);
float snd;


mat2 rot(float a) {
	float s = sin(a), c = cos(a);
    return mat2(c, s, -s, c);
}

float fractal(vec3 p) {
    vec3 c = p;
    float m = 100.;
    for(int i = 0; i < 10; i++) {
		p=abs(p + 1.) - abs( p - 1.) - p;
        p=p / clamp(dot(p,p), 0.1, 1.) - c;
    	m=min(m, abs(length(p) - 3.5));
    }
    m = max(0., 1. - m);
    objcol = abs(p) * .6;
    return m * m * (.2+snd);
}

float de(vec3 p) {
    p.yz *= rot(iTime);
    p.xz *= rot(.2);
    float f = fractal(p);
	float d = length(p) - 3.5 + f * 1.5 - snd * 3.;
    d = min(d, length(p.xy) - .25);
	d = min(d, length(p.yz) - .25);
	d = min(d, length(p.xz) - .25);
    return (d - f * .5) * .5;
}

vec3 march(vec3 from, vec3 dir) {
	vec3 col = vec3(0.), p;
    float td = 0., d;
    for (int i = 0; i < 150; i++) {
    	p = from + td * dir;
		d = de(p);
        td += max(det, abs(d));
		if (td > 20.) break;
        col += objcol * exp(-.005 * td * td);
    }
    vec3 rescol = col * .01 * (.3 + snd * 1.5);
    return rescol;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    snd = texture(iChannel0,vec2(.15)).r;
    vec2 p = (fragCoord - iResolution.xy * .5) / iResolution.y;
    vec2 uv = fragCoord / iResolution.xy;
    vec3 dir = normalize(vec3(p, .7));
    float t = iTime*.5;
    vec3 from = vec3(sin(t) * 2., 0., -10.);
    from.xz *= rot(t);
    dir.xz *= rot(t);
	det += max(0. ,5. - iTime)*.02;
    vec3 col = march(from, dir);
    col += pow(abs(.5 - fract(dir.x * 20.)) * 2., 10.) * .2;
    col += pow(abs(.5 - fract(dir.y * 20.)) * 2., 10.) * .2;
    float spec = pow(texture(iChannel0, vec2(floor(dir.x*20.)/20. * .5 + .5, .1)).r,2.);
	vec2 sq = abs(.5-fract(dir.xy*20.));
    col+=abs(1.-length(max(vec2(0.),abs(sq.xy)-.1)))*step(dir.y+.4,spec)*length(fract(dir.xy*10.))*.4;
    col=max(col, vec3(.5, .2, 0.) - smoothstep(0.,.03,abs(dir.y - spec + .35)));
    fragColor = vec4(col, 1.0);
}
