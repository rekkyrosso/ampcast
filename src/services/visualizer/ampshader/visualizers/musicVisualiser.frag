// https://www.shadertoy.com/view/Mst3Wl
mat3 rotateYmat(float ang)
{
    return mat3(cos(ang), 0.0, sin(ang),
                0.0, 1.0, 0.0,
                -sin(ang), 0.0, cos(ang));
}
mat3 rotateXmat(float ang)
{
    return mat3(1.0, -0.0, 0.0,
                0.0, cos(ang), -sin(ang),
                0.0, sin(ang), cos(ang));
}

float sdSphere( vec3 p, float s )
{
    vec3 o = vec3(sin(p.x*2. + iTime*2.),cos(p.z*10. + iTime*2.),1.0)*0.1;
	float d = length(p + o)- s;
	o = vec3(sin(p.x*3. + iTime*2.),cos(p.z*2. + iTime*2.),1.0)*0.2;
    for(int i = 0; i < 3; i++)
    {
        float prism2 = length(p + o*float(i))- s;
        d = max(d, -prism2);
    }
  	return d;
}
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy/iResolution.xy;
    uv = uv*2.0-1.0;
    uv.x *= iResolution.x/iResolution.y;

    vec3 dir = normalize(vec3(uv, 1.0))*rotateYmat(iTime)*rotateXmat(iTime);

    float t = 0.0;
	vec3 p;
    vec3 fc;
        vec3 o = vec3(0.,0.,-4.)*rotateYmat(iTime)*rotateXmat(iTime);
        vec4 s = texture (iChannel0,vec2(fragCoord.x/iResolution.x-0.01, 0.75));
		vec3 cl = vec3(.5 + sin(uv.x+iTime +s.x*5.)*.4,.5 +cos(uv.y+iTime + s.x*5.)*.5,.5);
        for (int k = 0; k <15; k++)
        {
            p = o + t*dir;
            float d = sdSphere(p, 2.0);

            {
                vec3 position = p;
                float radius = 0.1+float(k)*0.5+clamp(s.x, 0.0, 1.0)*1.;
                float lineThickness = 0.02 + float(k)*0.01;

                vec3 o = vec3(sin(position.x*10. + iTime*0.9),sin(position.y*10. + iTime ),cos(position.z*10. + iTime*1.9))*0.5;
                float condition = step(length(position + o) , radius)
                                      - step(length(position + o), radius - lineThickness);
                fc += cl*condition;
            }

            t += d;
        }
    fragColor = min(vec4(fc+cl*vec3(1.0/(1.0+t*t*0.1)), 1.0), vec4(1.0));
}
