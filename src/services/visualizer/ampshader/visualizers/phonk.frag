// https://www.shadertoy.com/view/dd2Xzm
// press pause and play if there's no music

// music frequency
float freq;

// hash vec2 to float
float hash21(vec2 p) {
    p = fract(p*vec2(452.127,932.618));
    p += dot(p, p+123.23);
    return fract(p.x*p.y);
}

// noise function by me
float noise(vec2 p) {
    vec2 q = floor(p);
    vec2 f = fract(p);
    return mix(mix(hash21(q+vec2(0,0)),hash21(q+vec2(1,0)),f.x),
               mix(hash21(q+vec2(0,1)),hash21(q+vec2(1,1)),f.x),f.y);
}

// fractal noise
float fbm(vec2 p) {
    float f = 0.;
    f +=     .5*noise(p);
    f +=    .25*noise(p*2.);
    f +=   .125*noise(p*4.);
    f +=  .0625*noise(p*8.);
    f += .03125*noise(p*16.);
    return f;
}

// background noise
float func(vec2 p) {
    return fbm(vec2(sin(iTime*.8),cos(iTime*.8))+p*fbm(p+.2*iTime)+noise(p+noise(p+noise(p))));
}

// rendering function
vec3 render(vec2 p) {
    p *= .55+.2*freq; // bounce

    // background
    vec3 colA = vec3(0,.18,0);
    vec3 colB = vec3(1.15,.75,.83);
    float k = pow(func(9.*p),1.2);
    vec3 col = smoothstep(colA,colB,vec3(k));

    // ball
    float x = atan(p.x,p.y); // polar x value
    // frequencies
    float f = texture(iChannel0, vec2(x*.018+.4,.25)).r;
    // radius
    float r = .2+4.*min(pow(f,8.),.1)*clamp(p.y+.06,0.,1.);
    // hollow circle
    float m = abs(length(p)-r)-.02;

    // draw the ball
    float b = fwidth(m); // blur value
    col = mix(col, vec3(1), smoothstep(b,-b,m));

    return clamp(col,0.,1.);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // pixel coordinates centered at the origin
    vec2 p = (fragCoord - .5*iResolution.xy) / iResolution.y;
    // normalized pixel coordinates
    vec2 q = fragCoord/iResolution.xy;

    // music frequency
    freq = texture(iChannel0, vec2(.01,.25)).r;

    // render with chromatic aberration
    vec2 off = (q-.5) * .03*pow(freq,4.); // CA offset
    vec3 col = vec3(render(p+off).r,
                    render(p).g,
                    render(p-off).b);

    col += .5*col*pow(freq,8.); // flash
    // vignette
    col *= .5+.5*pow(64.*q.x*q.y*(1.-q.x)*(1.-q.y),.1);

    col *= 1.-exp(-iTime*2.); // fade

    // output
    fragColor = vec4(col,1.0);
}
