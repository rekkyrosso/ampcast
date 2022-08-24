export interface AmpshaderPreset {
    readonly name: string;
    readonly shader: string;
    readonly externalUrl?: string;
}

const shaderToy = `https://www.shadertoy.com/view`;

const header = `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D spectrum;
`;

const presets: AmpshaderPreset[] = [
    {
        name: 'Creation by Silexars',
        externalUrl: `${shaderToy}/XsXXDn`,
        shader: `${header}
void main(void) {
  vec3 c;
  float z = 0.1 * time;
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = uv - 0.5;
  p.x *= resolution.x / resolution.y;
  float l = 0.2 * length(p);
  for (int i = 0; i < 3; i++) {
    z += 0.07;
    uv += p / l * (sin(z) + 1.0) * abs(sin(l * 9.0 - z * 2.0));
    c[i] = 0.01 / length(abs(mod(uv, 1.0) - 0.5));
  }
  float intensity = texture2D(spectrum, vec2(l, 0.5)).x;
  gl_FragColor = vec4(c / l * intensity, time);
}`,
    },
    {
        name: 'Nautilus by weyland',
        externalUrl: `${shaderToy}/MdXGz4`,
        shader: `${header}
float e(vec3 c) {
	c=cos(vec3(cos(c.r+time/8.)*c.r-cos(c.g+time/9.)*c.g,c.b/3.*c.r-cos(time/7.)*c.g,c.r+c.g+c.b/1.25+time));
	return dot(c*c,vec3(1.))-1.0;
}
void main(void) {
    vec2 c=-1.+2.*gl_FragCoord.xy / resolution.xy;
    vec3 o=vec3(c.r,c.g+cos(time/2.)/30.,0),g=vec3(c.r+cos(time)/30.,c.g,1)/64.;
    float m=1.0;
	float t=0.0;
    for(int j=0;j<333;j++) {
        if( m>.4) {
            t = (1.0+float(j))*2.0;
   			m = e(o+g*t);
		}
    }
    vec3 r=vec3(.1,0.,0.);
	vec3 n=m-vec3( e(vec3(o+g*t+r.rgg)),
                   e(vec3(o+g*t+r.grg)),
                   e(vec3(o+g*t+r.ggr)) );
    vec3 v=vec3(dot(vec3(0,0,-.5),n)+dot(vec3(0.0,-.5,.5),n));
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = uv - 0.5;
    p.x *= resolution.x / resolution.y;
    float l = 0.1 * length(p);
    float intensity = texture2D(spectrum, vec2(l, 0.5)).x;
	gl_FragColor=vec4(v + intensity * vec3(.1+cos(time/14.)/8.,.1,.1-cos(time/3.)/19.)*(t/41.),time);
}`,
    },
    {
        name: 'Quasicrystal by Ebanflo',
        externalUrl: `${shaderToy}/4sXfzj`,
        shader: `${header}
const int numWaves = 6;
const float numStripes = 1.0;
const float numFreqs = 8.0;
const float meanFreq = 4.0;
const float stdDev = 2.0;
const float period = 3.0;
const float pi = 4.0 * atan(1.0);
const float pi2 = 2.0 * pi;
const float ln2 = log(2.0);
const float mean = meanFreq * .69314718;
float wavething(int n, float x) {
    float l = ln2 * float(n) + log(x);
    l -= mean;
    return exp(-l * l / stdDev) / 2.0;
}
void main(void) {
    gl_FragColor = vec4(0.0);
    float scale = exp2(-fract(time / period));
    float sum1 = 0.0;
    for(int n = 0; n < int(numFreqs); n++){
        sum1 += wavething(n, scale + 0.5*float(n));
    }
    vec2 xy = pi2 * numStripes
        * ((2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y);

    float sum2 = 0.0;
    for(int n = 0; n < numWaves; n++){
        float theta = pi * float(n) / float(numWaves);
        vec2 waveVec = vec2(cos(theta), sin(theta));
        float phase = dot(xy, waveVec);
        for(int k = 0; k < int(numFreqs); k++){
            sum2 += cos(phase * scale * exp2(float(k))) * wavething(k, scale + 0.5*float(n));
        }
    }
    gl_FragColor += vec4(1.0 - sum2 / sum1);
    xy /= pi2 * numStripes;
    float r = length(xy);
    gl_FragColor.x *= texture2D(spectrum, vec2(.161616 * r, .2)).x;
    gl_FragColor.y *= texture2D(spectrum, vec2(.161616 * r + .161616, .2)).x;
    gl_FragColor.z *= texture2D(spectrum, vec2(.161616 * r + .333333, .2)).x;
    gl_FragColor = 1.0 - gl_FragColor;
    gl_FragColor = 1.0 - (r + 1.0) * gl_FragColor;
    if(length(gl_FragColor) > 3.0) gl_FragColor = vec4(0.0);
}`,
    },
    {
        name: 'Rainbow by avin',
        externalUrl: `${shaderToy}/ttfGzH`,
        shader: `${header}
#define PI 3.1415926
#define PI2 6.2831852
#define hue(h)clamp(abs(fract(h + vec4(3, 2, 1, 0) / 3.0) * 6.0 - 3.0) - 1.0 , 0.0, 1.0)
void main(void) {
    vec2 uv = (gl_FragCoord.xy - resolution.xy * 0.5) / resolution.y;
    float CIRCLES = 20.0;
    float cS = 0.375;
    float sm = 1.0 / resolution.y * 2.0; // smooth
    float ps = 1.0 / resolution.y * sqrt(resolution.y) * 0.225; // circle thin
    float d = length(uv);
    float a = atan(uv.y, uv.x);
    a = a < 0.0 ? PI + (PI - abs(a)) : a;
    float lPos = a /PI2;
    float m = 0.0;
    float partSize = 1.0 / CIRCLES;
    vec3 col;
    for (float i = 20.0; i > 1.0; i -= 1.0) {
        float ilPos = fract(lPos + i*0.1 + time * 0.1);
        float cPos = partSize * i + ilPos * partSize;
        float invPos = partSize * (i + 1.0) - ilPos * partSize;
        float nzF = (1.0 - ilPos);
        float mP0 = texture2D(spectrum, vec2(partSize * i, 0.0)).x;
        float mP = texture2D(spectrum, vec2(cPos, 0.0)).x;
        float mPInv = texture2D(spectrum, vec2(invPos, 0.0)).x;
        mP = (mP + mPInv) / 2.0;
        float rDiff = i*(1.0 / CIRCLES * 0.35);
        float r = mP * (1.0 / CIRCLES * 3.0) - rDiff;
        float subm = smoothstep(cS - ps + r, cS - ps + sm + r, d) * smoothstep(cS + r, cS - sm + r, d);
        if (subm > 0.0) {
            col = hue(i / CIRCLES * 0.5 + time * 0.05 + mP0 * 0.84).rgb;
        }
        m += subm;
    }
    m = clamp(m, 0.0, 1.0);
    float r = (sin(time * 0.5) * 0.5 + 0.5);
    float b = (cos(time * 0.5) * 0.5 + 0.5);
    vec3 backCol = vec3(r, 0.0, b) * length(uv * 0.75) * 0.5;
    col = mix(backCol, col, m);
    gl_FragColor = vec4(col, 1.0);
}`,
    },
    {
        name: 'Audio-Visualizer by CoolerZ',
        externalUrl: `${shaderToy}/wd3XzS`,
        shader: `${header}
float sigmoid(float x) {
    return 1. / (1. + exp(x));
}
vec3 sigmoid(vec3 xyz) {
    return vec3(sigmoid(xyz.x), sigmoid(xyz.y), sigmoid(xyz.z));
}
float sample_at(float f) {
    return texture2D(spectrum, vec2(f / 16.0, 0.)).x;
}
float sample_multiple(float f) {
    float delta = .1;
    return 0.2 * (sample_at(f - 2. * delta) + sample_at(f - delta) + sample_at(f) + sample_at(f + delta) + sample_at(f + 2. * delta));
}
void main(void) {
    vec2 uv = (gl_FragCoord.xy - 0.5) / resolution.xy;
    uv = 2. * uv - 1.;
    uv.x *= resolution.x/resolution.y;
    vec2 center = vec2(0.);// 0.5 * vec2(cos(time), sin(time));
    float d = length(uv - center);
    float amplitude = sample_multiple(d * d);
    d -= amplitude;
    float weird = sigmoid(abs(uv.x) * abs(uv.y));
    float speed = 6. * amplitude * sin(time * weird * 0.005) * 0.001;
    float dist_diagonal = abs(abs(uv.x) - abs(uv.y));
    dist_diagonal += d * amplitude;
    dist_diagonal *= dist_diagonal;
    amplitude += .1 / (.1 + smoothstep(1., 0.1, dist_diagonal));
    float brightness = 3. * amplitude * sigmoid(sin(d * d * 16. - speed * time + 2. * speed * amplitude));
    vec3 col = sigmoid(vec3(uv, sin(time)));
    gl_FragColor = vec4(col * brightness,1.0);
}`,
    },
    {
        name: 'Radiant by TekF',
        externalUrl: `${shaderToy}/4sVBWy`,
        shader: `${header}
void main(void) {
    vec2 uv = (gl_FragCoord.xy*2.-resolution.xy)/resolution.y;
    float l = length(uv)/length(resolution.xy/resolution.y);
    float a = atan(uv.x,uv.y)+time;
    float s = texture2D(spectrum,vec2(abs(fract(5.*a/6.283)*2.-1.),.75)).r;
    float A = .16;
    float B = .2025;
    gl_FragColor.r = texture2D(spectrum,vec2(pow(mix(mix(l,.0,A),    s ,B),2.),.25)).r;
    gl_FragColor.g = texture2D(spectrum,vec2(pow(mix(mix(l,.5,A),(1.-s),B),2.),.25)).r;
    gl_FragColor.b = texture2D(spectrum,vec2(pow(mix(mix(l,1.,A),    s ,B),2.),.25)).r;
    // tweak the contrast
    gl_FragColor.rgb = smoothstep(.05,1.,gl_FragColor.rgb+.2*l);
    gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(2));
    gl_FragColor.a = 1.;
}`,
    },
    {
        name: 'ambilight 2.0 by MillhausVKodi',
        externalUrl: `${shaderToy}/ltc3WH`,
        shader: `${header}
const float bands = 20.0;
const float leds = 25.0;
const float colorRange = 0.3; // >0. (=1. full color range, >1. repeat colors)
//convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main(void) {
    // middle = (0/0)
    vec2 k=(gl_FragCoord.xy-.5*resolution.xy)/(max(resolution.x,resolution.y));
    //distance from the middle
    float dis = distance(k , vec2(0));
    //and approximated by "leds"
    float disA = floor(dis*leds)/leds;
    //disA = dis;
    //degree from bottom 0 and top 1.0.  /left right symmetric
    float deg = acos(k.y/dis)/3.14;
    //and approximated by "bands"
    float degA = floor(deg*bands)/bands;
    //colorwheel, dark in the middle, changing colors over time
    vec3 color = hsv2rgb(  vec3( degA*colorRange + time*0.07 , 1.0 , smoothstep(0.0, 0.6, disA) )  );
	//brightness of a band by fourier (degree to frequency / magnitude to brightness)
    float bandBrightness = texture2D(spectrum, vec2(degA,0.25)).x;
    //more blinky blinky x^2
    color*=bandBrightness*bandBrightness;
    //brighter
    color*=4.;
    float deltaDeg = fract((deg-degA)*bands) - 0.5;
    float deltaDis = fract((dis-disA)*leds) - 0.5;
    float shape = smoothstep(0.5, 0.35, abs(deltaDeg)) * smoothstep(0.5, 0.35, abs(deltaDis));
    color*=shape;
    gl_FragColor = vec4(color, 1.0);
}`,
    },
    {
        name: 'dot grid thing by laney',
        externalUrl: `${shaderToy}/Xd2cRG`,
        shader: `${header}
float circle(vec2 p, float radius) {
 	return length(p)-radius;
}
vec2 dist(vec2 p, vec2 ns, vec2 split, float totalSquares) {
 	float amp1 = texture2D(spectrum, vec2((ns.x + ns.y*split.x)/totalSquares, 0.25)).x;
    float amp2 = texture2D(spectrum, vec2(mod(ns.x + ns.y*split.x +1., totalSquares)/totalSquares, 0.25)).x;
 	return vec2(circle(p, 0.5 + 0.9*amp1), circle(p, 0.40 + 0.60*amp2));
}
float smin( float a, float b, float k ) {
    float res = exp( -k*a ) + exp( -k*b );
    return -log( res )/k;
}
const float ySplit = 10.0;
void main(void) {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 aspect = vec2(resolution.x/resolution.y, 1.0);
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
	gl_FragColor =
        vec4(0.1,0.1,0.1,1.0) *  (1.0 - d1) +
        vec4(.3,0.5,0.3,1.0) *  (1.0 - smoothstep(0., 0.15, d1)) +
        vec4(0.5,0.2,0.1,1.0) *  (1.0 - smoothstep(0., 0.1, d2));
}`,
    },
    {
        name: 'Bubbles by liyouvane',
        externalUrl: `${shaderToy}/llXBWB`,
        shader: `${header}
#define SHOW_BLOCKS
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}
vec2 fade(vec2 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}
// Classic Perlin noise
float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}
float rand(float x) {
    return fract(sin(x) * 4358.5453123);
}
float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5357);
}
float circle(vec2 p, vec2 b, float r) {
  return length(p-b)-r;
}
float box(vec2 p, vec2 b, float r) {
  return length(max(abs(p)-b,0.0))-r;
}
float sampleMusic() {
	return 0.5 * (
//		texture2D( spectrum, vec2( 0.01, 0.25 ) ).x +
//		texture2D( spectrum, vec2( 0.07, 0.25 ) ).x +
		texture2D( spectrum, vec2( 0.15, 0.25 ) ).x +
		texture2D( spectrum, vec2( 0.30, 0.25 ) ).x);
}
void main(void) {
	const float speed = 0.4;
	const float ySpread = 1.6;
	const int numBlocks = 30;
	const int numBubbles = 50;
	float pulse = sampleMusic();

	vec2 uv = gl_FragCoord.xy / resolution.xy - 0.5;
	float aspect = resolution.x / resolution.y;
	vec3 baseColor = uv.x > 0.0 ? vec3(0.0,0.3, 0.3) : vec3(0.3, 0.0, 0.3);

	vec3 color = 5. * pulse*baseColor*0.5*(0.9-cos(uv.x*8.0));
	uv.x *= aspect;

	for (int i = 0; i < numBubbles; i++) {
		float z = 1.0-0.7*rand(float(i)*1.4333); // 0=far, 1=near
		float tickTime = time*z*speed + float(i)*1.23753;
		float tick = floor(tickTime);

		vec2 pos = vec2(0.6*aspect*(rand(tick)-0.5), -abs(sign(uv.x))*ySpread*(0.5-fract(tickTime)));
		pos.x += 0.18*sign(pos.x); // move aside
		if (abs(pos.x) < 0.1) pos.x++; // stupid fix; sign sometimes returns 0

		vec2 size = 1.8*z*vec2(0.04, 0.04 + 0.1*rand(tick+0.2));
		float b = circle(uv, pos, 0.01 + 0.15 * pulse);
		float dust = z*smoothstep(0.22, 0.0, b)*pulse*0.5;
		float block = 0.2*z*smoothstep(0.012, 0.0, b);
		float shine = 0.6*z*pulse*smoothstep(-0.002, b, 0.007);
        float u_Scale = 9.;
        float noise = sin(abs(cnoise(u_Scale * uv.xy)+0.5*cnoise(2. * u_Scale * uv.xy)+0.25*cnoise(4. * u_Scale * uv.xy)+0.125*cnoise(8. * u_Scale * uv.xy)));
		color += dust*baseColor*(1.+3. * noise) + block*z + shine;
	}
    baseColor = vec3(0.1, 0.3, 0.0);
    for (int i = 0; i < numBlocks; i++) {
		float z = 1.0-0.7*rand(float(i)*1.4333); // 0=far, 1=near
		float tickTime = time*z*speed + float(i)*1.23753;
		float tick = floor(tickTime);

		vec2 pos = vec2(0.6*aspect*(rand(tick)-0.5), -abs(sign(uv.x))*ySpread*(0.5-fract(tickTime)));
		pos.x += 0.24*sign(pos.x); // move aside
		if (abs(pos.x) < 0.1) pos.x++; // stupid fix; sign sometimes returns 0

		vec2 size = 1.8*z*vec2(0.04, 0.04 + 0.1*rand(tick+0.2));
		float b = circle(uv-pos, size, 0.02);
		float dust = z*smoothstep(0.22, 0.0, b)*pulse*0.5;
		float block = 0.2*z*smoothstep(0.002, 0.0, b);
		float shine = 0.6*z*pulse*smoothstep(-0.002, b, 0.007);
        float u_Scale = 9.;
        float noise = sin(abs(cnoise(u_Scale * uv.xy)+0.5*cnoise(2. * u_Scale * uv.xy)+0.25*cnoise(4. * u_Scale * uv.xy)+0.125*cnoise(8. * u_Scale * uv.xy)));
		color += dust*baseColor*(1.+noise) + block*z + shine;
	}
	color /= 1.5;
	color -= rand(uv)*0.04;
	gl_FragColor = vec4(color, 1.0);
}`,
    },
    {
        name: 'Soap Bubble by Ruzzyr',
        externalUrl: `${shaderToy}/XtVSDt`,
        shader: `${header}
mat3 rotateYmat(float ang) {
    return mat3(cos(ang), 0.0, sin(ang), 0.0, 1.0, 0.0, -sin(ang), 0.0, cos(ang));
}
mat3 rotateXmat(float ang) {
    return mat3(1.0, -0.0, 0.0, 0.0, cos(ang), -sin(ang), 0.0, sin(ang), cos(ang));
}
mat3 rotateZmat(float ang) {
    return mat3(cos(ang), -sin(ang), 0.0, sin(ang), cos(ang), 0.0, 0.0, 0.0, 1.0);
}
float map( vec3 p, vec3 origin, float s ) {
    vec3 offset = vec3(sin(p.x*2. + time*2.),cos(p.z*10. + time*2.),1.0)*0.1;
	float d = length(p + offset - origin)- s;
	offset = vec3(sin(p.x*3. + time*2.),cos(p.z*2. + time*2.),1.0)*0.2;
    for(int i = 0; i < 3; i++) {
        float prism2 = length(p + offset*float(i) - origin)- s;
        d = max(d, -prism2);
    }
  	return d;
}
void main(void) {
    vec2 uv = gl_FragCoord.xy/resolution.xy;
    uv = uv*2.0-1.0;
    uv.x *= resolution.x/resolution.y;
    mat3 rotation = //mat3(1.0);
      rotateXmat(time*0.4)*rotateYmat(time*0.5);
    vec3 direction = normalize(vec3(uv.x,uv.y, 1.0)*rotation);
    float t = 0.0;
	vec3 p;
    vec3 finalColor;
    vec3 origin = vec3(0.,0.,-4.)*rotation;
    vec3 offset;
    vec3 sphereOrigin = vec3(0., 0., 0.0);
    vec4 sound = texture2D(spectrum,vec2(gl_FragCoord.x/resolution.x, 0.75));
    float soundColor = texture2D(spectrum,vec2(0.5, 0.75)).x;
    vec3 color = vec3(.5 + sin(uv.x+time +soundColor*50.)*.4,.5 +cos(uv.y+time + soundColor*5.)*.5,.5);
    for (int k = 0; k <15; k++) {
        p = origin + t*direction;
        float d = map(p,sphereOrigin, 2.0);
        {
            vec3 directionalOffset = -normalize(p)*sound.x*normalize(vec3(uv, 1.0));
            vec3 position = p + directionalOffset;
            float radius = 0.1+float(k)*.5;
            float lineThickness = 0.02 + float(k)*0.01;
            //position.y += position.y*abs(uv.x);
            float distanceFromCenter = length(position);
            float condition = step( distanceFromCenter, radius)
                - step(distanceFromCenter, radius - lineThickness);
            finalColor += color*condition;
        }
        t += d;
    }
    float fog = 1.0/(1.0+t*t*0.1);
    gl_FragColor = vec4(finalColor+color*vec3(fog), fog);
}`,
    },
];

export default presets;
