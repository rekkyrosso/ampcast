// https://www.shadertoy.com/view/3sfXRj
float line(vec2 p, vec2 p0, vec2 p1)
{
    vec2 a = p-p0; // the vector that we want to project on b
    vec2 b = p1-p0; // this line is our goal.

    vec2 proj = clamp((dot(a,b)/dot(b,b)),0.0,1.0)*b; // vector projection of a onto b
    vec2 rejc = a-proj; // vector rejection or distance in other words

    return smoothstep(0.0,1.2,1.0-dot(rejc, rejc)*1e4);
} // stolen: https://www.shadertoy.com/view/4d3fWr

vec2 random12(float i) {
    return normalize(vec2(sin(329.34+131.8*sin(722.1*i+8.23)),
                sin(494.34+2871.1*sin(431.1*i+415.39))));
}

float random (in vec2 _st) {
    return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

#define NUM_OCTAVES 5

float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void mainImage( out vec4 O, in vec2 U )
{
    vec2 R = iResolution.xy;
    vec2 uv = ( U - 0.5*R) / R.y;
    float t = iTime/2.;

    float angle1 = (3.1415)* (t/4.0);

    float s1 = sin(angle1);
    float c1 = cos(angle1);

    uv *= mat2(c1, -s1, s1, c1);


  	vec2 bgUV = uv * 10.;

	vec3 col = vec3(124,41,212)/255.0;



    float m = texture( iChannel0, vec2(1.,0.25) ).x;;

    float col_1 = -fbm(bgUV + vec2(t,0.)+fbm(bgUV + t));

	col += col_1;

    vec3 col2 = vec3(0);

    float numChannels = 16.; // all 512 seems overkill
    float maxFreq = 0.;
    for(float i = 0.; i < 1.; i += 0.0625) {
        float fft  = texture( iChannel0, vec2(i,0.25) ).x;

        for(float j = 0.; j < 4.;j+= 1.) {
            vec2 segment = random12(i+j)*fft;
            col2 += line(uv, vec2(0),segment*fbm(segment+t))*fft;
        }

    }

    col2 *= 0.4 + 0.6*sin(18.*smoothstep(-1.,1.,m)*(1.0-length(uv)));

    col += col2;

	// output final color
	O = vec4(col,1.0);
}
