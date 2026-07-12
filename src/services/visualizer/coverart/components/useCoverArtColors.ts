import {useEffect, useState} from 'react';
import Color from 'colorjs.io';
import {
    Color as ColorThiefColor,
    ExtractionOptions,
    SwatchMap,
    SwatchRole,
    createColor,
    getPalette,
    getSwatches,
} from 'colorthief';
import {mostReadable} from '@ctrl/tinycolor';
import {exists, filterNotEmpty} from 'utils';

export interface CovertArtColors {
    readonly backgroundColors: readonly [string, string];
    readonly textColor: string;
    readonly beatsColor: string;
}

export const defaultColors: CovertArtColors = {
    backgroundColors: ['#3e3e3e', '#3e3e3e'],
    textColor: '#ebebeb',
    beatsColor: '#808080',
};

export function isDark(color: string): boolean {
    return new Color(color).to('lch').l! < 50;
}

export default function useCoverArtColors(coverArtUrl: string): CovertArtColors {
    const [coverArtColors, setCoverArtColors] = useState<CovertArtColors>(defaultColors);

    useEffect(() => {
        setCoverArtColors(defaultColors);
        if (!coverArtUrl) {
            return;
        }
        const controller = new AbortController();
        const img = new Image();
        const onerror = () => setCoverArtColors(defaultColors);
        const onload = async (img: HTMLImageElement) => {
            try {
                const options: ExtractionOptions = {
                    colorCount: 20, // We usually get far less than 20 but the results are better with a high number.
                    quality: 10,
                    colorSpace: 'oklch',
                    ignoreWhite: false, // We need the white!
                    gamut: 'srgb',
                    signal: controller.signal,
                    worker: false, // Seem to get worse colours.
                };
                const [palette = [], swatches] = await Promise.all([
                    getPalette(img, options).then((colors) =>
                        colors
                            ?.filter((color) => color.proportion > 0.025)
                            .sort((a, b) => b.proportion - a.proportion)
                    ),
                    getSwatches(img, options),
                ]);
                if (palette.length > 0) {
                    // logColors(palette, swatches);
                    setCoverArtColors(getColors(palette, swatches));
                } else {
                    setCoverArtColors(defaultColors);
                }
            } catch {
                setCoverArtColors(defaultColors);
            }
        };

        img.crossOrigin = 'anonymous';
        img.src = coverArtUrl;

        if (img.complete) {
            onload(img);
        } else {
            img.onload = () => onload(img);
            img.onerror = () => {
                // Try again but break the cache.
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `${coverArtUrl}${coverArtUrl.includes('?') ? '&' : '?'}retry-ts=${Date.now()}`;

                if (img.complete) {
                    onload(img);
                } else {
                    img.onerror = onerror;
                    img.onload = () => onload(img);
                }
            };
        }

        return () => {
            img.onload = null;
            img.onerror = null;
            controller.abort();
        };
    }, [coverArtUrl]);

    return coverArtColors;
}

const swatchNames: readonly SwatchRole[] = [
    'LightMuted',
    'DarkMuted',
    'Muted',
    'LightVibrant',
    'DarkVibrant',
    'Vibrant',
];

function getColors(
    palette: readonly ColorThiefColor[],
    swatches: SwatchMap | null
): CovertArtColors {
    let backgroundColors = getBackgroundColors(palette, swatches);
    const textColor = getTextColor(palette, swatches, backgroundColors);
    const beatsColor = getBeatsColor(palette, swatches, backgroundColors, textColor);
    // Remove the text/beats colours from the background colours.
    backgroundColors = getBackgroundColors(
        palette.filter((color) => color.hex() !== textColor && color.hex() !== beatsColor),
        swatches
    );
    return {backgroundColors, textColor, beatsColor};
}

function getBackgroundColors(
    palette: readonly ColorThiefColor[],
    swatches: SwatchMap | null
): [string, string] {
    const colors = filterBackgroundColors(palette);
    let firstColor = colors[0];
    let secondColor = firstColor;
    if (colors.length === 1 || firstColor.proportion > 0.667) {
        // Dominant background colour.

        if (firstColor.proportion < 0.9) {
            // If there is a colour close to it then use that as a second colour.
            const backgroundColor = new Color(firstColor.hex());
            secondColor =
                // Use the palette, not the filtered colours.
                palette.find((color) => {
                    return (
                        color.hex() !== firstColor.hex() &&
                        backgroundColor.deltaE2000(color.hex()) < 10 && // colour diff
                        backgroundColor.contrast(color.hex(), 'Lstar') < 20 // lightness diff
                    );
                }) || firstColor;
        } else {
            // Use one colour.
        }
    } else {
        // Remove the most vibrant colour (unless there is a lot of it).
        [firstColor, secondColor] = colors.filter(
            (color) => color.proportion > 0.33 || color.hex() !== swatches?.Vibrant?.color.hex()
        );
    }
    return createBackgroundColors(firstColor, secondColor);
}

