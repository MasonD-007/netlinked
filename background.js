console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    if (message.action === "scrapeSkills") {
        loadSkillPage(sender.tab.id)
            .then(originalUrl => {
                if (!originalUrl) {
                    throw new Error("Failed to load skills page");
                }
                
                return new Promise((resolve) => {
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: scrapeSkills
                    }, (results) => {
                        const skills = results[0].result;
                        chrome.tabs.update(sender.tab.id, { url: originalUrl }, () => {
                            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                                if (tabId === sender.tab.id && changeInfo.status === 'complete') {
                                    chrome.tabs.onUpdated.removeListener(listener);
                                    resolve(skills);
                                }
                            });
                        });
                    });
                });
            })
            .then(skills => {
                console.log("Sending skills back to content script:", skills);
                sendResponse(skills);
            })
            .catch(error => {
                console.error("Error in skills scraping process:", error);
                sendResponse({ error: error.message });
            });
            
        return true;
    }
});

function loadSkillPage(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting tab:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }

            const currentUrl = tab.url;
            
            if (currentUrl.includes("/details/skills/")) {
                console.log("Skills URL found");
                setTimeout(() => {
                    resolve(currentUrl);
                }, 1500);
            } else {
                console.log("Opening skills URL");
                const skillsUrl = currentUrl + "/details/skills/";
                
                chrome.tabs.update(tabId, { url: skillsUrl }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                        if (updatedTabId === tabId && changeInfo.status === "complete") {
                            chrome.tabs.onUpdated.removeListener(listener);
                            console.log("Skills URL loaded");
                            setTimeout(() => {
                                resolve(currentUrl);
                            }, 1500);
                        }
                    });
                });
            }
        });
    });
}

function scrapeSkills() {
    const tempSkills = [];

    const skillElements = document.querySelectorAll('[id^="profilePagedListComponent-"][id*="-SKILLS-VIEW-DETAILS-profileTabSection-ALL-SKILLS-NONE-en-US-"]');
    skillElements.forEach((skillElement) => {
        const skillText = skillElement.querySelector('span[aria-hidden="true"]')?.textContent?.trim();
        const skillEndorsement = skillElement.querySelector('div.pvs-entity__sub-components span[aria-hidden="true"]')?.textContent?.trim();
        if (skillText) {
            tempSkills.push({
                skill: skillText,
                endorsement: skillEndorsement
            });
        }
    });
    return tempSkills;
}