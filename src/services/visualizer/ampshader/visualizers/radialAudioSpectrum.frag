// https://www.shadertoy.com/view/tccXR2
// Configuration du visualiseur
const vec3 PRIMARY_COLOR = vec3(0.2, 0.8, 1.0);      // Bleu cyan
const vec3 SECONDARY_COLOR = vec3(1.0, 0.3, 0.8);    // Rose magenta
const vec3 ACCENT_COLOR = vec3(0.9, 0.7, 0.1);       // Jaune doré
const vec3 BACKGROUND_COLOR = vec3(0.05, 0.05, 0.1); // Bleu très sombre

const float BAR_COUNT = 32.0;        // Plus de barres pour plus de détail
const float BAR_WIDTH = 0.7;         // Largeur des barres
const float BAR_START = 0.2;         // Rayon intérieur
const float BAR_END = 0.6;           // Rayon extérieur maximum
const float INNER_CIRCLE = 0.15;     // Cercle central
const float FREQ_COUNT = 512.0;      // Nombre de fréquences
const float PI = 3.14159265359;

// Fonction de lissage améliorée
float smoothBar(float x, float width) {
    return smoothstep(0.0, width * 0.3, x) * smoothstep(width, width * 0.7, x);
}

// Fonction de palette de couleurs
vec3 getFrequencyColor(float freq, float intensity) {
    // Palette de couleurs basée sur la fréquence
    vec3 lowFreq = PRIMARY_COLOR;       // Basses - bleu
    vec3 midFreq = SECONDARY_COLOR;     // Médiums - rose
    vec3 highFreq = ACCENT_COLOR;       // Aigus - jaune
    
    float t1 = smoothstep(0.0, 0.4, freq);
    float t2 = smoothstep(0.6, 1.0, freq);
    
    vec3 color = mix(lowFreq, midFreq, t1);
    color = mix(color, highFreq, t2);
    
    // Intensification basée sur l'amplitude
    color += vec3(0.3) * intensity * intensity;
    
    return color;
}

// Effet de lueur
float glow(float dist, float radius, float intensity) {
    return intensity / (1.0 + dist * dist / (radius * radius));
}

// Rotation matricielle
mat2 rotate(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float aspect = iResolution.x / iResolution.y;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Animation de rotation lente
    float rotationSpeed = iTime * 0.1;
    uv *= rotate(rotationSpeed);
    
    // Coordonnées polaires
    float dist = length(uv);
    float angle = atan(uv.y, uv.x) + PI;
    float angleNormalized = angle / (2.0 * PI);
    
    // Index de barre avec interpolation
    float barIndexFloat = angleNormalized * BAR_COUNT;
    float barIndex = floor(barIndexFloat);
    float barFraction = fract(barIndexFloat);
    
    // Échantillonnage des fréquences avec interpolation
    int idx1 = int(mod(barIndex, BAR_COUNT));
    int idx2 = int(mod(barIndex + 1.0, BAR_COUNT));
    
    float freq1 = texelFetch(iChannel0, ivec2(idx1 * int(FREQ_COUNT) / int(BAR_COUNT), 0), 0).r;
    float freq2 = texelFetch(iChannel0, ivec2(idx2 * int(FREQ_COUNT) / int(BAR_COUNT), 0), 0).r;
    
    // Interpolation lisse entre les barres
    float barHeight = mix(freq1, freq2, smoothstep(0.3, 0.7, barFraction));
    
    // Amélioration de la réactivité
    barHeight = pow(barHeight, 0.7) * 1.5;
    barHeight = min(barHeight, 1.0);
    
    // Animation pulsante basée sur l'audio
    float pulse = 1.0 + 0.1 * sin(iTime * 6.0 + barHeight * 10.0);
    barHeight *= pulse;
    
    // Calcul des distances
    float barEndDist = BAR_START + barHeight * (BAR_END - BAR_START);
    
    // Masque de barre avec bords adoucis
    float barMask = smoothBar(sin(angleNormalized * PI * BAR_COUNT + PI * 0.5) + 1.0, BAR_WIDTH);
    
    // Cercles intérieur et extérieur
    float innerMask = smoothstep(INNER_CIRCLE - 0.02, INNER_CIRCLE + 0.02, dist);
    float outerMask = 1.0 - smoothstep(barEndDist - 0.02, barEndDist + 0.02, dist);
    
    // Masque principal des barres
    float mainBar = barMask * innerMask * outerMask;
    
    // Couleur basée sur la fréquence et position
    vec3 barColor = getFrequencyColor(angleNormalized, barHeight);
    
    // Effet de lueur autour des barres
    float glowEffect = glow(abs(dist - barEndDist), 0.05, barHeight * 0.5) * barMask;
    
    // Cercle central avec effet de lueur
    float centerGlow = 1.0 - smoothstep(0.0, INNER_CIRCLE * 1.5, dist);
    centerGlow = pow(centerGlow, 2.0);
    vec3 centerColor = PRIMARY_COLOR * 0.3;
    
    // Lignes radiales subtiles
    float radialLines = sin(angleNormalized * PI * BAR_COUNT * 2.0) * 0.1 + 0.9;
    radialLines = smoothstep(0.8, 1.0, radialLines);
    
    // Assemblage final
    vec3 finalColor = BACKGROUND_COLOR;
    
    // Ajout du cercle central
    finalColor = mix(finalColor, centerColor, centerGlow);
    
    // Ajout des barres principales
    finalColor = mix(finalColor, barColor, mainBar);
    
    // Ajout de la lueur
    finalColor += barColor * glowEffect;
    
    // Ajout des lignes radiales
    finalColor *= radialLines;
    
    // Post-traitement : contraste et saturation
    finalColor = pow(finalColor, vec3(0.9)); // Gamma correction légère
    finalColor = mix(vec3(dot(finalColor, vec3(0.299, 0.587, 0.114))), finalColor, 1.2); // Saturation
    
    // Vignette subtile
    float vignette = 1.0 - smoothstep(0.7, 1.4, length(uv));
    finalColor *= vignette;
    
    fragColor = vec4(finalColor, 1.0);
}