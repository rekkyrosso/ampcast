import Color from 'colorjs.io';

export function isDark(color: Color | string): boolean {
    return toColor(color).to('lch').l! <= 50;
}

export function isDarker(a: Color | string, b: Color | string): boolean {
    return toColor(a).to('lch').l! < toColor(b).to('lch').l!;
}

export function isLight(color: Color | string): boolean {
    return !isDark(color);
}

export function isLighter(a: Color | string, b: Color | string): boolean {
    return !isDarker(a, b);
}

export function mostReadable(
    backgroundColor: Color | string,
    textColors?: readonly (Color | string)[]
): string {
    backgroundColor = toColor(backgroundColor);
    if (!textColors?.length) {
        return isDark(backgroundColor) ? '#ffffff' : '#000000';
    }
    const textColor = textColors.reduce((textColor, color) =>
        readability(backgroundColor, color) >= readability(backgroundColor, textColor)
            ? color
            : textColor
    );
    return toHex(textColor);
}

export function readability(backgroundColor: Color | string, textColor: Color | string): number {
    return Math.abs(toColor(backgroundColor).contrast(textColor, 'WCAG21'));
}

// AA+Large : 3
// AA+Small : 4.5
// AAA+Small : 7
export function isReadable(
    backgroundColor: Color | string,
    textColor: Color | string,
    level = 3 // AA+Large
): boolean {
    return readability(backgroundColor, textColor) >= level;
}

function toColor(color: Color | string): Color {
    if (color instanceof Color) {
        return color;
    }
    return new Color(color);
}

function toHex(color: Color | string): string {
    return toColor(color).toString({format: 'hex'});
}
