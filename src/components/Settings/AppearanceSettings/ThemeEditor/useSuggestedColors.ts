import {useCallback, useEffect, useState} from 'react';
import {TinyColor} from '@ctrl/tinycolor';
import {mostReadable, shuffle, uniq} from 'utils';

type SuggestedColors = [string, string][];

export default function useSuggestedColors(color: string) {
    const [suggestions, setSuggestions] = useState<SuggestedColors>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    useEffect(() => {
        const tinyColor = new TinyColor(color);
        const backgrounds = [
            ...tinyColor.triad(),
            ...tinyColor.tetrad(),
            ...tinyColor.splitcomplement(),
            ...tinyColor.analogous(),
            ...tinyColor.monochromatic(),
            tinyColor.lighten(),
            tinyColor.darken(),
            tinyColor.saturate(),
            tinyColor.desaturate(),
            tinyColor.greyscale(),
            tinyColor.brighten(),
        ].map((color) => color.toHexString());
        const suggestions: [string, string][] = uniq(backgrounds).map((color) => [
            color,
            mostReadable(color),
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
