import LegacyTheme from 'types/LegacyTheme';
import Theme from 'types/Theme';

export function fromLegacyTheme<T extends Theme>(theme: T | LegacyTheme): T {
    if (isLegacyTheme(theme)) {
        const {
            backgroundColor,
            textColor,
            frameColor,
            frameTextColor,
            selectedBackgroundColor,
            selectedTextColor,
            buttonColor,
            buttonTextColor,
            mediaButtonColor,
            mediaButtonTextColor,
            scrollbarColor,
            scrollbarTextColor,
            scrollbarThickness = 1,
            ...rest
        } = Object.keys(theme).reduce((data, key) => {
            const value = theme[key as keyof LegacyTheme];
            if (value != null && value !== '') {
                data[key] = value;
            }
            return data;
        }, {} as any);
        const content = {color: backgroundColor, textColor};
        const frame = {color: frameColor, textColor: frameTextColor};
        const selected = {color: selectedBackgroundColor, textColor: selectedTextColor};
        const button =
            buttonColor || buttonTextColor
                ? {color: buttonColor, textColor: buttonTextColor}
                : undefined;
        const mediaButton =
            mediaButtonColor || mediaButtonTextColor
                ? {color: mediaButtonColor, textColor: mediaButtonTextColor}
                : undefined;
        const scrollbar =
            scrollbarColor || scrollbarTextColor || scrollbarThickness !== 1
                ? {
                      color: scrollbarColor,
                      textColor: scrollbarTextColor,
                      size: scrollbarThickness,
                  }
                : undefined;
        // Removed undefined values using JSON parser.
        return JSON.parse(
            JSON.stringify({
                fontName: 'Arial',
                ...rest,
                content,
                frame,
                selected,
                button,
                mediaButton,
                scrollbar,
            })
        ) as T;
    } else {
        return theme;
    }
}

function isLegacyTheme(theme: Theme | LegacyTheme): theme is LegacyTheme {
    return 'backgroundColor' in theme;
}
