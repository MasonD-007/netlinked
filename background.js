console.log("Background script loaded");

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
        console.log(message);
        async function handleMessageGeneration() {
            try {
                if (!message.ClientData || !message.RecipientData) {
                    console.error("Missing required profile data");
                    sendResponse({ success: false, error: "Missing profile data" });
                    return;
                }

                if (!message.apiKey) {
                    console.error("Missing API key");
                    sendResponse({ success: false, error: "API key not found" });
                    return;
                }

                const generatedMessage = await genMessage(message.ClientData, message.RecipientData, message.template, "gemini-1.5-flash", message.apiKey);
                if (!generatedMessage) {
                    throw new Error("No message was generated");
                }
                sendResponse({ message: generatedMessage, success: true });
            } catch (error) {
                console.error("Error during message generation:", error);
                sendResponse({ success: false, error: error.message });
            }
        }
        handleMessageGeneration();
        return true; // Keep the message channel open for async response
    }
    else if (message.action === "generateSummary") {
        console.log("Generating summary");
        async function handleSummaryGeneration() {
            try {
                if (!message.profileData || !message.ClientData) {
                    console.error("Missing required profile data");
                    sendResponse({ success: false, error: "Missing profile data" });
                    return;
                }

                if (!message.apiKey) {
                    console.error("Missing API key");
                    sendResponse({ success: false, error: "API key not found" });
                    return;
                }

                const generatedSummary = await generateSummary(
                    message.profileData,
                    "gemini-1.5-flash",
                    message.apiKey,
                    message.ClientData
                );
                sendResponse({ summary: generatedSummary, success: true });
            } catch (error) {
                console.error("Error during summary generation:", error);
                sendResponse({ success: false, error: error.message });
            }
        }
        handleSummaryGeneration();
        return true; // Keep the message channel open for async response
    }
    else if (message.action === "OPEN_LINKEDIN") {
        console.log("Opening LinkedIn");
        chrome.tabs.create({ url: "https://www.linkedin.com/in/me/" }, (tab) => {
            // Wait for the tab to finish loading
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    // Now execute the scraping
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['scrapeprofile/scraper.js']
                    }, () => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: async () => {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                const result = await scrapeLinkedInProfile();
                                return result;
                            }
                        }, (results) => {
                            const profileData = results[0].result;
                            
                            async function handleSkillsScraping() {
                                try {
                                    await loadSkillPage(tab.id);
                                    const results = await chrome.scripting.executeScript({
                                        target: { tabId: tab.id },
                                        func: scrapeSkills
                                    });
                                    const skills = results[0].result;
                                    profileData.skills = skills;
                                    
                                    // Close the LinkedIn tab
                                    chrome.tabs.remove(tab.id);
                                    
                                    // Send response with profile data
                                    sendResponse({ profileData: profileData, success: true });
                                } catch (error) {
                                    console.error("Error during skills scraping:", error);
                                    sendResponse({ success: false });
                                }
                            }

                            handleSkillsScraping();
                        });
                    });
                }
            });
        });
        return true; // Keep the message channel open
    } 
    else if (message.action === "UPDATE_PROFILE") {
        console.log("Updating profile");
        chrome.tabs.create({ url: message.profileUrl }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    console.log("Profile URL loaded");
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['scrapeprofile/scraper.js']
                    }, () => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: async () => {
                                const result = await scrapeLinkedInProfile();
                                return result;
                            }
                        }, (results) => {
                            const profileData = results[0].result;
                            async function handleSkillsScraping() {
                                try {
                                    const originalUrl = await loadSkillPage(tab.id);
                                    const results = await chrome.scripting.executeScript({
                                        target: { tabId: tab.id },
                                        func: scrapeSkills
                                    });
                                    const skills = results[0].result;
                                    profileData.skills = skills;
                                    
                                    if (originalUrl) {
                                        chrome.tabs.update(tab.id, { url: originalUrl });
                                    }
                                    
                                    sendResponse({ profileData: profileData, success: true });
                                } catch (error) {
                                    console.error("Error during skills scraping:", error);
                                    sendResponse({ profileData: profileData, success: false });
                                }
                            }
                            handleSkillsScraping();
                        });
                    });
                }
            });
        });
        return true; // Keep the message channel open
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
async function genMessage(ClientData, RecipientData, template, model, apiKey) {
    if (!ClientData || !RecipientData || !template || !apiKey) {
        throw new Error("Missing required data for message generation");
    }

    try {
        const message = await callGemini(ClientData, RecipientData, template, model, apiKey);
        if (!message) {
            throw new Error("Failed to generate message content");
        }
        return message;
    } catch (error) {
        console.error("Error in genMessage:", error);
        throw new Error(`Failed to generate message: ${error.message}`);
    }
}

