chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    setActive('Profiles');
    loadProfiles();

    document.getElementById('Profiles').addEventListener('click', () => {
        document.getElementById('mainContent').classList.remove('hidden');
        setActive('Profiles');
        console.log("switched to profiles");
        document.getElementById('mainContentHeader').innerHTML = '';
        loadProfiles();
    });
    document.getElementById('Jobs').addEventListener('click', () => {
        document.getElementById('mainContent').classList.remove('hidden');
        setActive('Jobs');
        console.log("switched to jobs");
        document.getElementById('mainContentHeader').innerHTML = '<h1>IN DEVELOPMENT</h1>';
    });
    document.getElementById('Messages').addEventListener('click', () => {
        document.getElementById('mainContent').classList.remove('hidden');
        setActive('Messages');
        console.log("switched to messages");
        document.getElementById('mainContentHeader').innerHTML = '';
        loadGeneratedMessage();
    });
    document.getElementById('Settings').addEventListener('click', () => {
        document.getElementById('mainContent').classList.remove('hidden');
        setActive('Settings');
        console.log("switched to settings");
        document.getElementById('mainContentHeader').innerHTML = '';
        loadSettings();
    });
});

async function loadGeneratedMessage() {
    document.getElementById('mainContentHeader').textContent = "HELLO WORLD OF MESSAGES";
    const messages = await getGeneratedMessage();
    console.log("Messages:", messages);
    document.getElementById('mainContentHeader').innerHTML = messages.map(message => `
        <div class="message-card">
            <div class="message-header">
                <div class="message-header-left">
                    <h3>To: ${message.RecipientName}</h3>
                    <p>Type: ${message.messageType}</p>
                </div>
                <div class="message-header-right">
                    <p>Sent: ${new Date(message.timestamp).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="message-body">
                <p>${message.message}</p>
            </div>
        </div>
    `).join('');
}

async function loadSettings() {
    const clientProfile = await getClientProfile();
    
    let settingshtml = `
    <div class="settings-container">
        <h1>Settings</h1>
        <div class="settings-section">
            <h3>AI API Selection</h3>
            <div class="select-wrapper">
                <select id="aiApiSelect" class="settings-select">
                    <option value="openai">OpenAI GPT</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="gemini">Google Gemini</option>
                </select>
                <input type="text" id="aiApiKey" placeholder="Enter API Key">
                <button onclick="saveAIApiKey()">Save</button>
            </div>
        </div>
        <div class="settings-section">
            <h3>Client Profile</h3>
                <div class="top-row">
                    <h3>${clientProfile.name || 'Unknown Name'}</h3>
                    <p>Saved: ${new Date(clientProfile.savedAt).toLocaleDateString()}</p>
                    <div class="profile-actions">
                        <button onclick="openProfileUrl(${clientProfile.savedAt})">Open Profile</button>
                    </div>
                </div>
                <div class="bottom-row">
                    <h3>Title</h3>
                    <p>${clientProfile.headline || 'No title'}</p>
                    <h3>Location</h3>
                    <p>${clientProfile.location || 'No location'}</p>
                    <h3>About</h3>
                <p>${clientProfile.about || 'No about'}</p>
            </div>
        </div>
    </div>
    `;
    document.getElementById('mainContentHeader').innerHTML = settingshtml;
    
    // Add event listener for the select
    document.getElementById('aiApiSelect').addEventListener('change', function(e) {
        // Handle the API selection change
        const selectedApi = e.target.value;
        console.log('Selected API:', selectedApi);
        // You can add your logic here to save the selection or perform other actions
        const apiKey = document.getElementById('aiApiKey').value;
        saveAIApiKey(selectedApi, apiKey);
    });
}

async function loadProfiles() {
    const profiles = await getProfiles();
    const mainContent = document.getElementById('mainContentHeader');

    let profilesHTML = '<div class="profiles-container">';

    if (profiles.length === 0) {
        mainContent.innerHTML = '<p>No profiles saved yet</p>';
        return;
    } else {
        profiles.forEach(profile => {
            profilesHTML += `
                <div class="profile-card">
                    <div class="top-row">
                        <h3>${profile.name || 'Unknown Name'}</h3>
                        <p>Saved: ${new Date(profile.savedAt).toLocaleDateString()}</p>
                    </div>
                    <div class="bottom-row">
                        <h3>Title</h3>
                        <p>${profile.headline || 'No title'}</p>
                        <h3>Location</h3>
                        <p>${profile.location || 'No location'}</p>
                        <h3>About</h3>
                        <p>${profile.about || 'No about'}</p>
                    </div>
                    <div class="profile-actions">
                        <button onclick="openProfileUrl(${profile.savedAt})">Open Profile</button>
                        <button onclick="deleteProfile(${profile.savedAt}).then(loadProfiles)">Delete</button>
                    </div>
                </div>
            `;
        });
    }
    profilesHTML += '</div>';
    
    mainContent.innerHTML = profilesHTML;
}

function setActive(buttonid) {
    document.getElementById(buttonid).classList.add('active');
    document.querySelectorAll('.nav-button').forEach(button => {
        if (button.id !== buttonid) {
            button.classList.remove('active');
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SHOW_WELCOME_MESSAGE") {
        showWelcomeDialog();
    }
});

function showWelcomeDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 400px;
        text-align: center;
    `;
    
    dialog.innerHTML = `
        <h2 style="color: #0077b5; margin-bottom: 15px;">Welcome to NetLinked!</h2>
        <p style="margin-bottom: 20px;">To get started, we need to collect your LinkedIn profile data. Please make sure you're logged into LinkedIn.</p>
        <button id="welcomeButton" style="
            background: #0077b5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
        ">Got it!</button>
    `;

    document.body.appendChild(dialog);

    document.getElementById('welcomeButton').addEventListener('click', () => {
        dialog.remove();
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.runtime.sendMessage({ 
                action: "OPEN_LINKEDIN",
                tabId: tabs[0].id 
            }, (response) => {
                if (response && response.success) {
                    console.log("Profile scraped successfully");
                    saveClientProfile(response.profileData).then(() => {
                        loadProfiles();
                    });
                } else {
                    console.error("Failed to scrape profile");
                }
            });
        });
    });
}