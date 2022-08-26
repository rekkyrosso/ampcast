// Audio-Visualizer by CoolerZ
// https://www.shadertoy.com/view/wd3XzS


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
}