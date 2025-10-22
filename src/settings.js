document.addEventListener('DOMContentLoaded', () => {
    const hotkeyCaptureInput = document.getElementById('hotkey-capture');
    const hotkeyAiToolInput = document.getElementById('hotkey-ai-tool');
    const aiToolSelect = document.getElementById('ai-tool-select');
    const promptsContainer = document.getElementById('prompts-container');
    const saveBtn = document.getElementById('save-btn');
    const closeBtn = document.getElementById('close-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    let activeHotkeyInput = null;
    let originalHotkeyValues = {};

    function renderPrompts(prompts) {
        console.log('Rendering prompts:', prompts);
        promptsContainer.innerHTML = '';
        prompts.forEach((prompt) => {
            console.log('Rendering prompt:', prompt);
            const promptEl = document.createElement('div');
            promptEl.classList.add('prompt-item');
            promptEl.innerHTML = `
                <label for="prompt-text-${prompt.id}">${prompt.label}</label>
                <input type="text" class="prompt-text" id="prompt-text-${prompt.id}" data-id="${prompt.id}" value="${prompt.text}" placeholder="Enter prompt text...">
            `;
            promptsContainer.appendChild(promptEl);
        });
    }

    async function loadSettings() {
        const settings = await window.electronAPI.handle('get-settings');
        console.log('Loaded settings:', settings);

        hotkeyCaptureInput.value = settings.hotkeyCapture;
        hotkeyAiToolInput.value = settings.hotkeyAiTool;
        aiToolSelect.value = settings.aiTool;
        renderPrompts(settings.prompts);
    }

    const handleHotkeyFocus = (event) => {
        window.electronAPI.send('disable-hotkeys');
        activeHotkeyInput = event.target;
        originalHotkeyValues[activeHotkeyInput.id] = activeHotkeyInput.value;
        activeHotkeyInput.value = 'Recording...';
        activeHotkeyInput.classList.add('recording');
    };

    const handleHotkeyBlur = () => {
        window.electronAPI.send('enable-hotkeys');
        if (activeHotkeyInput) {
            if (activeHotkeyInput.value === 'Recording...') {
                activeHotkeyInput.value = originalHotkeyValues[activeHotkeyInput.id];
            }
            activeHotkeyInput.classList.remove('recording');
            activeHotkeyInput = null;
        }
    };

    const handleKeyDown = (event) => {
        if (!activeHotkeyInput) return;

        event.preventDefault();
        const parts = [];

        if (event.ctrlKey) parts.push('Control');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Command');

        const key = event.key.toUpperCase();
        if (!['CONTROL', 'ALT', 'SHIFT', 'META', ' '].includes(key)) {
            if (key === '+') parts.push('Plus');
            else if (key === ' ') parts.push('Space');
            else parts.push(key);
        }

        let accelerator = parts.join('+');

        if ((event.metaKey || event.ctrlKey)) {
            accelerator = accelerator.replace('Command', 'CommandOrControl').replace('Control', 'CommandOrControl');
            accelerator = [...new Set(accelerator.split('+'))].join('+');
        }

        activeHotkeyInput.value = accelerator;
    };

    hotkeyCaptureInput.addEventListener('focus', handleHotkeyFocus);
    hotkeyCaptureInput.addEventListener('blur', handleHotkeyBlur);
    hotkeyAiToolInput.addEventListener('focus', handleHotkeyFocus);
    hotkeyAiToolInput.addEventListener('blur', handleHotkeyBlur);
    window.addEventListener('keydown', handleKeyDown);

    saveBtn.addEventListener('click', async () => {
        const prompts = [];
        document.querySelectorAll('.prompt-item').forEach(item => {
            const labelEl = item.querySelector('label');
            const textInput = item.querySelector('.prompt-text');

            console.log('Processing prompt item:');
            console.log('  Label text:', labelEl.innerText);
            console.log('  Input dataset.id:', textInput.dataset.id);
            console.log('  Input value:', textInput.value);

            prompts.push({
                id: textInput.dataset.id,
                label: labelEl.innerText,
                text: textInput.value
            });
        });

        console.log('Prompts to save:', prompts);

        const newSettings = {
            hotkeyCapture: hotkeyCaptureInput.value,
            hotkeyAiTool: hotkeyAiToolInput.value,
            aiTool: aiToolSelect.value,
            prompts: prompts
        };

        console.log('Saving settings:', newSettings);
        window.electronAPI.send('save-settings', newSettings);

        // Show saved message
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('btn-saved');
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('btn-saved');
        }, 2000);
    });

    closeBtn.addEventListener('click', () => {
        window.electronAPI.send('close-settings-window');
    });

    cancelBtn.addEventListener('click', () => {
        window.electronAPI.send('close-settings-window');
    });

    loadSettings();
});