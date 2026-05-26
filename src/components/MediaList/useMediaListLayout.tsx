import React, {useMemo} from 'react';
import MediaListLayout, {Field} from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {exists, uniq} from 'utils';
import {setSourceFields} from 'services/mediaServices/servicesSettings';
import {ListViewLayout} from 'components/ListView';
import DefaultActions, {ActionsProps} from 'components/Actions';
import {PopupMenuButton} from 'components/Button';
import mediaListFields, {FieldSpec} from './mediaListFields';
import useMediaListFields from './useMediaListFields';
import useMediaListView from './useMediaListView';
import showDetailsMenu from './showDetailsMenu';
import {showEditFieldsDialog} from './EditFieldsDialog';

export default function useMediaListLayout(
    listId: string,
    defaultLayout: MediaListLayout,
    layoutOptions?: Partial<MediaListLayout>,
    Actions: React.FC<ActionsProps> = DefaultActions,
    parentPlaylist?: MediaPlaylist
): ListViewLayout<MediaObject> {
    const view = useMediaListView(listId);
    const fields = useMediaListFields(listId);
    return useMemo(() => {
        let extraFields: Field[] = [
            'Index',
            ...(layoutOptions?.details || defaultLayout.details),
            ...(defaultLayout.extraFields || []),
        ];
        if (extraFields.includes('IconTitle')) {
            extraFields = extraFields.map((field) => (field === 'Title' ? 'IconTitle' : field));
        } else if (extraFields.includes('Name')) {
            extraFields = extraFields.map((field) => (field === 'Title' ? 'Name' : field));
        }
        extraFields = uniq(extraFields);
        return createMediaListLayout(
            listId,
            {
                view: view || layoutOptions?.view || defaultLayout.view,
                card: layoutOptions?.card || defaultLayout.card,
                details: fields || layoutOptions?.details || defaultLayout.details,
                extraFields,
            },
            Actions,
            parentPlaylist
        );
    }, [listId, view, fields, defaultLayout, layoutOptions, Actions, parentPlaylist]);
}

function createMediaListLayout(
    listId: string,
    layout: MediaListLayout,
    Actions: React.FC<ActionsProps>,
    parentPlaylist?: MediaPlaylist
): ListViewLayout<MediaObject> {
    if (layout.view === 'none') {
        return {view: 'details', cols: []};
    }
    const actions: FieldSpec = {
        id: 'Actions' as Field,
        title: 'Actions',
        render: (item: MediaObject) => (
            <Actions item={item} inListView parentPlaylist={parentPlaylist} />
        ),
        className: 'actions',
        align: 'right',
        unsortable: true,
        width: 5,
    };
    const {view, card} = layout;
    if (view === 'details') {
        const handleContextMenu = async (event: React.MouseEvent) => {
            event.preventDefault();
            await showPopupMenu(event.target as HTMLElement, event.pageX, event.pageY);
        };
        const showPopupMenu = async (
            target: HTMLElement,
            x: number,
            y: number,
            align: 'left' | 'right' = 'left'
        ) => {
            const result = await showDetailsMenu(target, x, y, align);
            if (result === 'edit-fields') {
                const newFields = await showEditFieldsDialog(visibleFields, hiddenFields);
                if (newFields) {
                    setSourceFields(listId, newFields);
                }
            }
        };
        const getFields = (fields: readonly Field[] = []): FieldSpec[] =>
            fields
                .map((field) => mediaListFields[field])
                .filter(exists)
                .filter((col) => col.className !== 'thumbnail');
        const visibleFields = getFields(layout.details);
        const allFields: readonly FieldSpec[] = uniq([
            mediaListFields.Index,
            ...visibleFields,
            ...getFields(layout.extraFields),
        ]);
        const hiddenFields = allFields.filter((field) => !visibleFields.includes(field));
        (actions as any).title = (
            <PopupMenuButton
                title="Options…"
                tabIndex={-1}
                showPopup={async (button: HTMLButtonElement) => {
                    const {right, bottom} = button.getBoundingClientRect();
                    await showPopupMenu(button, right, bottom + 4);
                }}
            />
        );
        const cols = visibleFields
            .concat(actions)
            .map((col) => ({...col, onContextMenu: handleContextMenu}));
        if (/\bindex\b/.test(cols[0].className!)) {
            cols[0] = {...cols[0], title: '#'};
        }
        return {view, cols, showTitles: true, sizeable: true};
    } else {
        const getField = (field: Field | undefined, className: string): FieldSpec | undefined => {
            if (field) {
                const col = mediaListFields[field];
                return {...col, className: `${col.className} ${className}`};
            }
        };
        return {
            view,
            cols: [
                card.index ? mediaListFields[card.index] : undefined,
                mediaListFields[card.thumb || 'Thumbnail'],
                getField(card.h1 || 'Title', 'h1'),
                getField(card.h2, 'h2'),
                getField(card.h3, 'h3'),
                getField(card.data, 'data'),
                actions,
            ].filter(exists),
        };
    }
}
