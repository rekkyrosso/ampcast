// https://www.shadertoy.com/view/McBczR
//Thanks for the comments from FabriceNeyret2

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec3 col = vec3(0.);

    vec2 uv = fragCoord / iResolution.xy;

    float amp1 = texture(iChannel0, vec2(uv.x, .75)).r - 2.*uv.y + 1.;
    //col += smoothstep(3./iResolution.y, 0., abs(amp1));
    col += smoothstep(1.5, 0., abs(amp1)/fwidth(amp1));
    
    float amp0 = texture(iChannel0, vec2(uv.x, .25)).r - 2.*uv.y;
    col += step(0., amp0);
     
    fragColor = vec4(col,1.0);
}