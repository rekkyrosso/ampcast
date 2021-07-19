import 'react-splitter-layout/lib/index.css';
import './Splitter.scss';
import React from 'react';
import SplitterLayout, {SplitterLayoutProps} from 'react-splitter-layout';

export interface SplitterProps extends Omit<SplitterLayoutProps, 'customClassName' | 'vertical' | 'percentage'> {
    readonly orientation?: 'horizontal' | 'vertical';
    readonly children?: React.ReactNode;
}

export default function Splitter({
    orientation = 'horizontal',
    primaryMinSize = 100,
    secondaryMinSize = 100,
    secondaryInitialSize = 200,
    children,
    ...props
}: SplitterProps) {
    return (
        <SplitterLayout
            {...props}
            vertical={orientation === 'vertical'}
            primaryMinSize={primaryMinSize}
            secondaryMinSize={secondaryMinSize}
            secondaryInitialSize={secondaryInitialSize}
        >{
            children
        }</SplitterLayout>
    );
}
