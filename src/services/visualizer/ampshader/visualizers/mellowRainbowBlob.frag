// https://www.shadertoy.com/view/4dXcWB
#define t iTime
#define ic0 iChannel0

const float EPS = 0.001;
const float MAX_ITER = 40.0;
const float MAX_T = 100.0;

vec3 simple_camera(vec2 uv) {
    vec3 forward = vec3(0.0, 0.0, -1.0);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 side = vec3(1.0, 0.0, 0.0);
    return normalize(forward + uv.x * side + uv.y * up);
}

float opU( float d1, float d2 ) {
  return min(d1, d2);
}

// Smooth minimum : https://iquilezles.org/articles/smin
float smin( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}


float sdSphere(vec3 p, float s) {
  return length(p)-s;
}

float sdPlane(vec3 p, vec4 n) {
    return dot(p, n.xyz) + n.w;
}

/*
	Return the closest distance to any surface from point p.
 */
float map(vec3 p) {
    //float s1 = sdSphere(p - vec3(0.0, 0.0 + sin(iTime * 2.0), -3.0), 1.0);
    float s1 = sdSphere(p - vec3(0.0, -0.5 + texture(ic0, vec2(.1, 0.)).x * 2. + sin(iTime * 2.0)/ 5., -3.0), 0.7 + texture(ic0, vec2(.4, 0.)).x);
    float s2 = sdPlane(p - vec3(0.0, -1.0, 0.0), vec4(0.0, 1.0, 0.0, 1.0));
    return smin(s1, s2, 4.0);
}


float intersect(vec3 origin, vec3 rayDir)
{
    float t = 0.0;
    float dt = 0.1;

    for (float i = 0.0; i < MAX_ITER; i += 1.0) {
        t += dt;

        dt = map(t * rayDir + origin);
        if (abs(t) < EPS) {
            break;
        }

        if (t > MAX_T) {
            t = 0.0;
            break;
        }

    }
	return t;
}



vec3 plasma(vec2 uv) {
    float s1 = .5 + .5 * min(texture(ic0, vec2(.1, 0.) ).x * 1.5, 1.);
    float s2 = .5 + .5 * min(texture(ic0, vec2(.4, 0.) ).x * 1.5, 1.);
    float s3 = .5 + .5 * min(texture(ic0, vec2(.6, 0.) ).x * 1.5, 1.);
    float s4 = .5 + .5 * min(texture(ic0, vec2(.9, 0.) ).x * 1.5, 1.);

    vec2 p1 = vec2(0., 0.);
    vec2 p2 = vec2(0., 1.);
    vec2 p3 = vec2(1., 1.0);
    vec2 p4 = vec2(1., 0.);

    float c1 = .5 + .5 * sin(distance(uv, p1) * 10. * s1 + t + s1 / 4.);
    float c2 = .5 + .5 * sin(distance(uv, p2) * 10. * s2 + t + s2 / 4.);
    float c3 = .5 + .5 * sin(distance(uv, p3) * 10. * s3 + t + s3 / 4.);
    float c4 = .5 + .5 * sin(distance(uv, p4) * 25. * s4 + t * 3. + s4 / 4.);

	return vec3(c1 + c4 * .33, c2 + c4 * .33, c3 + c4 * .33);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = 2.0 * fragCoord.xy / iResolution.xy - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 cameraOrigin = vec3(0.0);
    vec3 rayDir = simple_camera(uv);

    vec3 color = vec3((uv.y - 0.5) * (1.5 + sin(t * .2) * .5), 0.0, uv.y);

    float t = intersect(cameraOrigin, rayDir);

    if (t > 0.0) {
        // calculate intersection point
        vec3 hit = cameraOrigin + t * rayDir;

        // get the color of the pixel
        //color = texture(iChannel0, hit.xy).xyz;
        color = plasma(hit.xy / 7.);

        // fade with distance
        color *= vec3(6.0 / (t*t));
    }


    fragColor = vec4(color, 1.0);
}
