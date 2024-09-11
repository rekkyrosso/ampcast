const {app} = require('electron');

// Copied from: https://www.electronjs.org/docs/latest/api/menu#examples

const isMac = process.platform === 'darwin';

const menu = [
    // { role: 'appMenu' }
    ...(isMac
        ? [
              {
                  label: app.name,
                  submenu: [
                      {role: 'about'},
                      {type: 'separator'},
                      {role: 'services'},
                      {type: 'separator'},
                      {role: 'hide'},
                      {role: 'hideOthers'},
                      {role: 'unhide'},
                      {type: 'separator'},
                      {role: 'quit'},
                  ],
              },
          ]
        : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [isMac ? {role: 'close'} : {role: 'quit'}],
    },
    // { role: 'editMenu' }
    {
        label: 'Edit',
        submenu: [
            {role: 'undo'},
            {role: 'redo'},
            {type: 'separator'},
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'},
            ...(isMac
                ? [
                      {role: 'pasteAndMatchStyle'},
                      {role: 'delete'},
                      {role: 'selectAll'},
                      {type: 'separator'},
                      {
                          label: 'Speech',
                          submenu: [{role: 'startSpeaking'}, {role: 'stopSpeaking'}],
                      },
                  ]
                : [{role: 'delete'}, {type: 'separator'}, {role: 'selectAll'}]),
        ],
    },
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            {role: 'reload'},
            {role: 'forceReload'},
            {role: 'toggleDevTools'},
            {type: 'separator'},
            {role: 'togglefullscreen'},
        ],
    },
    // { role: 'windowMenu' }
    {
        label: 'Window',
        submenu: [
            {role: 'minimize'},
            ...(isMac
                ? [{type: 'separator'}, {role: 'front'}, {type: 'separator'}, {role: 'window'}]
                : [{role: 'close'}]),
        ],
    },
];

module.exports = menu;
