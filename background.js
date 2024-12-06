console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    if (message.action === "scrapeSkills") {
        loadSkillPage();
        
        sendResponse(skills);
    }
});

function loadSkillPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const url = tabs[0].url;

        if (url.includes("/details/skills/")) {
            console.log("Skills URL found");
        } else {
            console.log("Opening skills URL");
            chrome.tabs.update(tabs[0].id, { url: url + "/details/skills/" });
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tabId === tabs[0].id && changeInfo.status === "complete") {
                    console.log("Skills URL loaded");
                    scrapeSkills();
                }
            });
        }
    });
}

function scrapeSkills() {
    console.log("Scraping skills");
    const tempSkills = [];

    // Base selector pattern
    const baseId = 'profilePagedListComponent-ACoAAEGrD3wBD7kH-uubIz0CLLfFRaWTbI5fYw4-SKILLS-VIEW-DETAILS-profileTabSection-ALL-SKILLS-NONE-en-US-';
    
    // Try multiple indices
    for (let i = 0; i < 10; i++) {
        const selector = `#${baseId}${i}`;
        const skillElement = document.querySelector(selector);
        
        if (skillElement) {
            const skillText = skillElement.querySelector('span[aria-hidden="true"]')?.textContent?.trim();
            if (skillText) {
                tempSkills.push(skillText);
            }
        }
    }

    console.log("Skills:", tempSkills);
    
    return tempSkills;
}