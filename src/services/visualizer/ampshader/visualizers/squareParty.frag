// https://www.shadertoy.com/view/Nfc3Wl
void mainImage(out vec4 O, vec2 I) {
float  S,  q,  u,  a,  r, e = iTime,
au =  texture(iChannel0, vec2(.005,
.25)).x; vec3 p, P; for (O *= S; S++
< 50.; q += u * .3) { P = iResolution;
p = q * normalize(vec3(I + I - P.xy,
P.y  /  q));  p.z += e + q * au * au*
.2; for (a = 1.; a < 16.; a *= 2.) {
P = ceil(p); u = fract(dot(P, sin(P.
zxy)));  if  (u  > .7) { r = u; break
;} p *= 2.; } p = abs(fract(p) - .5)
; float b = fract(dot(P, vec3(12.98,
78.23,  45.16))),  d  =  texture(
iChannel0,  vec2(b,  .25)).x;  u  =
abs(max(max(p.x, p.y), p.z) - (.2 + 
.15 * d) / a) + .01; O += exp(sin(
ceil(r * 9. + e) + vec4(0, 2, 4, 0)
)) * (.2 + 2.5 * d * d) / u; } O = 
tanh(O  /  7e2);  O  *=  O  *  O;  }