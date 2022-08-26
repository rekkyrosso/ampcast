// Bubbles by liyouvane
// https://www.shadertoy.com/view/llXBWB


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
}
