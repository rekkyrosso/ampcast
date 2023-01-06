import {useCallback, useEffect, useState} from 'react';
import {mostReadable, TinyColor} from '@ctrl/tinycolor';
import {shuffle, uniq} from 'utils/index';

type SuggestedColors = [string, string][];

export default function useSuggestedColors(color: string) {
    const [suggestions, setSuggestions] = useState<SuggestedColors>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    useEffect(() => {
        const tinyColor = new TinyColor(color);
        const backgrounds = uniq(
            [
                ...tinyColor.triad(),
                ...tinyColor.tetrad(),
                ...tinyColor.splitcomplement(),
                ...tinyColor.analogous(),
                ...tinyColor.monochromatic(),
            ].map((color) => color.toHexString())
        ).map((hex) => new TinyColor(hex));
        const suggestions: [string, string][] = backgrounds.reverse().map((color) => [
            color.toHexString(),
            mostReadable(color, ['black', 'white'], {
                includeFallbackColors: true,
                level: 'AA',
                size: 'large',
            })!.toHexString(),
        ]);
        setSuggestions(shuffle(suggestions));
        setSelectedIndex(suggestions.length === -1 ? -1 : 0);
    }, [color]);

    const next = useCallback(() => {
        setSelectedIndex((selectedIndex) => {
            if (selectedIndex === suggestions.length - 1) {
                return suggestions.length === -1 ? -1 : 0;
            } else {
                return selectedIndex + 1;
            }
        });
    }, [suggestions]);

    return [suggestions[selectedIndex], next] as const;
}
