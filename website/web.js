chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    loadTheme();
    setActive('Profiles');
    loadProfiles();

    document.getElementById('Profiles').addEventListener('click', () => {
        setActive('Profiles');
        showSection('ProfilesSection');
        loadProfiles();
    });
    document.getElementById('Jobs').addEventListener('click', () => {
        setActive('Jobs');
        showSection('JobsSection');
    });
    document.getElementById('Messages').addEventListener('click', () => {
        setActive('Messages');
        showSection('MessagesSection');
        loadGeneratedMessage();
    });
    document.getElementById('Settings').addEventListener('click', () => {
        setActive('Settings');
        showSection('SettingsSection');
        loadSettings();
    });
});

async function loadGeneratedMessage() {
    const messages = await getGeneratedMessage();
    const messagesSection = document.getElementById('MessagesSection');
    messagesSection.innerHTML = messages.map(message => `
        <div class="message-card">
            <div class="message-header">
                <div class="message-header-left">
                    <h3>To: ${message.RecipientName}</h3>
                    <p>Type: ${message.messageType}</p>
                </div>
                <div class="message-header-right">
                    <p>Generated: ${new Date(message.timestamp).toLocaleDateString()}</p>
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
    const clientProfileSection = document.getElementById('clientProfileSection');
    
    clientProfileSection.innerHTML = `
        <h2>Your LinkedIn Profile</h2>
        <div class="client-profile-card">
            <div class="profile-header">
                <div class="profile-info">
                    <h3>${clientProfile.name || 'Unknown Name'}</h3>
                    <p class="headline">${clientProfile.headline || 'No title'}</p>
                    <p class="location">${clientProfile.location || 'No location'}</p>
                </div>
                <div class="profile-meta">
                    <p class="timestamp">Last updated: ${new Date(clientProfile.savedAt).toLocaleDateString()}</p>
                    <button class="open-profile-btn primary-button" data-timestamp="${clientProfile.savedAt}">View on LinkedIn</button>
                </div>
            </div>
            <div class="profile-about">
                <h4>About</h4>
                <p>${clientProfile.about || 'No about section available'}</p>
            </div>
        </div>
    `;

    // Add event listeners
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const selectedApi = document.getElementById('aiApiSelect').value;
        const apiKey = document.getElementById('aiApiKey').value;
        saveAIApiKey(selectedApi, apiKey);
        document.getElementById('aiApiKey').value = '';
        document.getElementById('aiApiSelect').value = 'gemini';
    });

    // open the clints profile on linkedin
    document.querySelector('#clientProfileSection .open-profile-btn').addEventListener('click', (e) => {
        console.log("Opening client profile on LinkedIn");
        chrome.tabs.create({ url: "https://www.linkedin.com/in/me/" });
    });

    // Add event listener for theme selection
    document.getElementById('themeSelect').addEventListener('change', function(e) {
        const color = e.target.value;
        changeTheme(color);
        // Save the selected theme
        chrome.storage.local.set({ 'theme': color });
    });

    // Load saved theme
    chrome.storage.local.get('theme', function(result) {
        if (result.theme) {
            document.getElementById('themeSelect').value = result.theme;
            changeTheme(result.theme);
        }
    });

    // Add this event listener
    document.getElementById('testApiKeysBtn').addEventListener('click', async () => {
        try {
            const geminiKey = await getAIApiKey('gemini');
            const chatgptKey = await getAIApiKey('chatgpt');
            const claudeKey = await getAIApiKey('claude');

            console.log('Saved API Keys:', {
                'Gemini': geminiKey || 'Not set',
                'ChatGPT': chatgptKey || 'Not set',
                'Claude': claudeKey || 'Not set'
            });
        } catch (error) {
            console.error('Error fetching API keys:', error);
        }
    });
}

async function loadProfiles() {
    const profiles = await getProfiles();
    const profilesContainer = document.querySelector('.profiles-container');

    if (profiles.length === 0) {
        profilesContainer.innerHTML = '<p>No profiles saved yet</p>';
        return;
    }

    profilesContainer.innerHTML = profiles.map(profile => `
        <div class="client-profile-card">
            <div class="profile-header">
                <div class="profile-info">
                    <h3>${profile.name || 'Unknown Name'}</h3>
                    <p class="headline">${profile.headline || 'No title'}</p>
                    <p class="location">${profile.location || 'No location'}</p>
                </div>
                <div class="profile-meta">
                    <p class="timestamp">Saved: ${new Date(profile.savedAt).toLocaleDateString()}</p>
                    <div class="profile-actions">
                        <button class="open-profile-btn primary-button" data-timestamp="${profile.savedAt}">View on LinkedIn</button>
                        <button class="delete-profile-btn secondary-button" data-timestamp="${profile.savedAt}">Delete</button>
                    </div>
                </div>
            </div>
            <div class="profile-about">
                <h4>About</h4>
                <p>${profile.about || 'No about section available'}</p>
            </div>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.open-profile-btn').forEach(button => {
        button.addEventListener('click', () => {
            try {
                openProfileUrl(button.getAttribute('data-timestamp'));
            } catch (error) {
                console.error('Error opening profile:', error);
            }
        });
    });

    document.querySelectorAll('.delete-profile-btn').forEach(button => {
        button.addEventListener('click', () => {
            console.log("Deleting profile:", button.getAttribute('data-timestamp'));
            try {
                deleteProfile(button.getAttribute('data-timestamp'));
                window.location.reload();
            } catch (error) {
                console.error('Error deleting profile:', error);
            }
        });
    });
}

function setActive(buttonid) {
    document.getElementById(buttonid).classList.add('active');
    document.querySelectorAll('.nav-button').forEach(button => {
        if (button.id !== buttonid) {
            button.classList.remove('active');
        }
    });
}

chrome.runtime.onMessage.addListener((message) => {
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

async function openProfileUrl(timestamp) {
    const profile = await getSpecificProfile(timestamp);
    if (profile && profile.profileURL) {
        chrome.tabs.create({ url: profile.profileURL });
    } else {
        console.error('Profile or URL not found for timestamp:', timestamp);
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

function loadTheme() {
    chrome.storage.local.get('theme', function(result) {
        if (result.theme) {
            changeTheme(result.theme);
        }
    });
}

function changeTheme(primaryColor) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    
    // Calculate darker shade for hover states
    const darkerShade = adjustColor(primaryColor, -20);
    root.style.setProperty('--primary-color-dark', darkerShade);
    
    // Calculate lighter shade for backgrounds
    root.style.setProperty('--primary-color-light', `${primaryColor}1A`); // 10% opacity
}

// Helper function to adjust color brightness
function adjustColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}