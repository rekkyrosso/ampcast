// https://www.shadertoy.com/view/4d3SDX
/* DOES NOT WORK (not sure why) */
// just toying with distance fields :)

vec2 rot(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, s, -s, c) * p;
}
float dist(vec3 p) {
    float s = texture( iChannel0, vec2(1.0,0.0) ).x*0.9+0.1;
    p.xy = rot(p.xy, s*0.05*p.z*sin(s+iTime*0.8));
	p.xz = rot(p.xz, s*0.02*p.z*cos(s+iTime*1.2));
    p.xy = mod(p.xy, 12.0) - 6.0;
    return length(p.xy)-(1.75-1.5*s)*(1.5+0.5*sin(iTime*2.0));
}
vec3 cnorm(vec3 p) {
    vec2 e=vec2(0.0, 0.01);
    return normalize(vec3(dist(p+e.yxx)-dist(p-e.yxx),dist(p+e.xyx)-dist(p-e.xyx),dist(p+e.xxy)-dist(p-e.xxy)));
}
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	vec2 uv = 2.0*(fragCoord.xy / iResolution.xy) - 1.0;
    vec3 p = vec3(4.0*sin(iTime), 4.0*cos(iTime*0.8), -5.0);
    vec3 t = normalize(vec3(uv, 1.0));
    vec3 l = normalize(vec3(sin(iTime),sin(iTime*0.37)*0.6,sin(iTime*2.8)));
	vec3 c = vec3(0.0);
    float z = 1.0-(1.0+sin(iTime*0.8)+cos(iTime*1.2))*0.5;
    vec3 ci = z*vec3(0.15,0.75,1.0);
    for(float i=0.0; i<128.0; i++) {
        float d = dist(p);
        if(d<0.001) {
            vec3 np = cnorm(p);
            vec3 h = normalize(np-t);
            c = vec3(dot(np, l) + pow(max(dot(h, np), 0.0), 10.0)) + ci*i/256.0;
            break;
        }
        p+=d*t;
    }
    c = mix(ci, c, exp(-p.z * 0.01));
    fragColor = pow(vec4(c, 1.0),vec4(0.75));
}
