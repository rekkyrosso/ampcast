import React from 'react';
import {partition} from 'utils';
import FixedHeader from './FixedHeader';

export default function useScrollableComponents(
    children: React.ReactNode
): [React.ReactNode | undefined, React.ReactNode] {
    const [head, body] = partition(
        toChildren(children),
        (child) => (child as any)?.type === FixedHeader
    );
    return [head?.length ? head : undefined, body];
}

function toChildren(node: React.ReactNode): React.ReactNode[] {
    const children = React.Children.toArray(node);
    const firstChild = children[0] as any;
    return firstChild
        ? firstChild.type === React.Fragment
            ? toChildren(firstChild.props?.children)
            : children
        : [];
}
