// https://www.shadertoy.com/view/4fVcDK
#define PI 3.141592
#define orbs 5.

// --- Controls (edit these defaults if you want fixed values) ---
#define HUE_RADIAL_STRENGTH_DEFAULT -0.45   // >0: outward hue increase, <0: invert
#define HUE_RADIAL_EXP_DEFAULT      0.5   // 1 = linear with radius; >1 steeper, <1 gentler
// ---------------------------------------------------------------

// --- HSV helpers for hue shifting ---
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs((q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

vec2 kale(vec2 uv, vec2 offset, float sides) {
  float angle = atan(uv.y, uv.x);
  angle = ((angle / PI) + 1.0) * 0.5;
  angle = mod(angle, 1.0 / sides) * sides;
  angle = -abs(2.0 * angle - 1.0) + 1.0;
  float y = length(uv);
  angle = angle * (y);
  return vec2(angle, y) - offset;
}

vec4 orb(vec2 uv, float size, vec2 position, vec3 color, float contrast) {
  return pow(vec4(size / length(uv + position) * color, 1.), vec4(contrast));
}

mat2 rotate(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = 23.09 * (2. * fragCoord - iResolution.xy) / iResolution.y;
  float dist = length(uv);
  fragColor = vec4(0.);
  
  // Audio spectrum
  float bass    = texture(iChannel0, vec2(0.005, 0.0)).r;
  float midBass = texture(iChannel0, vec2(0.01,  0.0)).r;
  float treble  = texture(iChannel0, vec2(0.3,   0.0)).r;

  // Smooth audio
  bass   = mix(0.5, bass,   0.5);
  treble = mix(0.5, treble, 0.5);
  bass *= 4.0;

  uv *= rotate(iTime / 20.);
  uv = kale(uv, vec2(6.97), 10.);
  uv *= rotate(iTime / 5.);
  
  for (float i = 0.; i < orbs; i++) {
    uv.x += 0.57 * sin(0.3 * uv.y + iTime);
    uv.y -= 0.63 * cos(0.53 * uv.x + iTime);
    float t = i * PI / orbs * 2.;
    float x = 4.02 * tan(t + iTime / 10.);
    float y = 4.02 * cos(t - iTime / 30.);
    vec2 position = vec2(x, y);
    vec3 color = cos(vec3(-2, 0, -1) * PI * 2. / 3. + PI * (float(i) / 5.37)) * 0.5 + 0.5;
    fragColor += orb(uv, 1.39, position, color, 4.0 - bass);
  }

  // --- Hue: time drift + radial control ---
  float hueSpeed = 0.3; // set to 0.0 if you only want radial control

  // Normalized radius from screen center (independent of your uv scaling)
  vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  float r = length(p);

  // Live control with mouse; fallback to defaults when mouse not pressed
  float radialStrength = HUE_RADIAL_STRENGTH_DEFAULT;
  float radialExp      = HUE_RADIAL_EXP_DEFAULT;
  if (iMouse.z > 0.5) {
      radialStrength = (iMouse.x / iResolution.x) * 2.0 - 1.0; // [-1, 1]
      radialExp      = max(0.2, (iMouse.y / iResolution.y) * 3.0); // [0.2, 3]
  }

  // Apply hue offset: outward = more hue shift
  vec3 hsv = rgb2hsv(fragColor.rgb);
  float radialHue = radialStrength * pow(r, radialExp);
  hsv.x = fract(hsv.x + iTime * hueSpeed + radialHue);
  fragColor.rgb = hsv2rgb(hsv);
}
