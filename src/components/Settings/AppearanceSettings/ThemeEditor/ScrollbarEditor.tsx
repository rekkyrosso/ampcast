import React from 'react';
import {PopupProps} from 'components/Popup';
import BorderStyleEditor from './BorderStyleEditor';
import EdgeStyleEditor from './EdgeStyleEditor';
import SizeEditor from './SizeEditor';
import SurfaceEditor from './SurfaceEditor';
import SurfaceStyleEditor from './SurfaceStyleEditor';

export default function ScrollbarEditor(props: PopupProps) {
    return (
        <SurfaceEditor {...props} className="scrollbar-editor" surface="scrollbar">
            <SizeEditor surface="scrollbar" min={0.5} max={1.5} />
            <SurfaceStyleEditor surface="scrollbar" parentSurface="button" />
            <EdgeStyleEditor surface="scrollbar" parentSurface="button" />
            <BorderStyleEditor surface="scrollbar" parentSurface="button" />
        </SurfaceEditor>
    );
}
