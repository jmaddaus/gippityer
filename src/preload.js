// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Define whitelists for secure communication
const sendChannels = [
    'close-capture-window',
    'radial-menu-action',
    'close-radial-menu', // Added for the Escape key functionality
    'save-settings',
    'close-settings-window',
    'disable-hotkeys', // Added for recording
    'enable-hotkeys'  // Added for recording
];
const handleChannels = [
    'capture-screen',
    'get-settings'
];
const receiveChannels = [
    'hotkey-pressed'
];

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => {
        if (sendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    handle: (channel, data) => {
        if (handleChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },
    on: (channel, func) => {
        if (receiveChannels.includes(channel)) {
            const subscription = (event, ...args) => func(...args);
            ipcRenderer.on(channel, subscription);
            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        }
    },
});

