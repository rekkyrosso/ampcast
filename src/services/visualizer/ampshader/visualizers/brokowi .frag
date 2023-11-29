// https://www.shadertoy.com/view/dllBWn
uniform float musicAmplitude; // Audio analysis data representing amplitude

vec3 palette(float d, float audioAmplitude) {
    vec3 yellow = vec3(0.6, 0.1, 0.0); // Yellow
    vec3 green = vec3(0.2, 1.7, 0.5); // Green

    d *= audioAmplitude * 0.1 + 0.5;
    vec3 color = mix(yellow, green, d);
    return color;
}

vec2 rotate(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return p * mat2(c, s, -s, c);
}

float map(vec3 p, float audioAmplitude) {
    float angle = iTime * 0.05 * (0.2 + musicAmplitude * 0.8) + sin(iTime * 0.2) * 0.0;
    for (int i = 0; i < 12; ++i) {
        float t = angle;
        p.xz = rotate(p.xz, t * 10.666);
        p.xy = rotate(p.xy, t * 40.666);
        p.xz = rotate(p.xz, t * 10.666);
        p.xy = rotate(p.xy, t * 50.666);
        p.xz = abs(p.xz);
        p.xz -= 0.5;
    }

    float sphere = length(p) - (0.5 + audioAmplitude * 0.1); // Adjust size based on audio amplitude

    return sphere;
}

vec4 rm(vec3 ro, vec3 rd, float audioAmplitude) {
    float t = 0.0;
    vec3 col = vec3(0.0);
    float d;
    for (float i = 0.0; i < 64.0; i++) {
        vec3 p = ro + rd * t;
        d = map(p, audioAmplitude) * 0.5;
        if (d < 0.02) {
            break;
        }
        if (d > 200.0) {
            break;
        }
        col += palette(length(p) * 0.1, audioAmplitude) / (400.0 * d);
        t += d;
    }
    return vec4(col, 1.0 / (d * 300.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - (iResolution.xy / 2.0)) / iResolution.x;
    float spiralTime = iTime * 0.05 * (0.2 + musicAmplitude * 0.8);
    vec3 ro = vec3(0.0, 0.0, -28.0);
    ro.xz = rotate(ro.xz, spiralTime);

    vec3 cf = normalize(-ro);
    vec3 cs = normalize(cross(cf, vec3(0.0, 4.0, 0.0)));
    vec3 cu = normalize(cross(cf, cs));

    float audioData = texture(iChannel0, vec2(iTime * 0.2, 0.0)).r; // Sample audio data from iChannel0
    float uuvScale = 0.7 + audioData * 0.2; // Scale adjusted with audio amplitude

    vec3 uuv = ro + cf * uuvScale + uv.x * cs + uv.y * cu;

    vec3 rd = normalize(uuv - ro);

    vec4 col = rm(ro, rd, musicAmplitude);

    fragColor = col;
}
