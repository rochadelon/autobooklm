document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const statusDiv = document.getElementById("status");
  const notebookNameInput = document.getElementById("notebookName");
  const sourceTypeSelect = document.getElementById("sourceType");
  const urlsTextarea = document.getElementById("urls");

  // Load saved state
  chrome.storage.local.get(["notebookName", "sourceType", "urls", "selectedAssets", "createNew"], (result) => {
    if (result.notebookName) notebookNameInput.value = result.notebookName;
    if (result.sourceType) sourceTypeSelect.value = result.sourceType;
    if (result.urls) urlsTextarea.value = result.urls;
    if (result.createNew !== undefined) document.getElementById('createNew').checked = result.createNew;
    if (result.selectedAssets) {
      result.selectedAssets.forEach(val => {
        const cb = document.querySelector(`.checkbox-group input[value="${val}"]`);
        if (cb) cb.checked = true;
      });
    }
  });

  startBtn.addEventListener("click", async () => {
    const notebookName = notebookNameInput.value.trim();
    const sourceType = sourceTypeSelect.value;
    const createNew = document.getElementById('createNew').checked;
    const urlsVal = urlsTextarea.value;
    
    const selectedAssets = Array.from(document.querySelectorAll('#assetCheckboxes input:checked')).map(cb => cb.value);

    if (selectedAssets.length === 0) {
      statusDiv.textContent = "Please select at least one asset.";
      return;
    }

    // Save state
    chrome.storage.local.set({
      notebookName,
      sourceType,
      urls: urlsVal,
      selectedAssets,
      createNew
    });

    startBtn.disabled = true;
    statusDiv.textContent = "Starting automation...";

    // get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url.includes("notebooklm.google.com")) {
      statusDiv.textContent =
        "Please navigate to https://notebooklm.google.com before starting.";
      startBtn.disabled = false;
      return;
    }

    try {
      await ensureContentScriptInjected(tab.id);
      
      // Send message to content script
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "start_automation",
          data: {
            notebookName,
            sourceType,
            urls: [urlsVal], // Treated as customization topics
            assets: selectedAssets,
            createNew
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            statusDiv.textContent =
              "Error: " +
              chrome.runtime.lastError.message +
              "\nTry refreshing the page.";
            startBtn.disabled = false;
          } else {
            statusDiv.textContent += "\nAutomation running... check the page.";
          }
        }
      );
    } catch (err) {
      statusDiv.textContent = "Error: " + err.message;
      startBtn.disabled = false;
    }
  });

  async function ensureContentScriptInjected(tabId) {
    try {
      // Try to ping the content script
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError || !response || response.status !== "alive") {
            reject(new Error("Content script not responding"));
          } else {
            resolve();
          }
        });
      });
      console.log("Content script is already active.");
    } catch (err) {
      console.log("Content script not found, injecting...");
      // Inject content script if ping fails
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
      });
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Listen for progress updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "log") {
      statusDiv.textContent += "\n" + message.message;
      statusDiv.scrollTop = statusDiv.scrollHeight;
    }
    if (message.action === "finished") {
      startBtn.disabled = false;
      statusDiv.textContent += "\nDone!";
    }
  });
});
