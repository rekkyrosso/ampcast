import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import theme from 'services/theme';
import {Popup, PopupProps, PopupButtons} from 'components/Popup';
import './SurfaceEditor.scss';

interface SurfaceEditorProps extends PopupProps {
    surface: 'button' | 'mediaButton' | 'scrollbar' | 'splitter';
}

export default function SurfaceEditor({
    surface,
    className = '',
    children,
    ...props
}: SurfaceEditorProps) {
    const submitted = useRef(false);
    const restoreSurface = useMemo(() => theme.current[surface], [surface]);

    const handleSubmit = useCallback(() => {
        submitted.current = true;
    }, []);

    useEffect(() => {
        return () => {
            if (!submitted.current) {
                theme[surface] = restoreSurface;
            }
        };
    }, [surface, restoreSurface]);

    return (
        <Popup {...props} className={`surface-editor ${className}`} autoClose>
            {theme.flat ? (
                <p>
                    <small>Some styles are hidden because the current theme is flat.</small>
                </p>
            ) : null}
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">{children}</div>
                <PopupButtons />
            </form>
        </Popup>
    );
}
