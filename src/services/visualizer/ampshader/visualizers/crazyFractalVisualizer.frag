// https://www.shadertoy.com/view/Msffz7
/* NOT CURRENTLY USED (too weird) */
const int ITS = 50;
const float pi = 3.1515926536;
const vec2 c1 = vec2(0, 1);
const vec2 c2 = vec2(.866, -.866);
const vec2 c3 = vec2(-.866, -.866);

vec2 circleInverse(vec2 pos, vec2 center, float rad){
    vec2 d = pos - center;
	return d * rad * rad/dot(d, d) + center;
}

vec3 gasket(vec2 pos){
    float rad1 = .75 + .75 * texture(iChannel0, vec2(.5, .2)).x;
    float rad2 = 1.0;
    float rad3 = 1.0;
    float index = 0.;
	for(int i = 0 ; i < ITS; i++){
		if(distance(pos, c1) < rad1){
			pos = circleInverse(pos, c1, rad1); index++;
		}
        else if(distance(pos, c2) < rad2){
			pos = circleInverse(pos, c2, rad2); index++;
		}
        else if(distance(pos, c3) < rad3){
			pos = circleInverse(pos, c3, rad3); index++;
		}
        else if(pos.y < 0.){
			pos = vec2(pos.x, -pos.y); index++;
		}
        else return vec3(pos, index);
	}
}

vec4 getCol(vec3 n){
    float s = 0.08 * (4.0-length(n.xy)) + n.z;
    if (n.z==50.0)return vec4(0);
    float arg = pi * s / 20.;
    float shift = 2. * texture(iChannel0, vec2(.5 * sin(100. * n.z / float(ITS)) + .5, .2)).x;
    vec3 col = sin(vec3(arg - shift * pi, arg - shift * 2. * pi, arg - 4. * shift * pi / 3.)) * 0.5 + 0.5;
    return vec4(col*col, 1.);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 pos = fragCoord.xy / iResolution.y - .5 * vec2(iResolution.x / iResolution.y, 1.);
    pos.y -= .2;
    fragColor = getCol(gasket(pos));
}
