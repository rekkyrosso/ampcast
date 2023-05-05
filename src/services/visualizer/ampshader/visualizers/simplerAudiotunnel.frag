// https://www.shadertoy.com/view/ldcfWH
/* NOT CURRENTLY USED (too trippy) */

float time = 0.1;
float sdCylinder( vec3 p, vec3 c )
{
  return length( p.xz - c.xy ) - c.z;
}


float sdCappedCylinder( vec3 p, vec2 h )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - h;
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float opS( float d1, float d2 )
{
    return max(-d1,d2);
}

 mat3 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}



vec2 map(vec3 p)
{

    vec3 q = p;
	p.z -= 0.1 * iTime + sin(iTime * 0.01)* 0.5;
    vec3 c = vec3(0.53 / 4.0);

    p.z = mod(p.z,c.z)-0.5*c.z;

    vec4 noise = texture(iChannel1, floor(q.zz / 1.0));

    float freq =  atan(p.x, -p.y) / 3.1415 * 2.0 + fract(q.z) * 3.1415 * 2.0;

    float audio = texture(iChannel0, vec2((freq), 0.0)).r;
    float audio2 = texture(iChannel0, vec2(fract(0.01*q.z), 0.0)).r;

  	float r1 = 1.9 ;

    float r2 = r1 * (1.0 -  audio2);


    float thickness = 0.02 * audio2;


    float inner = sdCappedCylinder(p.xzy , vec2(r2, 0.5));
    float outer = sdCappedCylinder(p.xzy, vec2(r1, thickness));

    float result = opS(inner, outer);

    float theta = iTime + q.z + audio2;
    float r = 1.0;
	float ball = length(p + vec3(r * cos(theta), r * sin(theta), 0.0)) - audio2* 2.0;
	result = opS(ball, result);

	ball = length(p + vec3(r * cos(-theta), r * sin(-theta), 0.0)) - audio2* 2.0;
	result = opS(ball, result);

	ball = length(p + vec3(r * cos(theta + 3.1415), r * sin(theta + 3.1415), 0.0)) - audio2* 2.0;
	result = opS(ball, result);

	ball = length(p + vec3(r * cos(-theta + 3.1415), r * sin(-theta + 3.1415), 0.0)) - audio2* 2.0;
	result = opS(ball, result);

    return vec2(result, audio2);

}


// See https://iquilezles.org/articles/palettes for more information


vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.28318*(c*t+d) );
}


void getCamPos(inout vec3 ro, inout vec3 rd)
{
    ro.z = iTime  ;
  //  ro.x -= sin(iTime /5.7);
  //  ro.y -= cos(iTime /  2.3);
}

 vec3 gradient(vec3 p, float t) {
			vec2 e = vec2(0., t);

			return normalize(
				vec3(
					map(p+e.yxx).x - map(p-e.yxx).x,
					map(p+e.xyx).x - map(p-e.xyx).x,
					map(p+e.xxy).x - map(p-e.xxy).x
				)
			);
		}

#define MAX_D 20.0
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	time = iTime * 0.5;

    vec2 _p = (-iResolution.xy + 2.0 * fragCoord.xy) / iResolution.y;
    vec2 noise = texture(iChannel0, _p).rg;

    vec3 ray = normalize(vec3(_p + noise * 0.01, 1.0));
    vec3 cam = vec3(0.0, 0.0, 0.0);
    bool hit = false;
    getCamPos(cam, ray);

    float depth = 0.0, iter = 0.0;
    vec2 d;
    vec3 p;

    for( int i = 0; i < 50; i ++)
    {
    	p = depth * ray + cam;
        d = map(p);

        if (d.x < 0.001 * pow(depth, 2.0)) {
			hit = true;
            break;
        }

        if (depth > MAX_D)
            break;

		depth += d.x * 0.2;
		iter++;
    }
    float ii = 1.0 - iter / 50.0;
    vec3 col = vec3(ii);
    if ( hit)
    col *= pal(d.y, vec3(0.5,0.5,0.9),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.10,0.20));

    fragColor = vec4(sqrt(sqrt(col)),1.0);

}
