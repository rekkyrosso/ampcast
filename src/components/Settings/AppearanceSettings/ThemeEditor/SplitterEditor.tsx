import React from 'react';
import {PopupProps} from 'components/Popup';
import EdgeStyleEditor from './EdgeStyleEditor';
import SizeEditor from './SizeEditor';
import SurfaceEditor from './SurfaceEditor';

export default function SplitterEditor(props: PopupProps) {
    return (
        <SurfaceEditor {...props} className="splitter-editor" surface="splitter">
            <SizeEditor surface="splitter" min={0.5} max={2} />
            <EdgeStyleEditor surface="splitter" />
        </SurfaceEditor>
    );
}
