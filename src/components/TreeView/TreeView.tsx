import React, {useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {browser} from 'utils';
import {IconName} from 'components/Icon';
import Scrollable, {
    ScrollableClient,
    ScrollableHandle,
    ScrollablePosition,
} from 'components/Scrollable';
import useFontSize from 'hooks/useFontSize';
import useKeyboardBusy from 'hooks/useKeyboardBusy';
import useOnResize from 'hooks/useOnResize';
import usePrevious from 'hooks/usePrevious';
import TreeViewNode from './TreeViewNode';
import useNodeIds from './useNodeIds';
import useTreeViewState from './useTreeViewState';
import './TreeView.scss';

export interface TreeNode<T> {
    readonly id: string;
    readonly label: React.ReactNode;
    readonly value: T;
    readonly children?: readonly TreeNode<T>[];
    readonly startExpanded?: boolean;
    readonly icon?: IconName;
    readonly tooltip?: string;
}

export interface TreeViewHandle {
    focus: () => void;
}

export interface TreeViewProps<T> {
    roots: readonly TreeNode<T>[];
    className?: string;
    storageId?: string;
    onContextMenu?: (item: T, x: number, y: number) => void;
    onDelete?: (item: T) => void;
    onEnter?: (item: T) => void;
    onInfo?: (item: T) => void;
    onSelect?: (item: T | null) => void;
    ref?: React.RefObject<TreeViewHandle | null>;
}

export const defaultRowHeight = 24;

const scrollKeys = ['ArrowUp', 'ArrowDown'];

export default function TreeView<T>({
    roots,
    className = '',
    storageId,
    onContextMenu,
    onDelete,
    onEnter,
    onInfo,
    onSelect,
    ref,
}: TreeViewProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<ScrollableHandle>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const {storeSelectedNodeId, retrieveSelectedNodeId} = useTreeViewState(storageId);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const {expandedIds, visibleIds, toggle} = useNodeIds(roots, storageId);
    const rowIndex = visibleIds.indexOf(selectedId);
    const prevRowIndex = usePrevious(rowIndex) || 0;
    const prevNodeId = visibleIds[prevRowIndex - 1];
    const fontSize = useFontSize(containerRef);
    const [clientWidth, setClientWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [rowHeight, setRowHeight] = useState(defaultRowHeight);
    const [scrollTop, setScrollTop] = useState(0);
    const pageSize = Math.floor(height / rowHeight) - 1;
    const size = visibleIds.length;
    const selectedValue = getValue(roots, selectedId);
    const keyboardBusy = useKeyboardBusy(scrollKeys);
    const atEnd = rowIndex === 0 || rowIndex === size - 1;
    const noSelection = rowIndex === -1;
    const busy = keyboardBusy && !atEnd;
    const [debouncedValue, setDebouncedValue] = useState<T>(() => selectedValue);
    const hasVisibleNodes = visibleIds.length > 0;
    const showTooltip = fontSize * 8 > clientWidth;
    const minimalWidth = fontSize * 4 > clientWidth;

    useImperativeHandle(ref, () => ({
        focus: () => {
            containerRef.current?.focus();
        },
    }));

    useOnResize(containerRef, ({width}) => setClientWidth(width));
    useOnResize(cursorRef, ({height}) => setRowHeight(height), 'border-box');

    useEffect(() => {
        if (noSelection && hasVisibleNodes) {
            const parentNodeId = getParentNodeId(roots, prevNodeId);
            setSelectedId(parentNodeId || roots[0]?.id || '');
        }
    }, [roots, hasVisibleNodes, noSelection, prevNodeId]);

    useEffect(() => {
        if (!selectedId && hasVisibleNodes) {
            const nodeId = retrieveSelectedNodeId();
            if (hasSelectedNode(roots, nodeId)) {
                setSelectedId(nodeId);
            } else {
                setSelectedId(roots[0].id);
            }
        }
    }, [roots, hasVisibleNodes, selectedId, retrieveSelectedNodeId]);

    useEffect(() => {
        if (!hasScrolled && selectedId) {
            setHasScrolled(true);

            const rowIndex = visibleIds.indexOf(selectedId);
            if (rowIndex >= pageSize - 1) {
                const parentNodeId = getParentNodeId(roots, selectedId);
                const topIndex = visibleIds.indexOf(parentNodeId || selectedId);
                const top = topIndex * rowHeight;
                scrollableRef.current?.scrollTo({top});
            }
        }
    }, [roots, selectedId, visibleIds, pageSize, hasScrolled, rowHeight]);

    useEffect(() => {
        onSelect?.(debouncedValue);
    }, [debouncedValue, onSelect]);

    useEffect(() => {
        if (selectedId) {
            storeSelectedNodeId(selectedId);
        }
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
            switch (event.code) {
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

                case 'KeyI':
                    event.stopPropagation();
                    if (
                        event[browser.cmdKey] &&
                        !event.shiftKey &&
                        !event.altKey &&
                        !event.repeat
                    ) {
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

    const handleResize = useCallback(
        ({clientHeight}: ScrollableClient) => setHeight(clientHeight),
        []
    );

    const handleScroll = useCallback(({top}: ScrollablePosition) => setScrollTop(top), []);

    return (
        <div
            className={`tree-view ${className} ${minimalWidth ? 'minimal-width' : ''}`}
            tabIndex={0}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            ref={containerRef}
        >
            <Scrollable
                lineHeight={rowHeight}
                scrollHeight={size * rowHeight}
                onResize={handleResize}
                onScroll={handleScroll}
                ref={scrollableRef}
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
                            showTooltip={showTooltip}
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

export function hasSelectedNode<T>(children: readonly TreeNode<T>[], selectedId: string): boolean {
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

function getValue<T>(roots: readonly TreeNode<T>[], id: string): T {
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

function getParentNodeId<T>(roots: readonly TreeNode<T>[], id: string): string {
    return roots.reduce((value, node) => {
        if (!value) {
            if (node.children) {
                if (node.children.find((child) => child.id === id)) {
                    return node.id;
                }
                return getParentNodeId(node.children, id);
            }
        }
        return value;
    }, '');
}
