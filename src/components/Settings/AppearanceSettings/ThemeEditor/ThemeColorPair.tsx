import React, {useCallback, useId, useState} from 'react';
import {t} from 'services/i18n';
import theme from 'services/theme';
import Button, {IconButton} from 'components/Button';
import {PopupProps, showPopup} from 'components/Popup';
import ThemeColor from './ThemeColor';
import useCurrentTheme from '../useCurrentTheme';
import './ThemeColorPair.scss';

export interface ThemeColorPairProps {
    label: string;
    surface: 'content' | 'frame' | 'selected' | 'button' | 'mediaButton' | 'scrollbar' | 'splitter';
    children?: React.ReactNode;
    Editor?: React.FC<PopupProps>;
}

export default function ThemeColorPair({label, surface, children, Editor}: ThemeColorPairProps) {
    const id = useId();
    const [color, setColor] = useState(theme[surface].color);
    const [textColor, setTextColor] = useState(theme[surface].textColor);
    const currentTheme = useCurrentTheme();
    const lockable =
        surface === 'button' ||
        surface === 'mediaButton' ||
        surface === 'scrollbar' ||
        surface === 'splitter';
    const locked = lockable && !currentTheme[surface]?.color;
    const noTextColor = surface === 'splitter';

    const toggleLocked = useCallback(() => {
        if (lockable) {
            const currentSurface = currentTheme[surface];
            if (locked) {
                theme[surface] = {...currentSurface, color, textColor};
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const {color, textColor, ...newSurface} = currentSurface || {};
                theme[surface] = newSurface;
            }
        }
    }, [currentTheme, surface, lockable, locked, color, textColor]);

    const updateColor = useCallback(
        (color: string) => {
            if (lockable) {
                theme[surface] = {...currentTheme[surface], color};
            } else {
                theme[surface] = {...theme[surface], color};
            }
            setColor(color);
        },
        [currentTheme, surface, lockable]
    );

    const updateTextColor = useCallback(
        (textColor: string) => {
            if (lockable) {
                theme[surface] = {...currentTheme[surface], textColor};
            } else {
                theme[surface] = {...theme[surface], textColor};
            }
            setTextColor(textColor);
        },
        [currentTheme, surface, lockable]
    );

    const swapColors = useCallback(() => {
        const {color: textColor, textColor: color} = theme[surface];
        theme[surface] = {...currentTheme[surface], color, textColor};
        setColor(color);
        setTextColor(textColor);
    }, [currentTheme, surface]);

    const handleEditClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            if (Editor) {
                const button = event.target as HTMLButtonElement;
                const rect = button.getBoundingClientRect();
                await showPopup(
                    (props: PopupProps) => <Editor {...props} />,
                    rect.right,
                    rect.bottom + 4,
                    'right',
                    true
                );
            }
        },
        [Editor]
    );

    return (
        <p className={`theme-color-pair ${locked ? 'locked' : ''}`}>
            <label htmlFor={id}>{label}:</label>
            <ThemeColor
                id={id}
                value={theme[surface].color}
                title={t(`${label} background color`)}
                disabled={locked}
                onChange={updateColor}
            />
            <IconButton
                icon="swap"
                title={t('Swap colors')}
                onClick={swapColors}
                disabled={locked}
                hidden={noTextColor}
            />
            <ThemeColor
                value={theme[surface].textColor}
                title={t(`${label} text color`)}
                disabled={locked}
                hidden={noTextColor}
                onChange={updateTextColor}
            />
            {lockable ? (
                <IconButton
                    icon={locked ? 'locked' : 'unlocked'}
                    title={locked ? t('Edit colors') : t('Use default colors')}
                    onClick={toggleLocked}
                />
            ) : null}
            {children}
            {Editor ? (
                <Button className="small" type="button" onClick={handleEditClick}>
                    Style…
                </Button>
            ) : null}
        </p>
    );
}
