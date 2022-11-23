import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import Scrollable, {
    ScrollableClient,
    ScrollableHandle,
    ScrollablePosition,
} from 'components/Scrollable';
import useKeyboardBusy from 'hooks/useKeyboardBusy';
import useOnResize from 'hooks/useOnResize';
import useExpandedNodeIds from './useExpandedNodeIds';
import useVisibleNodeIds from './useVisibleNodeIds';
import TreeViewNode from './TreeViewNode';
import useTreeViewState from './useTreeViewState';
import './TreeView.scss';

export interface TreeNode<T> {
    readonly id: string;
    readonly label: React.ReactNode;
    readonly value: T;
    readonly children?: TreeNode<T>[];
    readonly startExpanded?: boolean;
    readonly icon?: string;
}

export interface TreeViewProps<T> {
    roots: TreeNode<T>[];
    className?: string;
    storeId?: string;
    onContextMenu?: (item: T, x: number, y: number) => void;
    onDelete?: (item: T) => void;
    onEnter?: (item: T) => void;
    onInfo?: (item: T) => void;
    onSelect?: (item: T | null) => void;
}

export const defaultRowHeight = 24;

// TODO: This wrapper only exists because the underlying component can't handle empty states.
export default function TreeView<T>({roots, className = '', onSelect, ...props}: TreeViewProps<T>) {
    const isEmpty = roots.length === 0;

    useEffect(() => {
        if (isEmpty) {
            onSelect?.(null);
        }
    }, [isEmpty, onSelect]);

    if (isEmpty) {
        return <div className={`tree-view ${className}`} tabIndex={0} />;
    } else {
        return <Tree {...props} className={className} roots={roots} onSelect={onSelect} />;
    }
}

