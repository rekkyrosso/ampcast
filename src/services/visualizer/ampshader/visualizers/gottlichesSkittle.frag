// https://www.shadertoy.com/view/wsVSRt
/* NOT CURRENTLY USED */
float mittel(float winkel,float sen){
    float result = 0.1*texture(iChannel0, vec2(abs(winkel)/360. ,sen)).x;
    for(float i=1.;i<4.5;i++){
        result += 0.1*texture(iChannel0, vec2( (i)/360.+abs(winkel)/360. ,sen)).x;
    	result += 0.1*texture(iChannel0, vec2( (-i)/360.+abs(winkel)/360. ,sen)).x;
            }
    return result;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = ( fragCoord - .5*iResolution.xy) /iResolution.y;
    float sen = 0.2;
    float fft  = (
        texture(iChannel0, vec2(.0,sen)).x +
        texture(iChannel0, vec2(.3,sen)).x +
        texture(iChannel0, vec2(.6,sen)).x +
        texture(iChannel0, vec2(.9,sen)).x
    );
    float winkel = degrees(atan(uv.x,uv.y));

    float f = 	 (1./2.)*exp(abs(winkel)/360.)*(mittel(winkel,sen));
    float g = length(vec2(uv.x,uv.y))-0.5
        >
        0.25*f-0.2
        ? 0.0 : 1.0/(sqrt(length(vec2(uv.x,uv.y)))*3.0);

    float mod=abs(sin(iTime));
    float laser = f/(length(vec2(uv.x,uv.y))) +fft/(30.*length(vec2(uv.x,uv.y)));
    // Time varying pixel color
    vec3 col = vec3(laser+g*fft,laser*0.9,g);

    // Output to screen
    fragColor = vec4(col,1.0);
}
