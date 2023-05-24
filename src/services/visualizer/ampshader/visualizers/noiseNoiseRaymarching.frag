// https://www.shadertoy.com/view/MtKyDR
#define DISTANCE 50.0
#define STEP 0.0
#define STEPINC 0.00005
#define SEED 10283.2
#define PERSISTENCE 1.0
#define SPEED 3.0
#define BRIGHTNESS 1.0
#define SPEC_POW 100.0
#define SPEC_INTENSITY 10.0

struct Ray{
    vec3 origin;
    vec3 direction;
};

float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }


float noise(vec3 x) {
	const vec3 Step = vec3(110, 241, 171);

	vec3 i = floor(x);
	vec3 f = fract(x);

	// For performance, compute the base input to a 1D hash from the integer part of the argument and the
	// incremental change to the 1D based on the 3D -> 1D wrapping
    float n = dot(i, Step);

	vec3 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix( hash(n + dot(Step, vec3(0, 0, 0))), hash(n + dot(Step, vec3(1, 0, 0))), u.x),
                   mix( hash(n + dot(Step, vec3(0, 1, 0))), hash(n + dot(Step, vec3(1, 1, 0))), u.x), u.y),
               mix(mix( hash(n + dot(Step, vec3(0, 0, 1))), hash(n + dot(Step, vec3(1, 0, 1))), u.x),
                   mix( hash(n + dot(Step, vec3(0, 1, 1))), hash(n + dot(Step, vec3(1, 1, 1))), u.x), u.y), u.z);
}

float getNoise(vec3 loc){
    return noise(vec3(loc * PERSISTENCE) + vec3(SEED + texture(iChannel0, (loc.xy * 0.01) - vec2(0.5)) * 10.0)) * (length(loc.xy));
}

vec3 getNormal(vec3 pos){
	vec2 eps = vec2(1.0, 0.0);

	vec3 nor = vec3(getNoise(pos + eps.xyy) - getNoise(pos - eps.xyy),
			getNoise(pos + eps.yxy) - getNoise(pos - eps.yxy),
			getNoise(pos + eps.yyx) - getNoise(pos - eps.yyx));
	return normalize(nor);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 UV = fragCoord / iResolution.xy;
    vec2 screenPos = UV * 2.0 - vec2(1.0);
	vec3 camLoc = vec3(0, 0, iTime * SPEED);
    vec3 calcDir = vec3(screenPos.x, screenPos.y * (iResolution.y / iResolution.x), 1.0);

    Ray mainRay;
    mainRay.origin = camLoc;
    mainRay.direction = calcDir;

    float dist = 0.0;

    float brightness = 0.0;

    float stepDist = STEP;
    vec3 location;

    for(float t = 0.0; t < DISTANCE; t += stepDist){
        location = mainRay.origin + (mainRay.direction * t);
        if(getNoise(location) > 0.99){
            /*while(getNoise(location) > 0.5){
                t -= 0.01;
                location = mainRay.origin + (mainRay.direction * t);
            }*/
            dist = t / DISTANCE;
            vec3 norm = getNormal(location);

            vec3 dirToCam = normalize(location - camLoc);

            brightness = clamp(dot(dirToCam, norm), 0.0, 1.0);

            vec3 refVec = reflect(norm, dirToCam);

            float spec = pow(clamp(-dot(refVec, dirToCam), 0.0, 1.0), SPEC_POW) * SPEC_INTENSITY;

            brightness += spec;

            brightness *= 1.0 / (t);

            brightness *= BRIGHTNESS;

            break;
        }
        stepDist += STEPINC;
    }

    vec3 color = 0.5 + 0.5*cos((iTime*2.0)+location+vec3(0,2,4));

    // Output to screen
    //fragColor = vec4(snoise(vec4(UV * PERSISTENCE, 1023.0, 210.4)));
    fragColor = vec4(brightness * color, 1.0);
}