function Tree<T>({
    roots,
    className,
    storeId,
    onContextMenu,
    onDelete,
    onEnter,
    onInfo,
    onSelect,
}: TreeViewProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<ScrollableHandle>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const {storeSelectedNodeId, retrieveSelectedNodeId} = useTreeViewState(storeId);
    const [selectedId, setSelectedId] = useState<string>(() =>
        retrieveSelectedNodeId(roots[0]?.id)
    );
    const {expandedIds, toggle} = useExpandedNodeIds(roots, storeId);
    const visibleIds = useVisibleNodeIds(roots, expandedIds);
    const rowIndex = visibleIds.indexOf(selectedId);
    const [height, setHeight] = useState(0);
    const [rowHeight, setRowHeight] = useState(defaultRowHeight);
    const [scrollTop, setScrollTop] = useState(0);
    const pageSize = Math.floor(height / rowHeight) - 1;
    const size = visibleIds.length;
    const selectedValue = getValue(roots, selectedId);
    const keyboardBusy = useKeyboardBusy();
    const atEnd = rowIndex === 0 || rowIndex === size - 1;
    const busy = keyboardBusy && !atEnd;
    const [debouncedValue, setDebouncedValue] = useState<T>(() => selectedValue);

    useLayoutEffect(() => {
        if (!hasSelectedNode(roots, selectedId)) {
            const parentNode =
                roots.find((root) => selectedId?.startsWith(`${root.id}/`)) || roots[0];
            setSelectedId(parentNode?.id);
        }
    }, [roots, selectedId]);

    useLayoutEffect(() => {
        onSelect?.(debouncedValue);
    }, [debouncedValue, onSelect]);

    useEffect(() => {
        storeSelectedNodeId(selectedId);
    }, [selectedId, storeSelectedNodeId]);

    useEffect(() => {
        if (!busy) {
            setDebouncedValue(selectedValue);
        }
    }, [selectedValue, busy]);

    const handleContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            onContextMenu?.(selectedValue, event.pageX, event.pageY);
        },
        [selectedValue, onContextMenu]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.key) {
                case 'Enter':
                    event.stopPropagation();
                    if (!event.repeat) {
                        onEnter?.(selectedValue);
                    }
                    break;

                case 'Delete':
                    event.stopPropagation();
                    if (!event.repeat) {
                        onDelete?.(selectedValue);
                    }
                    break;

                case 'Info':
                case 'i':
                    event.stopPropagation();
                    if (!event.repeat) {
                        onInfo?.(selectedValue);
                    }
                    break;

                case 'ArrowLeft':
                    event.stopPropagation();
                    if (!event.repeat) {
                        toggle(selectedId, false);
                    }
                    break;

                case 'ArrowRight':
                    event.stopPropagation();
                    if (!event.repeat) {
                        toggle(selectedId, true);
                    }
                    break;

                default: {
                    const id = getSelectedIdByKey(event.key, visibleIds, selectedId);
                    if (id) {
                        // valid scroll key
                        event.preventDefault();

                        if (id !== selectedId) {
                            event.stopPropagation();
                            const scrollable = scrollableRef.current!;
                            const topIndex = Math.floor(scrollTop / rowHeight);
                            const nextIndex = visibleIds.indexOf(id);
                            if (nextIndex >= topIndex + pageSize - 1) {
                                // too far below
                                const scrollHeight = size * rowHeight;
                                const lastIndex = size - pageSize - 1;
                                const seekIndex = Math.min(size - 1, nextIndex + 1);
                                const topIndex = seekIndex - pageSize;
                                const top =
                                    topIndex === lastIndex ? scrollHeight : topIndex * rowHeight;
                                scrollable.scrollTo({top});
                            } else if (nextIndex <= topIndex) {
                                // too far above
                                const seekIndex = Math.max(0, nextIndex - 1);
                                const top = seekIndex * rowHeight;
                                scrollable.scrollTo({top});
                            }
                            setSelectedId(id);
                        }
                    }
                }
            }
        },
        [
            visibleIds,
            selectedId,
            selectedValue,
            rowHeight,
            pageSize,
            size,
            scrollTop,
            onDelete,
            onEnter,
            onInfo,
            toggle,
        ]
    );

    const handleResize = useCallback(({height}: ScrollableClient) => setHeight(height), []);
    const handleScroll = useCallback(({top}: ScrollablePosition) => setScrollTop(top), []);

    useOnResize(
        cursorRef,
        useCallback(() => {
            setRowHeight(cursorRef.current!.getBoundingClientRect().height);
        }, [])
    );

    return (
        <div
            className={`tree-view ${className}`}
            tabIndex={0}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            ref={containerRef}
        >
            <Scrollable
                scrollAmount={rowHeight}
                onResize={handleResize}
                onScroll={handleScroll}
                scrollableRef={scrollableRef}
            >
                <ul role="tree">
                    {roots.map(({id, ...props}, nodeIndex) => (
                        <TreeViewNode
                            {...props}
                            id={id}
                            selectedId={selectedId}
                            expandedIds={expandedIds}
                            level={1}
                            rowHeight={rowHeight}
                            nodeIndex={nodeIndex}
                            setSize={roots.length}
                            emptyMarker={true}
                            onSelect={setSelectedId}
                            onToggle={toggle}
                            key={id}
                        />
                    ))}
                </ul>
                <div
                    className="tree-view-cursor"
                    style={{
                        transform: `translateY(${rowIndex * rowHeight}px)`,
                    }}
                    ref={cursorRef}
                />
            </Scrollable>
        </div>
    );
}

export function hasSelectedNode<T>(children: TreeNode<T>[], selectedId: string): boolean {
    for (const child of children) {
        if (child.id === selectedId) {
            return true;
        } else if (child.children && hasSelectedNode(child.children, selectedId)) {
            return true;
        }
    }
    return false;
}

function getSelectedIdByKey(key: string, visibleIds: string[], selectedId: string): string {
    switch (key) {
        case 'ArrowUp':
            return visibleIds[visibleIds.indexOf(selectedId) - 1] || selectedId;

        case 'ArrowDown':
            return visibleIds[visibleIds.indexOf(selectedId) + 1] || selectedId;

        case 'Home':
            return visibleIds[0] || selectedId;

        case 'End':
            return visibleIds[visibleIds.length - 1] || selectedId;

        default:
            return '';
    }
}

function getValue<T>(roots: TreeNode<T>[], id: string): T {
    const value = roots.reduce<T | undefined>((value, node) => {
        if (value === undefined) {
            if (node.id === id) {
                value = node.value;
            } else if (node.children) {
                return getValue(node.children, id);
            }
        }
        return value;
    }, undefined);
    return value!;
}
