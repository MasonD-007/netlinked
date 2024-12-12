console.log("Background script loaded");
import config from "./config.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message)
    if (message.action === "scrapeProfile") {
        console.log("Scraping profile");
        
        // Check if sender.tab exists before accessing tab.id
        if (!message.tabId) {
            console.error("Tab ID not found. Message must be sent from a content script.");
            return;
        }
        
        // Execute the scraping script in the context of the active tab
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            files: ['scrapeprofile/scraper.js']
        }, () => {
            // After loading the script, execute the scraping function
            chrome.scripting.executeScript({
                target: { tabId: message.tabId },
                func: async () => {
                    // Add a small delay to ensure the page is fully loaded
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const result = await scrapeLinkedInProfile();
                    return result;
                }
            }, (results) => {
                const profileData = results[0].result;
                // Create an async function to handle the sequential flow
                async function handleSkillsScraping() {
                    try {
                        const originalUrl = await loadSkillPage(message.tabId);
                        // Execute scrapeSkills in the context of the web page
                        const results = await chrome.scripting.executeScript({
                            target: { tabId: message.tabId },
                            func: scrapeSkills
                        });
                        const skills = results[0].result;
                        profileData.skills = skills;
                        chrome.tabs.update(message.tabId, { url: originalUrl });
                        sendResponse({ profileData: profileData, success: true });
                    } catch (error) {
                        console.error("Error during skills scraping:", error);
                        sendResponse({ profileData: profileData, success: false });
                    }
                }

                handleSkillsScraping();
                return true; // Keep the message channel open
            });
        });
        
        return true; // Keep the message channel open for async response
    }
    else if (message.action === "generateMessage") {
        console.log("Generating message");
        async function handleMessageGeneration() {
            try {
                const generatedMessage = await genMessage(message.ClientData);
                //console.log("Message generated:", generatedMessage);
                sendResponse({ message: generatedMessage, success: true });
            } catch (error) {
                console.error("Error during message generation:", error);
                sendResponse({ message: null, success: false });
            }
        }
        handleMessageGeneration();
        return true; // Keep the message channel open for async response
    }
});

//Scrape skills
function loadSkillPage(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting tab:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }

            const originalUrl = tab.url;
            
            if (originalUrl.includes("/details/skills/")) {
                setTimeout(() => {
                    resolve(originalUrl);
                }, 1500);
            } else {
                const skillsUrl = originalUrl + "/details/skills/";
                
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
                                resolve(originalUrl);
                            }, 1500);
                        }
                    });
                });
            }
        });
    });
}

async function scrapeSkills() {
    const tempSkills = [];

    // Remove the document null check since it will always be defined in the page context
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
//End of scrape skills

//Generate message
async function genMessage(ClientData) {
    const message = await callGemini(ClientData);
    return message;
}

async function callGemini(ClientData) { //gemini-2.0-flash-exp
    const apiKey = config.geminiApiKey;
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "contents": [{ "parts": [{ "text": "Write a message to " + ClientData.name + " wishing them a happy birthday." }] }]
        })
    });
    const data = await response.json();
    console.log("Gemini response:", data);
    
    // Check if we have a valid response with candidates
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
}

//End of generate message