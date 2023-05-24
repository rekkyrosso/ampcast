out vec4 as_FragColor;
void main() {
    vec4 color = vec4(1e20);
    mainImage(color, gl_FragCoord.xy);
    as_FragColor = color;
}
