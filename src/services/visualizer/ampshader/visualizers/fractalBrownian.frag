// https://www.shadertoy.com/view/XsXfzN
// Simplex 2D noise
// from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion from https://www.shadertoy.com/view/lsl3RH
// By inigo quilez
const mat2 m = mat2( 0.80,  0.60, -0.60,  0.80 );
float fbm(vec2 p)
{
    float f = 0.0;
    f += 0.5000 * snoise(p);
    p = m*p*2.02;
    f += 0.2500 * snoise(p);
    p = m*p*2.03;
    f += 0.1250 * snoise(p);
    p = m*p*2.01;
    f += 0.0625 * snoise(p);
    return f/0.9375;
}

////// My code below


float getAverage(float start, float end) {
    float sum = 0.0;
    int count = 0;
    for(float i = start; i < end; i += 1.0/512.0) {
        sum += texture(iChannel0, vec2(i, 0.25)).x;
        count++;
    }
    float average = sum/float(count);
    return average;
}

vec2 liquid(vec2 uv) {
    float t0 = iTime / 2.0;
    float bass = getAverage(0.001, 0.04);
    float mids = getAverage(0.3, 0.6);
    float highs = getAverage(0.8, 1.0);
    float t = t0 + mids / 4.0;
    float s1 = fbm(uv + t / 2.0 + fbm(uv + fbm(uv + (t + highs) / 4.0) / 10.0));
    float s2 = fbm(uv + s1 + bass * 1.5);

    float f = sin(t0);
    float f2 = sin(t0 * 2.3);
    return vec2(mix(s1, s2, f), mix(s2, s1, f2));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 liq = liquid(uv);
	fragColor = vec4(0.0, liq, 1.0);
}
