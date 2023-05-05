// https://www.shadertoy.com/view/WsGfDm
const float PI = 3.14;

float plot(vec2 st, float pct){
  return  smoothstep( pct-0.015, pct, st.y) -
          smoothstep( pct, pct+0.015, st.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    vec4 col = vec4( 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4)), 1.);
    vec4 top = texture(iChannel0, vec2(uv.x,1.));
    float pl = plot(uv,top.r);
    vec4 osc=vec4(vec3(pl),1.);


    uv.y = abs(uv.y*2.-1.);
    osc.b /= 10.*uv.y;
    osc.g /=5.*uv.y;

    // Output to screen
    // compress X coord
    float comp = floor(uv.x*80.)/80.;
    float ultraComp = floor(uv.y*1.)/1.;

    vec4 backgrCol = texture(iChannel0, vec2(ultraComp, 0.));
    backgrCol.b = backgrCol.r / (uv.y*10.*uv.x)/2.;
    backgrCol.g = backgrCol.r / (uv.y*6.*uv.x)/8.;
    backgrCol.r = backgrCol.r / (uv.y*8.*uv.x)/1.;

    // get texture from channel0
    fragColor = texture(iChannel0, vec2(comp, 0.));
    // colorize texture
    fragColor.g = sin(fragColor.r*PI);
    fragColor.b = abs(fragColor.r - 1.);

    fragColor *= step(uv.y, fragColor.r);
    fragColor = fragColor/1.2 + osc;
    fragColor = fragColor + backgrCol/4.;
}
