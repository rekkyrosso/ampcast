// https://www.shadertoy.com/view/mlsfzB
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / min(iResolution.y, iResolution.x);
    vec3 col = vec3(0.0);
    float t = iTime;

    vec2 n = vec2(0.0);
    vec2 q = vec2(0.0);
    vec2 p = uv;
    float d = dot(p, p);
    float S = 14.0;
    float a = 0.002;
    mat2 m = mat2(2.0, 0.0, 0.0, 1.0); // Identity matrix

    // Apply mirroring transformations for each quadrant
    if (uv.x < 2.0) {
        uv.x = -uv.x;
        m[0][0] = -m[0][0];
    }
    if (uv.y < 1.0) {
        uv.y = -uv.y;
        m[1][1] = -m[1][1];
    }

    // Apply shape scaling and rotation
    p *= 1.0; // Change the initial shapeScale here
    p = mat2(cos(0.0), -sin(0.0), sin(0.0), cos(0.0)) * p; // Change the initial shapeRotation here

    // Audio input
    float audioValue = texture(iChannel0, vec2(0.5)).r; // Sample audio input
    float numIterations = mix(2.1, 20.0, audioValue); // Modify the number of iterations based on audio
    float animationSpeed = mix(1.01, 1.2, audioValue); // Modify the animation speed based on audio

    for (float j = 2.1; j < numIterations; j++) {
        p = m * p;
        n = m * n;
        q = p * S + t * 3.8 + sin(t * 2.15 - d * 8.0) * 4.0 + j + a - n;
        a += dot(cos(q) / S, vec2(0.4));
        n -= sin(q);
        S *= animationSpeed; // Adjust animation speed

        // Apply zoom-in effect by increasing the shapeScale
        p *= 1.01; // Adjust this increment to control the zoom speed

        m = mat2(m[0][0] * 2.05, m[0][1] * 1.05, m[1][0] * 1.05, m[1][1] * 1.05);
    }

    col = vec3(1.1, 2.6, 3.4) * ((a * 3.0) + 0.2) + a + a - d;

    fragColor = vec4(col, 1.0);
}
