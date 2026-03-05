import React, {useCallback, useId, useState} from 'react';
import {EdgeStyle} from 'types/Theme';
import theme from 'services/theme';
import {IconButton} from 'components/Button';
import useCurrentTheme from '../useCurrentTheme';

interface EdgeStyleEditorProps {
    surface: 'button' | 'mediaButton' | 'scrollbar' | 'splitter';
    parentSurface?: 'button';
}

export default function EdgeStyleEditor({surface, parentSurface}: EdgeStyleEditorProps) {
    const id = useId();
    const [edgeStyle, setEdgeStyle] = useState(theme[surface].edgeStyle);
    const currentTheme = useCurrentTheme();
    const lockable = !!parentSurface;
    const locked = lockable && !currentTheme[surface]?.edgeStyle;

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            const edgeStyle = event.target.value as EdgeStyle;
            theme[surface] = {...theme.current[surface], edgeStyle};
            setEdgeStyle(edgeStyle);
        },
        [surface]
    );

    const toggleLocked = useCallback(() => {
        const currentSurface = currentTheme[surface];
        if (locked) {
            theme[surface] = {...currentSurface, edgeStyle};
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {edgeStyle, ...newSurface} = currentSurface || {};
            theme[surface] = newSurface;
        }
    }, [currentTheme, surface, locked, edgeStyle]);

    return currentTheme.flat ? null : (
        <p className="edge-style-editor">
            <label htmlFor={`${id}-edge-style`}>Edge:</label>
            <select
                id={`${id}-edge-style`}
                value={theme[surface].edgeStyle || 'none'}
                disabled={locked}
                onChange={handleChange}
            >
                <option value="none">None</option>
                <option value="chamfer+1">Chamfer</option>
                <option value="chamfer+2">Chamfer x2</option>
                <option value="chamfer-1">Chamfer (inset)</option>
                <option value="fillet+1">Fillet</option>
                <option value="fillet+2">Fillet x2</option>
                <option value="fillet-1">Fillet (inset)</option>
            </select>
            {lockable ? (
                <IconButton
                    icon={locked ? 'locked' : 'unlocked'}
                    title={locked ? 'Edit' : 'Use button edge style'}
                    onClick={toggleLocked}
                />
            ) : null}
        </p>
    );
}