async function callGemini(ClientData, RecipientData, template, model, apiKey) {
    console.log("Calling Gemini with model:", model);
    
    let prompt;
    if (typeof template === 'object' && template.content) {
        // Template-based message
        prompt = `
        You are enhancing a template message for LinkedIn based on the following information:

        Rules:
        - Keep the message professional but friendly
        - Maintain the original template's structure and intent
        - Personalize the message using the provided profile information
        - Keep the word count under 300 characters
        - Replace any placeholders with appropriate information

        Template Content:
        ${template.content}

        Client (Sender) Information:
        - Name: ${ClientData.name || 'Not provided'}
        - Headline: ${ClientData.headline || 'Not provided'}
        - Current Role: ${ClientData.currentRole || 'Not provided'}
        - Skills: ${ClientData.skills ? ClientData.skills.map(s => s.skill).join(', ') : 'Not provided'}

        Recipient Information:
        - Name: ${RecipientData.name || 'Not provided'}
        - Headline: ${RecipientData.headline || 'Not provided'}
        - Current Role: ${RecipientData.currentRole || 'Not provided'}
        - Skills: ${RecipientData.skills ? RecipientData.skills.map(s => s.skill).join(', ') : 'Not provided'}

        Please enhance and personalize this template message while maintaining its original intent.`;
    } else {
        // AI-generated message
        prompt = `
        You are writing a personalized message on LinkedIn based on the following information:

        Rules:
        - The message should be professional but friendly, and reference their shared professional interests or skills where relevant.
        - Keep the message concise and engaging.
        - The word count cant be more than 300 characters.

        Client (Sender) Information:
        - Name: ${ClientData.name || 'Not provided'}
        - Headline: ${ClientData.headline || 'Not provided'}
        - Current Role: ${ClientData.currentRole || 'Not provided'}
        - Skills: ${ClientData.skills ? ClientData.skills.map(s => s.skill).join(', ') : 'Not provided'}

        Recipient Information:
        - Name: ${RecipientData.name || 'Not provided'}
        - Headline: ${RecipientData.headline || 'Not provided'}
        - Current Role: ${RecipientData.currentRole || 'Not provided'}
        - Skills: ${RecipientData.skills ? RecipientData.skills.map(s => s.skill).join(', ') : 'Not provided'}

        Template Type: ${template}

        Write a personalized ${template} message from ${ClientData.name || 'the sender'} to ${RecipientData.name || 'the recipient'}. 
        Make it professional but friendly, and reference their shared professional interests or skills where relevant.
        Keep the message concise and engaging.`;
    }

    try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "contents": [{ 
                    "parts": [{ 
                        "text": prompt 
                    }] 
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("Gemini response:", data);
        
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Invalid response format from Gemini API");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error in callGemini:", error);
        throw new Error(`API call failed: ${error.message}`);
    }
}

//End of generate message

async function generateSummary(profileData, model, apiKey, ClientData) {
    if (!profileData || !apiKey) {
        throw new Error("Missing required data for summary generation");
    }

    if (!ClientData) {
        throw new Error("Client profile data is required for comparison");
    }

    const prompt = `
    Analyze this LinkedIn profile in relation to the client's profile and create a bullet-point summary to help decide if they want to connect with this person.
    
    Format your response in these exact sections with bullet points:
    
    Current Role & Level:
    • [Current position and seniority level]
    • [Years of experience if available]
    
    Key Skills & Expertise:
    • [List 3-4 most relevant skills]
    
    Notable Achievements:
    • [List 1-2 standout achievements or experiences]
    
    Connection Value:
    • [1-2 points on why they might be a valuable connection based on shared interests/skills]
    • [Any unique value they could bring to your network]

    Keep each bullet point concise and focus on what makes this person interesting as a potential connection.
    Do not use any markdown formatting like asterisks or bold text.
    Highlight any overlapping skills, industries, or experiences between the profiles.

    Client (Your) Profile Information:
    - Name: ${ClientData.name}
    - Headline: ${ClientData.headline}
    - Current Role: ${ClientData.currentRole}
    - Skills: ${ClientData.skills ? ClientData.skills.map(s => s.skill).join(', ') : 'Not provided'}

    Target Profile Information:
    - Name: ${profileData.name}
    - Headline: ${profileData.headline}
    - Current Role: ${profileData.currentRole}
    - Location: ${profileData.location}
    - About: ${profileData.about}
    - Experience: ${JSON.stringify(profileData.experience)}
    - Skills: ${profileData.skills ? profileData.skills.map(s => s.skill).join(', ') : 'Not provided'}
    `;

    try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "contents": [{ 
                    "parts": [{ 
                        "text": prompt 
                    }] 
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Invalid response format from Gemini API");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error in generateSummary:", error);
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
}

//End of generate summary

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // Open the website with welcome message and API key setup
        chrome.tabs.create({
            url: chrome.runtime.getURL("website/web.html?setup=true")
        }, (tab) => {
            // Show welcome message after the tab is created
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, {
                    type: "SHOW_WELCOME_MESSAGE",
                    setup: true
                });
            }, 1000);
        });
    }
});