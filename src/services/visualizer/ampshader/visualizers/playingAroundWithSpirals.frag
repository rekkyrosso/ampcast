// https://www.shadertoy.com/view/7ltyR4
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 spiralCenter = iResolution.xy / 2.0;
    float abstandSpiralCenter = distance(fragCoord, spiralCenter);
    float abstandSpiralCenterNorm = abstandSpiralCenter / length(iResolution.xy / 2.0);

    float winkel = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(iTime * .17)   + iTime * .61;
    vec2 vergleichspunkt = spiralCenter + abstandSpiralCenter * vec2(sin(winkel), cos(winkel));
    float abstandVergleichspunkt = distance(fragCoord, vergleichspunkt);
    float abstandVergleichspunktNorm = abstandVergleichspunkt / length(iResolution.xy / 2.0);
    float subtrahend = abstandVergleichspunktNorm / abstandSpiralCenterNorm;

    float winkel2 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(iTime * .23 + .1)   + iTime * .31;
    vec2 vergleichspunkt2 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel2), cos(winkel2));
    float abstandVergleichspunkt2 = distance(fragCoord, vergleichspunkt2);
    float abstandVergleichspunktNorm2 = abstandVergleichspunkt2 / length(iResolution.xy / 2.0);
    float subtrahend2 = abstandVergleichspunktNorm2 / abstandSpiralCenterNorm;

    float winkel3 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(iTime * .41 + .62)   + iTime * .47;
    vec2 vergleichspunkt3 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel3), cos(winkel3));
    float abstandVergleichspunkt3 = distance(fragCoord, vergleichspunkt3);
    float abstandVergleichspunktNorm3 = abstandVergleichspunkt3 / length(iResolution.xy / 2.0);
    float subtrahend3 = abstandVergleichspunktNorm3 / abstandSpiralCenterNorm;

    float winkel4 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(iTime * .38 + .17)   + iTime * .85;
    vec2 vergleichspunkt4 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel4), cos(winkel4));
    float abstandVergleichspunkt4 = distance(fragCoord, vergleichspunkt4);
    float abstandVergleichspunktNorm4 = abstandVergleichspunkt4 / length(iResolution.xy / 2.0);
    float subtrahend4 = abstandVergleichspunktNorm4 / abstandSpiralCenterNorm;

    float winkel5 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(iTime * .48 + .95)   + iTime * .57;
    vec2 vergleichspunkt5 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel5), cos(winkel5));
    float abstandVergleichspunkt5 = distance(fragCoord, vergleichspunkt5);
    float abstandVergleichspunktNorm5 = abstandVergleichspunkt5 / length(iResolution.xy / 2.0);
    float subtrahend5 = abstandVergleichspunktNorm5 / abstandSpiralCenterNorm;

    float winkel6 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(iTime * .29 + .27)   + iTime * .54;
    vec2 vergleichspunkt6 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel6), cos(winkel6));
    float abstandVergleichspunkt6 = distance(fragCoord, vergleichspunkt6);
    float abstandVergleichspunktNorm6 = abstandVergleichspunkt6 / length(iResolution.xy / 2.0);
    float subtrahend6 = abstandVergleichspunktNorm6 / abstandSpiralCenterNorm;

    vec3 fragColor1 = vec3(2.0 - abstandVergleichspunktNorm - abstandVergleichspunktNorm4 - abstandVergleichspunktNorm6, 2.0 - abstandVergleichspunktNorm2 - abstandVergleichspunktNorm5 - abstandVergleichspunktNorm4, 2.0 - abstandVergleichspunktNorm3 - abstandVergleichspunktNorm6 - abstandVergleichspunktNorm5);
    vec3 fragColor2 = vec3(4.0 - subtrahend - subtrahend4 - subtrahend6, 4.0 - subtrahend2 - subtrahend5 - subtrahend4, 4.0 - subtrahend3 - subtrahend6 - subtrahend5);
    float faktor = texture(iChannel0,vec2(0,0)).x;
    faktor = pow(faktor, 5.0);

    // Output to screen
    fragColor = vec4(mix(fragColor1, fragColor2, faktor), 1.0);
}
