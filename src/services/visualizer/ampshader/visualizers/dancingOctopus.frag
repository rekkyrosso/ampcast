// https://www.shadertoy.com/view/MdSyDy
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
  vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = uv - vec2(0.5, 0.5);
    p.y += .05;

    vec4 sound = texture(iChannel0, uv);

    float ed = sound.x / 1.4;
    vec2 lep = p;
    lep.y -= 0.38;
    lep.x += 0.03;
    float le = length(lep) / ed;
    le = smoothstep(0.05, 0.06, le);

    vec2 rep = p;
    rep.y -= 0.38;
    rep.x -= 0.030;
    float re = length(rep) / ed;
    re = smoothstep(0.05, 0.06, re);

    vec2 m = p;
    m.y -= .31;
    float a = -40.;
    float b = 0.;
    float c = 0.;
    if(m.y <= -0.066) {
      m.y = 1.;
    }

    float pb = abs(a * (m.x * m.x) + b * m.x + c - m.y);
    pb = smoothstep(0.003, 0.004, pb * sound.x / 1.4);

    float r = 0.3 + 0.15 * cos(atan(p.x, p.y) * 3. / sound.x);
    float rr = smoothstep(r, r - 0.01, length(p));

  vec3 col = vec3(.2, .5, 1.);
    col *= (rr / (r * 2.));
    col *= le;
    col *= re;
    col *= pb;

    if(uv.y <= 0.25) {
        col = vec3(0.);
    }

    fragColor = vec4(col,1.0);
}