function createBackgroundColors(
    firstColor: ColorThiefColor,
    secondColor: ColorThiefColor
): [string, string] {
    // For text readability.
    // Blend the second colour with the first until they are of similar lightness/darkness.
    const backgroundColor1 = new Color(firstColor.hex());
    let backgroundColor2 = new Color(secondColor.hex());
    while (backgroundColor1.contrast(backgroundColor2, 'Lstar') > 20) {
        backgroundColor2 = backgroundColor1.mix(backgroundColor2, 0.9);
    }
    return [firstColor.hex(), backgroundColor2.toString({format: 'hex'})];
}

function filterBackgroundColors(palette: readonly ColorThiefColor[]): readonly ColorThiefColor[] {
    // Filter out similar colours and add their `proportion` to the underlying colour.
    const filteredColors: ColorThiefColor[] = [];
    palette.forEach((color) => {
        const filteredColor = filteredColors.find(
            (filteredColor) => new Color(filteredColor.hex()).deltaE2000(color.hex()) < 4
        );
        if (filteredColor) {
            (filteredColor as any).proportion += color.proportion;
        } else {
            const {r, g, b} = color.rgb();
            const filteredColor = createColor(r, g, b, 0, color.proportion, color.gamut);
            filteredColors.push(filteredColor);
        }
    });
    return filteredColors.sort((a, b) => b.proportion - a.proportion);
}

function getTextColor(
    palette: readonly ColorThiefColor[],
    swatches: SwatchMap | null,
    backgroundColors: [string, string]
): string {
    const backgroundColor = mixBackgroundColors(backgroundColors);
    const fallbackColor = isDark(backgroundColor) ? '#ffffff' : '#000000';
    const colors = palette
        .map((color) => color.hex())
        .concat(
            swatchNames
                .map((name) => swatches?.[name])
                .filter(exists)
                .map((swatch) => swatch.color.hex())
        );
    return (
        mostReadable(backgroundColor, colors, {
            level: 'AA',
            size: 'small',
        })?.toHexString() || fallbackColor
    );
}

function getBeatsColor(
    palette: readonly ColorThiefColor[],
    swatches: SwatchMap | null,
    backgroundColors: [string, string],
    textColor: string
): string {
    const backgroundColor = mixBackgroundColors(backgroundColors);
    const testColor = (color: ColorThiefColor | undefined, color2: string): boolean => {
        // Not too similar to the background colour(s).
        return !!color && new Color(color2).deltaE2000(color.hex()) > 20;
    };
    const getSwatch = (key: keyof SwatchMap) => swatches?.[key]?.color;
    const mostVibrant = [findMostVibrant(palette), getSwatch('Vibrant')];
    const otherColors = [
        getSwatch(isDark(backgroundColor) ? 'LightVibrant' : 'DarkVibrant'),
        getSwatch(isDark(backgroundColor) ? 'DarkVibrant' : 'LightVibrant'),
        getSwatch(isDark(backgroundColor) ? 'LightMuted' : 'DarkMuted'),
        getSwatch('Muted'),
    ].filter((color) => color && color.hex() !== textColor);
    let colors = mostVibrant.concat(otherColors);
    colors = colors.filter((color) => testColor(color, backgroundColor));
    colors = filterNotEmpty(colors, (color) => testColor(color, textColor));
    return colors[0]?.hex() || textColor;
}

function mixBackgroundColors([a, b]: [string, string]): string {
    return new Color(a).mix(b, 0.5).toString({format: 'hex'});
}

function findMostVibrant(palette: readonly ColorThiefColor[]): ColorThiefColor | undefined {
    const vibrantColor = palette.reduce((mostVibrant, color) =>
        color.oklch().c > mostVibrant.oklch().c ? color : mostVibrant
    );
    // Only return a dominant vibrant colour. Otherwise, use the swatches.
    if (vibrantColor.proportion > 0.1 && vibrantColor.oklch().c > 0.1) {
        return vibrantColor;
    }
}

// function logColors(palette: readonly ColorThiefColor[], swatches: SwatchMap | null) {
//     console.log('--------------------------------------------');
//     palette.forEach((color) => logColor(color));
//     if (swatches) {
//         console.log('--------------------------------------------');
//         swatchNames.forEach((name) => {
//             if (swatches[name]) {
//                 logColor(swatches[name].color, name);
//             }
//         });
//     }
//     console.log('--------------------------------------------');
// }

// function logColor(color: ColorThiefColor, name = '') {
//     console.log(
//         `%c${color.hex()} ${Math.round(color.proportion * 1000) / 10}% ${name}`,
//         `background-color: ${color.hex()};
//          color: ${color.contrast.foreground};
//          text-shadow: 1px 1px 1px ${color.isDark ? 'black' : 'rgba(0,0,0,0.2)'};
//          padding: 3px;`
//     );
// }
