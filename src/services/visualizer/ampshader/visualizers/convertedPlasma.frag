// https://www.shadertoy.com/view/7tGfRD
#define pi 3.14159
const vec2 vp = vec2(320.0, 200.0);

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float Freq = texture(iChannel0, vec2(0.)).r;
	float t = iTime * 10.0 + iMouse.x + Freq * 80.;
	vec2 uv = (fragCoord - iResolution.xy * .5) / iResolution.xy * (.7 + Freq * .3);
    float Rotate = cos(Freq * 5.) * .2;
    uv *= mat2(cos(Rotate), -sin(Rotate), sin(Rotate), cos(Rotate));
    uv += iTime * .3;

    vec2 p0 = (uv - 0.5) * vp;
    vec2 hvp = vp * 0.5;
	vec2 p1d = vec2(cos( t / 98.0),  sin( t / 178.0)) * hvp - p0;
	vec2 p2d = vec2(sin(-t / 124.0), cos(-t / 104.0)) * hvp - p0;
	vec2 p3d = vec2(cos(-t / 165.0), cos( t / 45.0))  * hvp - p0;
    float sum = 0.5 + 0.5 * (
		cos(length(p1d) / 40.0) +
		cos(length(p2d) / 30.0) +
		sin(length(p3d) / 35.0) * sin(p3d.x / 20.0) * sin(p3d.y / 15.0)
    );
    vec3 Color = vec3(cos(Freq + uv.x * 3. + iTime + pi * .333333) * .5 + .5, cos(Freq + uv.y * 3. + iTime + pi * .666666) * .5 + .5, -cos(Freq + length(uv) * 3. + iTime) * .5 + .5);
    fragColor = vec4(Color * texture(iChannel0, vec2(fract(sum + iTime), 0.)).r, 1.);
}
