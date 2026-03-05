export type SurfaceStyle = 'flat' | 'concave' | 'convex';
export type EdgeStyle =
    | 'none'
    | 'chamfer+1'
    | 'chamfer+2'
    | 'chamfer-1'
    | 'fillet+1'
    | 'fillet+2'
    | 'fillet-1';

export interface Surface {
    readonly color: string;
    readonly textColor: string;
}

export interface Component extends Surface {
    readonly borderColor: string;
    readonly borderWidth: number;
    readonly edgeStyle: EdgeStyle;
    readonly surfaceStyle: SurfaceStyle;
}

export interface Button extends Component {
    readonly elevation: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MediaButton extends Button {
    // readonly roundness: number;
    // readonly size: number;
    // readonly trackColor: string;
}

export interface Scrollbar extends Component {
    readonly size: number;
    // readonly trackColor: string;
}

export interface Splitter extends Surface {
    readonly edgeStyle: EdgeStyle;
    readonly size: number;
}

export default interface Theme {
    readonly name: string;
    readonly fontName: string;
    readonly frame: Surface;
    readonly content: Surface;
    readonly selected: Surface;
    readonly mediaButton?: Partial<MediaButton>;
    readonly button?: Partial<Button>;
    readonly scrollbar?: Partial<Scrollbar>;
    readonly splitter?: Partial<Splitter>;
    readonly roundness?: number;
    readonly spacing?: number;
    readonly flat?: boolean;
}
