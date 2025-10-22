import { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, clipboard, screen, nativeImage, shell, Tray, Menu } from 'electron';
import path from 'node:path';
import { exec } from 'node:child_process';
import { activeWindow } from 'get-windows';
import robot from 'robotjs';
import started from 'electron-squirrel-startup';
// --- FIX: Reverted to import syntax for ES Module compatibility ---
import ElectronStore from 'electron-store';

const store = new ElectronStore.default();

if (started) {
  app.quit();
}

let mainWindow;
let captureWindow;
let radialMenuWindow;
let tray;
let lastCapturedImage = null; // Store the last captured image

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createSettingsWindow = () => {
  mainWindow = new BrowserWindow({
    width: 700,  // Reduced from 800
    height: 820, // Reduced from 750
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/settings.html`);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/settings.html`));
  }
};

function createCaptureWindow(display) {
  const { x, y } = display.bounds;

  captureWindow = new BrowserWindow({
    x,
    y,
    width: 1,
    height: 1,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  captureWindow.setFullScreen(true);
  captureWindow.loadFile(path.join(__dirname, '../../capture.html'));

  captureWindow.on('closed', () => {
    captureWindow = null;
  });
}

const createRadialMenuWindow = (x, y) => {
  const menuDiameter = 360;
  const display = screen.getDisplayNearestPoint({ x, y });
  const workArea = display.workArea;

  let windowX = x - menuDiameter / 2;
  let windowY = y - menuDiameter / 2;

  if (windowX < workArea.x) {
    windowX = workArea.x;
  } else if (windowX + menuDiameter > workArea.x + workArea.width) {
    windowX = workArea.x + workArea.width - menuDiameter;
  }

  if (windowY < workArea.y) {
    windowY = workArea.y;
  } else if (windowY + menuDiameter > workArea.y + workArea.height) {
    windowY = workArea.y + workArea.height - menuDiameter;
  }

  radialMenuWindow = new BrowserWindow({
    x: Math.round(windowX),
    y: Math.round(windowY),
    width: menuDiameter,
    height: menuDiameter,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  radialMenuWindow.loadFile(path.join(__dirname, '../../radial_menu.html'));

  radialMenuWindow.on('blur', () => {
    if (radialMenuWindow) {
      radialMenuWindow.close();
    }
  });

  radialMenuWindow.on('closed', () => { radialMenuWindow = null; });
};

// --- New Hotkey Management Functions ---
function registerHotkeys() {
  const hotkeyCapture = store.get('hotkeyCapture');

  // Register Capture Hotkey
  const retCapture = globalShortcut.register(hotkeyCapture, () => {
    // console.log(`Capture hotkey (${hotkeyCapture}) pressed`);

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);

    if (!captureWindow) {
      createCaptureWindow(display);
    }
  });

  // if (!retCapture) {
  //   console.log(`Failed to register capture hotkey: ${hotkeyCapture}`);
  // } else {
  //   console.log(`Registered capture hotkey: ${hotkeyCapture}`);
  // }

}

function unregisterHotkeys() {
  globalShortcut.unregisterAll();
  // console.log('All global hotkeys unregistered.');
}
// --- End of New Functions ---


app.whenReady().then(() => {
  // Initialize store with defaults if not already set
  const defaults = {
    hotkeyCapture: 'CommandOrControl+Shift+A',
    hotkeyAiTool: 'Alt+Space',
    aiTool: 'ChatGPT',
    prompts: [
      {
        id: 'solve',
        label: 'Solve',
        text: 'Analyze this screenshot and solve any problems, questions, or challenges visible in the image. If there are multiple issues, address each one. Provide step-by-step solutions, calculations, or answers as needed. If the image shows code with errors, debug it. If it shows a math problem, solve it completely. If it shows a puzzle or game, explain the solution strategy.'
      },
      {
        id: 'copy',
        label: 'Copy',
        text: 'Carefully examine this screenshot and recreate or generate similar content based on what you see. If it contains text, reproduce it accurately. If it shows code, provide equivalent or similar code with the same functionality. If it displays a design, UI, or visual element, describe how to recreate it or provide the necessary code/markup. Match the style, structure, and format as closely as possible.'
      },
      {
        id: 'explain',
        label: 'Explain',
        text: 'Provide a comprehensive explanation of everything visible in this screenshot. Describe what the image shows, identify any text, code, UI elements, diagrams, or objects present. Explain the purpose, context, and meaning of the content. If technical concepts are visible, break them down in clear, understandable terms. Include details about the layout, structure, and any notable features or patterns you observe.'
      },
      {
        id: 'resources',
        label: 'Resources',
        text: 'Based on the content shown in this screenshot, identify the topic, technology, concept, or subject matter and provide relevant learning resources. Include: documentation links, tutorial recommendations, official guides, API references, related tools or libraries, community resources, and any other helpful materials that would help someone understand or work with what is shown in the image. Explain why each resource is relevant.'
      },
      {
        id: 'shopping',
        label: 'Shopping',
        text: 'Identify all products, items, or objects visible in this screenshot. For each item, provide: a detailed description, the product category, suggested search terms to find similar items online, typical price ranges, and recommendations for where to purchase (e.g., specific retailers or marketplaces). If brands or specific models are visible, mention them. Focus on items that appear to be consumer products that could realistically be purchased online.'
      }
    ]
  };

  // Set defaults only if keys don't exist
  for (const [key, value] of Object.entries(defaults)) {
    if (!store.has(key)) {
      store.set(key, value);
    }
  }

  // TEMPORARY FIX: Force reset prompts if they're corrupted
  const existingPrompts = store.get('prompts');
  if (!existingPrompts || !existingPrompts[0] || !existingPrompts[0].id) {
    // console.log('Prompts corrupted, resetting to defaults...');
    store.set('prompts', defaults.prompts);
  }

  // Debug: Log what's actually in the store after initialization
  // console.log('Store initialized. Prompts:', store.get('prompts'));

  const iconPath = path.join(__dirname, '../../assets/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings', click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
        } else {
          createSettingsWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Gippityer', click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Gippityer');
  tray.setContextMenu(contextMenu);

  ipcMain.on('close-capture-window', () => {
    if (captureWindow) {
      captureWindow.close();
    }
  });

  // Initial registration of hotkeys from stored settings
  registerHotkeys();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow();
  });
});

ipcMain.handle('capture-screen', async (event, payload) => {
  const { rect, cursor } = payload;
  if (!captureWindow) return;

  let display;

  try {
    // console.log("--- CAPTURE PROCESS STARTED ---");
    display = screen.getDisplayMatching(captureWindow.getBounds());
    captureWindow.hide();

    const allDisplays = screen.getAllDisplays();
    const maxWidth = Math.round(Math.max(...allDisplays.map(d => d.size.width * d.scaleFactor)));
    const maxHeight = Math.round(Math.max(...allDisplays.map(d => d.size.height * d.scaleFactor)));

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxWidth, height: maxHeight }
    });

    const source = sources.find(s => s.display_id === display.id.toString());
    if (!source) throw new Error(`Could not find screen source for display ${display.id}`);

    const thumbnail = source.thumbnail;

    const scaledRect = {
      x: Math.floor(rect.x * display.scaleFactor),
      y: Math.floor(rect.y * display.scaleFactor),
      width: Math.floor(rect.width * display.scaleFactor),
      height: Math.floor(rect.height * display.scaleFactor)
    };

    if (scaledRect.width > 0 && scaledRect.height > 0) {
      const croppedImage = thumbnail.crop(scaledRect);
      lastCapturedImage = croppedImage; // Store globally
      clipboard.writeImage(croppedImage);
      // console.log('Image cropped and copied to clipboard.');
    }

  } catch (e) {
    console.error('Failed to capture screen:', e);
  } finally {
    if (captureWindow) {
      captureWindow.close();
      if (display) {
        const absoluteCursorX = display.bounds.x + cursor.x;
        const absoluteCursorY = display.bounds.y + cursor.y;
        createRadialMenuWindow(absoluteCursorX, absoluteCursorY);
      } else {
        console.error("Could not determine display to place radial menu.");
      }
    }
  }
});

