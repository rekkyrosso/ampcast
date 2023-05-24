// https://www.shadertoy.com/view/wtffDl
#define SHOW_LIGHTS 1
#define LIGHT_SIZE  0.2

#define M_NONE		0.0
#define M_FLOOR		1.0
#define M_SPHERE	2.0
#define M_SPHERE2	3.0
#define M_L1		4.0
#define M_L2		5.0

float m(float i) {
    return texture(iChannel0, vec2(i, 0.0)).x * 2.0;
}

vec3 camera(vec2 uv, vec3 origin, vec3 target) {
    vec3 forward = normalize((target - origin) * vec3(1.0, 1.0, 2.5));
	vec3 side = cross(forward, vec3(0.0, 1.0, 0.0));
	vec3 up = cross(side, forward);
	vec3 rayDir = forward + uv.x * side + uv.y * up;
	return normalize(rayDir);
}

float sdSphere( vec3 p, float s ) {
	return length(p) - s;
}

float sdPlane(vec3 p, vec4 n) {
	return dot(p, n.xyz) + n.w;
}

// Smooth minimum : https://iquilezles.org/articles/smin
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float smin08( float a, float b) {
    return smin(a, b, 0.8);
}

vec3 l1pos() {
    return vec3((-3.0 + m(0.1)) * cos(iTime), m(0.6), -5.0);
}

vec3 l2pos() {
    return vec3((3.0 + m(0.2)) * cos(iTime), m(0.5), -5.0);
}

vec2 map(vec3 p, bool lights) {
    float sphere = sdSphere(p - vec3(0.0, sin(iTime) * 0.2 * m(0.2) * 5.0, -3.0), 1.0);
    float plane = sdPlane(p, vec4(0.0, 1.0, 0.0, 1.0));

    float sphere2 = smin08(
        sdSphere(p - vec3( 1.5, -1.0 + sin(iTime * 4.0) * 0.2, -2.5), 1.0),
        sdSphere(p - vec3(-1.5,-1.0 + sin(iTime * 4.0 + 3.14) * 0.2, -2.5), 1.0)
    );

    #if (SHOW_LIGHTS == 0)
    lights = false;
    #endif
    float l1 = lights ? sdSphere(p - l1pos(), LIGHT_SIZE) : 100000.0;
    float l2 = lights ? sdSphere(p - l2pos(), LIGHT_SIZE) : 100000.0;

    float d = min(min(smin08(sphere2, smin08(sphere, plane)), l1), l2);

    if (d == sphere) return vec2(d, M_SPHERE);
    if (d == sphere2)return vec2(d, M_SPHERE2);
    if (d == plane)  return vec2(d, M_FLOOR);
    if (d == l1)  return vec2(d, M_L1);
    if (d == l2)  return vec2(d, M_L2);

    return vec2(d, M_NONE);
}

vec3 normal(vec3 p) {
    vec3 eps = vec3(0.01, 0.0, 0.0);
    float x = map(p, true).x;
    return normalize(vec3(
        map(p + eps.xzz, true).x - x,
        map(p + eps.zxz, true).x - x,
        map(p + eps.zzx, true).x - x
    ));
}

vec2 intersect(vec3 origin, vec3 rayDir) {
    float eps = 0.01;
    float maxDistance = 100.0;
    float t = 0.0;

    vec2 dm = vec2(0.1, M_NONE);

    for (int i = 0; i < 200; i++) {
        t += dm.x;
        dm = map(t * rayDir + origin, true);

        if (abs(dm.x) <= eps) {
            break;
        }
        if (t > maxDistance) {
            return vec2(0.0, M_NONE);
        }
    }
    return vec2(t, dm.y);
}

// Soft shadows: https://iquilezles.org/articles/rmshadows
float shadow(in vec3 ro, in vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    for (float t = mint; t < maxt;) {
        float h = map(ro + rd * t, false).x;
        if (h < 0.001)
            return 0.0;
        res = min(res, k * h / t);
        t += h;
    }
    return res;
}

float is_shadow(vec3 hit, vec3 lightpos) {
    vec3 rayDir = normalize(lightpos - hit);
    float maxDistance = abs(length(lightpos - hit));
    return shadow(hit, rayDir, 0.1, maxDistance, 32.0);
}

vec3 diffuseLightning(vec3 n, vec3 lightDir, vec3 lightColor) {
    float diffuse = dot(n, lightDir);
    return lightColor * max(0.0, diffuse);
}

vec3 specularLightning(vec3 n, vec3 rayDir, vec3 lightDir, vec3 lightColor, float shininess) {
    float ratio = dot(rayDir, -reflect(lightDir, n));
	return lightColor * pow(max(0., ratio), shininess);
}

vec3 light(vec3 lightPos, vec3 lightColor, vec3 color, vec3 hit, vec3 n, vec3 rayDir) {
    vec3 lightDir = normalize(hit - lightPos);
    vec3 refLight = reflect(lightDir, n);

    float dist = length(hit - lightPos);
    float attenuation = (1.0 / (dist * dist)) * (sin(iTime) * 150.0 + 175.0);
    lightColor *= attenuation;
    color += diffuseLightning(n, refLight, lightColor) / 5.0;
    color *= diffuseLightning(n, refLight, lightColor);
    color += specularLightning(n, rayDir, lightDir, lightColor, 50.);
    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
	vec2 uv = 2.0 * fragCoord.xy / iResolution.xy - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 cameraOrigin = vec3(-(sin(iTime * 0.2) * 3.0 + 2.0), sin(iTime * 0.33) * 3.0 + 2.0, 3.0) * (sin(iTime * 0.66) * 0.25 + 0.75);
    vec3 cameraTarget = vec3(0.0, -3.0, 0.0);

	vec2 mPos = vec2(0.0);
    if (iMouse.x > 0.0 && iMouse.y > 0.0) {
        mPos = 2.0 * iMouse.xy / iResolution.xy - 1.0;
    }

    cameraTarget.xy -= mPos * 8.;

    vec3 rayDir = camera(uv, cameraOrigin, cameraTarget);

    vec3 color = vec3(0.0);

    vec2 dm = intersect(cameraOrigin, rayDir);
    float t = dm.x;
    float material = dm.y;

    if (t > 0.0) {
        vec3 hit = cameraOrigin + t * rayDir;

        vec3 n = normal(hit);
        vec3 origColor = vec3(1.0, 0.5, 0.7);

        vec3 l1color = vec3(sin(iTime * 2.1111) * 0.5 + 0.5, 0.5, sin(iTime * 5.1111) * 0.5 + 0.5);
        vec3 l1 = light(l1pos(),
                        l1color,
                        origColor,
                        hit,
                        n,
                        rayDir) * is_shadow(hit, l1pos());

        vec3 l2color = vec3(sin(iTime * 8.1111) * 0.5 + 0.5, 0.5, sin(iTime * 1.333) * 0.5 + 0.5);
        vec3 l2 = light(l2pos(),
                        l2color,
                        origColor,
                        hit,
                        n,
                        rayDir) * is_shadow(hit, l2pos());

        color = l1 + l2;

        #if (SHOW_LIGHTS == 1)
        if (material == M_L1) color = l1color * 5.0;
        if (material == M_L2) color = l2color * 5.0;
        #endif
    }

    fragColor = vec4(color, 1.0);
}
