function log(message) {
  chrome.runtime.sendMessage({ action: "log", message: message });
  console.log("[Extension Log]", message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(selector, timeout = 10000, parent = document) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = parent.querySelector(selector);
    if (el) return el;
    await sleep(500);
  }
  return null;
}

function normalizeText(text) {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getElementByText(selector, text) {
  const normalizedSearch = normalizeText(text);
  const elements = document.querySelectorAll(selector);
  for (const el of elements) {
    if (normalizeText(el.innerText).includes(normalizedSearch)) {
      return el;
    }
  }
  return null;
}

function findPromptField(modal) {
  const container = modal || document;

  // First, try fields that look like the prompt textarea/input
  const direct = container.querySelector('textarea[aria-label*="tema" i], textarea[aria-label*="topic" i], textarea[formcontrolname], textarea.mat-input-element, textarea, [contenteditable="true"], input[type="text"], input[role="combobox"]');
  if (direct) return direct;

  // Then, find the label "Qual deve ser o tema?" and grab the nearest textarea/input
  const label = Array.from(container.querySelectorAll('label, span, div, p'))
    .find(el => normalizeText(el.innerText).includes('qual deve ser o tema'));

  if (label) {
    const field = label.parentElement?.querySelector('textarea, [contenteditable="true"], input[type="text"]') ||
                  label.closest('form, div')?.querySelector('textarea, [contenteditable="true"], input[type="text"]');
    if (field) return field;
  }

  return null;
}

async function waitForGenerationToFinish(modal, timeout = 20000) {
  const start = Date.now();

  const isLoading = () => {
    const container = modal || document;
    const spinners = container.querySelectorAll('.mat-mdc-progress-spinner, .mdc-circular-progress, svg[aria-label*="progress"]');
    const busyButton = container.querySelector('button[aria-busy="true"], button:disabled');
    const visibleSpinner = Array.from(spinners).some(sp => sp.offsetParent !== null);
    return visibleSpinner || !!busyButton;
  };

  while (Date.now() - start < timeout) {
    if (!isLoading()) {
      return true;
    }
    await sleep(500);
  }

  return false;
}

function findCloseButton(modal) {
  if (!modal) return null;
  return modal.querySelector('button[aria-label*="close" i]') ||
         modal.querySelector('button[aria-label*="fechar" i]') ||
         modal.querySelector('button[mat-dialog-close]') ||
         modal.querySelector('button.mdc-icon-button');
}

let isAutomationRunning = false;

const assetMapping = {
    "audio": ["Resumo em Áudio", "Audio Overview", "Audio"],
    "video": ["Resumo em Vídeo", "Video Overview", "Video"],
    "mental": ["Mapa mental", "Mental map", "Mind map"],
    "reports": ["Relatórios", "Reports", "Briefing", "Guia de estudo", "Manual", "Roteiro"],
    "flashcards": ["Cartões didáticos", "Flashcards", "Cartões"],
    "quiz": ["Teste", "Quiz", "Test"],
    "infographic": ["Infográfico", "Infographic"],
    "slides": ["Apresentação de slides", "Slides", "Presentation"]
};

async function generateAssetWithTopic(assetKey, singleTopic) {
  log(`--- Cycle: Asset '${assetKey}' with topic '${singleTopic.substring(0, 30)}...' ---`);
  await sleep(2000);

  const labelsToTry = assetMapping[assetKey] || [assetKey];
  let assetLabelEl = null;

  for (const label of labelsToTry) {
      assetLabelEl = getElementByText("span", label) || getElementByText("div", label);
      if (assetLabelEl) {
          log(`Found asset '${label}' for key '${assetKey}'`);
          break;
      }
  }
  
  if (!assetLabelEl) {
      log(`Warning: Could not find any label for asset key: ${assetKey}`);
      return;
  }
  
  const container = assetLabelEl.closest('div[role="button"]') || 
                    assetLabelEl.closest('.mdc-evolution-chip') || 
                    assetLabelEl.parentElement.parentElement; 
  
  let editBtn = null;
  if (container) {
       editBtn = container.querySelector('button[aria-label*="Edit"]') || 
                 container.querySelector('button[aria-label*="Editar"]') ||
                 container.querySelector('button[aria-label*="Personalizar"]') ||
                 container.querySelector('button:has(svg)'); 
       
       if (!editBtn) {
          const parent = assetLabelEl.closest('div') || assetLabelEl.parentElement;
          const modalRow = parent.closest('.mdc-layout-grid__inner') || parent.parentElement;
          editBtn = Array.from(modalRow.querySelectorAll('button')).find(btn => 
               btn.getAttribute('aria-label')?.toLowerCase().includes('edit') ||
               btn.getAttribute('aria-label')?.toLowerCase().includes('personalizar') ||
               btn.querySelector('svg')
          );
       }
  }

  if (editBtn) {
      log(`Found Customize button for ${assetKey}. Opening modal...`);
      editBtn.click();
      
      await sleep(3000); // Wait for modal to fully open
      
      // Find the modal/dialog first, then look for textarea inside it
      const modal = document.querySelector('mat-dialog-container') ||
                    document.querySelector('[role="dialog"]') ||
                    document.querySelector('.cdk-overlay-pane') ||
                    document.querySelector('.mdc-dialog__surface') ||
                    document.querySelector('.mat-mdc-dialog-surface');
      
      log(`[Debug] Modal found: ${modal ? 'YES' : 'NO'}`);
      
        const textarea = findPromptField(modal);
        log(`[Debug] Prompt field found: ${textarea ? 'YES' : 'NO'}`);

        if (textarea) {
           const promptPrefix = "Gere este conteúdo com base no seguinte tópico:\n";
           const fullMessage = promptPrefix + `• ${singleTopic}`;
           
           log(`Injecting topic into modal...`);
           log(`[Debug] Textarea found: ${textarea.tagName}, id=${textarea.id || 'none'}`);
           
           textarea.focus();
           await sleep(1000);
           
           // Clear existing content
           if (textarea.tagName === 'TEXTAREA' || textarea.tagName === 'INPUT') {
              textarea.select();
           } else {
              // For contenteditable
              const range = document.createRange();
              range.selectNodeContents(textarea);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
           }
           
           // Method: Use execCommand to simulate typing
           document.execCommand('insertText', false, fullMessage);
           log("[Debug] Used execCommand('insertText')");
           
           // Fallback: Also set value directly
           if (textarea.tagName === 'TEXTAREA' || textarea.tagName === 'INPUT') {
              if (!textarea.value) {
                 textarea.value = fullMessage;
                 log("[Debug] Fallback: Used textarea.value");
              }
           } else {
              if (!textarea.innerText) {
                 textarea.innerText = fullMessage;
                 log("[Debug] Fallback: Used innerText");
              }
           }
           
           // Dispatch InputEvent with data (for modern frameworks)
           const inputEvent = new InputEvent('input', {
               bubbles: true,
               cancelable: true,
               inputType: 'insertText',
               data: fullMessage
           });
           textarea.dispatchEvent(inputEvent);
           textarea.dispatchEvent(new Event('change', { bubbles: true }));
           
           await sleep(3000);
           
           const generateBtn = getElementByText("button", "Gerar") || 
                               getElementByText("span", "Gerar") ||
                               getElementByText("button", "Generate") ||
                               getElementByText("span", "Generate") ||
                               document.querySelector('button[aria-label*="Send"]') ||
                               document.querySelector('button[aria-label*="Enviar"]');
           
           if (generateBtn) {
               log("Clicking 'Gerar' button.");
               const actualBtn = generateBtn.closest("button") || generateBtn;
               await sleep(2000);
               if (!actualBtn.disabled) {
                   actualBtn.click();
                 const finished = await waitForGenerationToFinish(modal, 20000);
                 if (!finished) {
                   log("Warning: Generation did not finish before timeout.");
                 }
                 const closeBtn = findCloseButton(modal);
                   if (closeBtn) {
                     closeBtn.click();
                     await sleep(2000);
                     log("Closed customization modal; allowing UI to settle.");
                   }
                   await sleep(1500); // small buffer before next topic/asset
               }
           }
        } else {
          log("Warning: Prompt field not found in modal; skipping this asset to avoid wrong insertion.");
        }
  } else {
      log(`Customize button not found for ${assetKey}. Clicking default asset button.`);
      assetLabelEl.click();
      await sleep(2000);
  }
}

async function startAutomation(data) {
  if (isAutomationRunning) {
    log("Automation is already running. Ignoring start request.");
    return;
  }
  isAutomationRunning = true;
  const { urls } = data; 
  const rawTopics = (urls && urls[0]) ? urls[0] : "";
  
  // Parse topics by semicolon
  const topicList = rawTopics.split(';')
                             .map(t => t.trim())
                             .filter(t => t.length > 0);

  try {
    log("Starting asset generation automation...");
    
    if (!data.assets || data.assets.length === 0) {
        log("Error: No assets selected.");
        isAutomationRunning = false;
        chrome.runtime.sendMessage({ action: "finished" });
        return;
    }

    const totalCycles = topicList.length * data.assets.length;
    log(`Running ${totalCycles} cycles: ${topicList.length} topics x ${data.assets.length} assets`);

    for (let i = 0; i < topicList.length; i++) {
        const topic = topicList[i];
        log(`\n=== Topic ${i + 1}/${topicList.length}: "${topic.substring(0, 50)}..." ===`);
        
        for (const assetKey of data.assets) {
            await generateAssetWithTopic(assetKey, topic);
        }

      // Pause between topics to ensure NotebookLM finishes background work
      await sleep(2000);
    }

    log("Automation Finished Successfully.");
    isAutomationRunning = false;
    chrome.runtime.sendMessage({ action: "finished" });

  } catch (err) {
    log("Top-level Error: " + err.message);
    isAutomationRunning = false;
    chrome.runtime.sendMessage({ action: "finished" });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "alive" });
    return true;
  }
  if (request.action === "start_automation") {
    startAutomation(request.data);
    sendResponse({ status: "started" });
    return true;
  }
});
