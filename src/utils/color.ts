import Color from 'colorjs.io';

export function isDark(color: string): boolean {
    return new Color(color).to('lch').l! < 50;
}

export function isLight(color: string): boolean {
    return !isDark(color);
}
