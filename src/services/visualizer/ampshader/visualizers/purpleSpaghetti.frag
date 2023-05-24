// https://www.shadertoy.com/view/fsK3D1
const float period = 6.0;
const float PI = 3.1415;
float id;

bool multicol = false;

vec3 palette(float idx) {
    return vec3(cos(2.1 * PI * idx), cos(2.2 * PI * idx), cos(2. * PI * idx));
}

float SDF_sphere(vec3 point, float intensity)
{
    point.z += (intensity * 2.) + sin(iTime) * 0.05;
    float sphere = length(point) - .8;
    return sphere;
}

float SDF_cylinder(vec3 point, float intensity)
{
    point.x = mod(point.x, period) - (period * 0.5);
    point.y = abs(point.y) - 8.;

    point.x += sin(point.z * id * 0.2 + iTime);
    point.y += sin(point.z * id * 0.1 + iTime);

    float cylinder = length(point.xy) - 0.6;
    return cylinder;
}

float SDF(vec3 point, float intensity) {
    id = floor(point.x / period);

    float sphere = SDF_sphere(point, intensity);
    float cylinder = SDF_cylinder(point, intensity);

    if (cylinder < sphere) {
        multicol = true;
        return cylinder;
    } else {
        multicol = false;
        return sphere;
    }
}

float doSound(in vec2 fragCoord)
{
    // credit https://www.shadertoy.com/view/Xds3Rr

    // Fetch sound data
    vec2 uv = fragCoord.xy / iResolution.xy;
    int tx = int(uv.x * 512.0);
    float fft  = texelFetch( iChannel0, ivec2(tx,0), 0 ).x;

    return fft;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float intensity = doSound(fragCoord);

    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord / iResolution.xy;

    // Normalised pixel coordinates (from -1 to 1, taking into account aspect ratio)
    vec2 centered_uv = (2. * fragCoord - iResolution.xy) / iResolution.y;

    // Background
    vec3 col = vec3(0., 0., 0.);

    // Camera
    vec3 ray_origin = vec3(0., 0., -3.);

    // Frustrum
    vec3 ray_direction = normalize(vec3(centered_uv, 1.));

    // The point we're at, starting at the camera.
    vec3 point = ray_origin;

    // Walk along the ray.
    for(float i = 0.; i < 64.; i++) {
        float dist = SDF(point, intensity);

        if(dist < 0.0001) {
            // We hit it (or close enough)
            float shade = 1. - (i / 64.);
            if(multicol) {
                col = palette(id) * shade;
            } else {
                col = vec3(shade);
            }
            break;
        }

        point += (dist * ray_direction);
    }

    // Output to screen
    fragColor = vec4(col,1.0);




}
