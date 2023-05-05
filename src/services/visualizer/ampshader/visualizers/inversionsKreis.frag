// https://www.shadertoy.com/view/tlcGRH
bool swi = false;
float speed = 1.;

float getAnim(float t){
    return tan(speed*t)*1.;
}

float farbe(float t){
    float anim = cos(speed*t);
    if(abs(anim)==1.)
       swi = swi ? false : true;

    if(swi)
        return (anim<0.?1.:-1.);
    else
        return (anim>=0.?1.:-1.);
}

vec2 ri = vec2(0.25,0.25);

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = ( fragCoord - .5*iResolution.xy) /iResolution.y;
    float sen = 0.25;
    float fft  = (
        texture(iChannel0, vec2(.0,sen*20.)).x +
        texture(iChannel0, vec2(.3,sen)).x +
        texture(iChannel0, vec2(.6,sen)).x +
        texture(iChannel0, vec2(.9,sen)).x
    );
    float high = (
        texture(iChannel0, vec2(.7,sen)).x +
        texture(iChannel0, vec2(.9,sen*2.)).x
    );
    float low = (
        texture(iChannel0, vec2(.0,sen)).x+
        texture(iChannel0, vec2(.05,sen)).x+
        texture(iChannel0, vec2(.1,sen)).x
    );


    //float b = 2.0-length(vec2(uv.x,uv.y));
    float b = texture(iChannel0, vec2(1.2*length(vec2(uv.x,uv.y))
                                      //Kreisverlauf A
                                      //-1.5*(mod(iTime*0.125, 1.)*2. - 1.)
                                      //Kreisverlauf B
                                      -0.2*sin(iTime*0.5)+.1
                                      -0.1*low,sen*1.2)).x;
    float g = length(vec2(uv.x,uv.y))-0.5
        >
        (0.09)*low//*(sin(3.*(atan(uv.x-aspect/2.,uv.y-1./2.)+sin(iTime)))+1.)
        -.2*getAnim(iTime)
        ? 1.+1.5*(farbe(iTime))*b : 1.-1.5*(farbe(iTime))*b;

    // Time varying pixel color
    float red = (iTheme.r/255.0)*abs(sin(iTime*0.1));
    float green = (iTheme.g/255.0)*abs(sin(iTime*0.11));
    float blue = (iTheme.b/255.0)*abs(sin(iTime*0.12))+0.2;
    vec3 col = vec3(g*red,g*green,g*blue);

    // Output to screen
    fragColor = vec4(col,1.0);
}
