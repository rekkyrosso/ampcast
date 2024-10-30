// https://www.shadertoy.com/view/M33XDH
/* "Voyager" by @kishimisu (2024) - https://www.shadertoy.com/view/M33XDH
   [433 => 426 chars thanks to Snoopeth]

   it seems to have reached its destination..
   
   This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 
   International License (https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en)
*/
void mainImage(out vec4 O, vec2 u) {
    vec3  p, q, R = iResolution, f = vec3(.2, 2,.2);
    float i, t, d, n, T = iTime;
              
    for (O *= i, u = abs(u+u-R.xy)/R.y; i++ < 50.; 
    
        p = q = t * normalize(vec3(u * mat2(cos(T/16. + vec4(0,33,11,0))), 1))     
    )
        n = sin(p.z+=T) * cos(p.x*1.4 + T/4.) * cos(p.z*1.2 - T*.5) * .5 + .5,
        
        p.y += 1. + q.z * sin(T/6.) * .2 - n,      
          
        t += d = length(p = mod(p, f+f) - f) - .1,      

        O += .07 * pow(n, 5.) / ++d *
             (1. + cos(  length(q) * .14
                       + length(u) * 3. - T
                       - texture(iChannel0, vec2(log(q.z*.01), 0)).r * 2.
                       + vec4(0,1,2,0)  ));
}