// This function is now more generic
function simulateHotkey(accelerator) {
  const parts = accelerator.split('+');
  const key = parts.pop().toLowerCase();
  const modifiers = parts.map(p => p.toLowerCase());

  try {
    modifiers.forEach(mod => robot.keyToggle(mod, 'down'));
    robot.keyTap(key);
    modifiers.reverse().forEach(mod => robot.keyToggle(mod, 'up'));
  } catch (e) {
    console.error(`Failed to simulate hotkey "${accelerator}":`, e);
  }
}


async function handleAppAutomation(action) {
  try {
    // console.log(`Action [${action}] received. Summoning AI Tool...`);

    const hotkeyAiTool = store.get('hotkeyAiTool');
    const targetApp = store.get('aiTool');
    const prompts = store.get('prompts');

    const selectedPrompt = prompts.find(p => p.id === action);

    if (!selectedPrompt) {
      console.error(`Could not find prompt for action: ${action}`);
      return;
    }

    const checkIsTargetActive = (win) => {
      if (!win) return false;
      const target = targetApp.toLowerCase();
      const ownerName = win.owner?.name?.toLowerCase() || '';
      const ownerPath = win.owner?.path?.toLowerCase() || '';
      const title = win.title?.toLowerCase() || '';
      return ownerName.includes(target) || ownerPath.includes(target) || title.includes(target);
    };

    // Summon the AI tool
    simulateHotkey(hotkeyAiTool);
    await delay(500);

    let activeWin = await activeWindow();
    let isTargetApp = checkIsTargetActive(activeWin);

    if (!isTargetApp) {
      // console.log("AI tool not active, trying again...");
      simulateHotkey(hotkeyAiTool);
      await delay(500);
      activeWin = await activeWindow();
      isTargetApp = checkIsTargetActive(activeWin);
    }

    if (isTargetApp) {
      // console.log("AI tool is active.");

      const pasteModifier = process.platform === 'darwin' ? 'command' : 'control';

      // Press Enter first to focus the input field
      robot.keyTap('enter');
      // console.log("Pressed Enter to focus input.");
      await delay(200);

      // 1st, copy and paste the image
      if (lastCapturedImage) {
        clipboard.writeImage(lastCapturedImage);
        // console.log("Image copied to clipboard.");
        await delay(100);

        robot.keyToggle(pasteModifier, 'down');
        robot.keyTap('v');
        robot.keyToggle(pasteModifier, 'up');
        // console.log("Image pasted.");
        await delay(200);

      }

      // 2nd, copy and paste the prompt text
      clipboard.writeText(selectedPrompt.text);
      // console.log("Text copied to clipboard.");
      await delay(100);

      robot.keyToggle(pasteModifier, 'down');
      robot.keyTap('v');
      robot.keyToggle(pasteModifier, 'up');
      // console.log("Text pasted.");
      await delay(100);



      // Press Enter to submit
      robot.keyTap('enter');
      // console.log("Submitted to AI tool.");


    } else {
      console.error("Failed to activate AI tool window.");
      // if (activeWin) {
      //   console.log("Active window:", activeWin.owner?.name || activeWin.title);
      // }
    }
  } catch (error) {
    console.error("Error during automation:", error);
  }
}

ipcMain.on('radial-menu-action', (event, action) => {
  if (radialMenuWindow) radialMenuWindow.close();
  handleAppAutomation(action);
});

ipcMain.on('close-radial-menu', () => {
  if (radialMenuWindow) {
    radialMenuWindow.close();
  }
});

ipcMain.handle('get-settings', async () => {
  return {
    hotkeyCapture: store.get('hotkeyCapture'),
    hotkeyAiTool: store.get('hotkeyAiTool'),
    aiTool: store.get('aiTool'),
    prompts: store.get('prompts')
  };
});

ipcMain.on('save-settings', (event, settings) => {
  for (const key in settings) {
    store.set(key, settings[key]);
  }
  // Re-register hotkeys with the new values
  unregisterHotkeys();
  registerHotkeys();
});

ipcMain.on('close-settings-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// --- New IPC Listeners for hotkey recording ---
ipcMain.on('disable-hotkeys', unregisterHotkeys);
ipcMain.on('enable-hotkeys', registerHotkeys);


app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Keeps the app alive in the tray
});