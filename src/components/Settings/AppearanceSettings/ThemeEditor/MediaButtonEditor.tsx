import React from 'react';
import {PopupProps} from 'components/Popup';
import BorderStyleEditor from './BorderStyleEditor';
import EdgeStyleEditor from './EdgeStyleEditor';
import ElevationEditor from './ElevationEditor';
import SurfaceEditor from './SurfaceEditor';
import SurfaceStyleEditor from './SurfaceStyleEditor';

export default function ButtonEditor(props: PopupProps) {
    return (
        <SurfaceEditor {...props} className="media-button-editor" surface="mediaButton">
            <SurfaceStyleEditor surface="mediaButton" parentSurface="button" />
            <EdgeStyleEditor surface="mediaButton" parentSurface="button" />
            <BorderStyleEditor surface="mediaButton" parentSurface="button" />
            <ElevationEditor surface="mediaButton" parentSurface="button" />
        </SurfaceEditor>
    );
}
