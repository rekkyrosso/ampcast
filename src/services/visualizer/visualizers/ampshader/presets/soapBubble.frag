// Soap Bubble by Ruzzyr
// https://www.shadertoy.com/view/XtVSDt


mat3 rotateYmat(float ang) {
    return mat3(cos(ang), 0.0, sin(ang), 0.0, 1.0, 0.0, -sin(ang), 0.0, cos(ang));
}

mat3 rotateXmat(float ang) {
    return mat3(1.0, -0.0, 0.0, 0.0, cos(ang), -sin(ang), 0.0, sin(ang), cos(ang));
}

mat3 rotateZmat(float ang) {
    return mat3(cos(ang), -sin(ang), 0.0, sin(ang), cos(ang), 0.0, 0.0, 0.0, 1.0);
}

float map( vec3 p, vec3 origin, float s ) {
    vec3 offset = vec3(sin(p.x*2. + time*2.),cos(p.z*10. + time*2.),1.0)*0.1;
	float d = length(p + offset - origin)- s;
	offset = vec3(sin(p.x*3. + time*2.),cos(p.z*2. + time*2.),1.0)*0.2;
    for(int i = 0; i < 3; i++) {
        float prism2 = length(p + offset*float(i) - origin)- s;
        d = max(d, -prism2);
    }
  	return d;
}

void main(void) {
    vec2 uv = gl_FragCoord.xy/resolution.xy;
    uv = uv*2.0-1.0;
    uv.x *= resolution.x/resolution.y;
    mat3 rotation = //mat3(1.0);
      rotateXmat(time*0.4)*rotateYmat(time*0.5);
    vec3 direction = normalize(vec3(uv.x,uv.y, 1.0)*rotation);
    float t = 0.0;
	vec3 p;
    vec3 finalColor;
    vec3 origin = vec3(0.,0.,-4.)*rotation;
    vec3 offset;
    vec3 sphereOrigin = vec3(0., 0., 0.0);
    vec4 sound = texture2D(spectrum,vec2(gl_FragCoord.x/resolution.x, 0.75));
    float soundColor = texture2D(spectrum,vec2(0.5, 0.75)).x;
    vec3 color = vec3(.5 + sin(uv.x+time +soundColor*50.)*.4,.5 +cos(uv.y+time + soundColor*5.)*.5,.5);
    for (int k = 0; k <15; k++) {
        p = origin + t*direction;
        float d = map(p,sphereOrigin, 2.0);
        {
            vec3 directionalOffset = -normalize(p)*sound.x*normalize(vec3(uv, 1.0));
            vec3 position = p + directionalOffset;
            float radius = 0.1+float(k)*.5;
            float lineThickness = 0.02 + float(k)*0.01;
            //position.y += position.y*abs(uv.x);
            float distanceFromCenter = length(position);
            float condition = step( distanceFromCenter, radius)
                - step(distanceFromCenter, radius - lineThickness);
            finalColor += color*condition;
        }
        t += d;
    }
    float fog = 1.0/(1.0+t*t*0.1);
    gl_FragColor = vec4(finalColor+color*vec3(fog), fog);
}
