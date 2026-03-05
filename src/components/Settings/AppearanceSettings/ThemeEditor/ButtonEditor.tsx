import React from 'react';
import {PopupProps} from 'components/Popup';
import BorderStyleEditor from './BorderStyleEditor';
import EdgeStyleEditor from './EdgeStyleEditor';
import ElevationEditor from './ElevationEditor';
import SurfaceEditor from './SurfaceEditor';
import SurfaceStyleEditor from './SurfaceStyleEditor';

export default function ButtonEditor(props: PopupProps) {
    return (
        <SurfaceEditor {...props} className="button-editor" surface="button">
            <SurfaceStyleEditor surface="button" />
            <EdgeStyleEditor surface="button" />
            <BorderStyleEditor surface="button" />
            <ElevationEditor surface="button" />
        </SurfaceEditor>
    );
}
