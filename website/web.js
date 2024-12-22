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
    
    // Get unique recipients and message types
    const recipients = [...new Set(messages.map(m => m.RecipientName))];
    const messageTypes = [...new Set(messages.map(m => m.messageType))];
    
    // Populate filter dropdowns
    const recipientFilter = document.getElementById('recipientFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    recipientFilter.innerHTML = `
        <option value="">All Recipients</option>
        ${recipients.map(recipient => `
            <option value="${recipient}">${recipient}</option>
        `).join('')}
    `;
    
    typeFilter.innerHTML = `
        <option value="">All Message Types</option>
        ${messageTypes.map(type => `
            <option value="${type}">${type}</option>
        `).join('')}
    `;
    
    // Function to filter and display messages
    function filterAndDisplayMessages() {
        const selectedRecipient = recipientFilter.value;
        const selectedType = typeFilter.value;
        
        const filteredMessages = messages.filter(message => {
            const recipientMatch = !selectedRecipient || message.RecipientName === selectedRecipient;
            const typeMatch = !selectedType || message.messageType === selectedType;
            return recipientMatch && typeMatch;
        });
        
        // Create or get messages container
        const messagesContainer = messagesSection.querySelector('.messages-container') || 
            messagesSection.appendChild(document.createElement('div'));
        messagesContainer.className = 'messages-container';
        
        if (filteredMessages.length === 0) {
            // Show empty state message
            messagesContainer.innerHTML = `
                <div class="message-card empty-state">
                    <div class="message-header">
                        <div class="message-header-left">
                            <h3><i class="fas fa-inbox"></i> No Messages</h3>
                        </div>
                    </div>
                    <div class="message-body">
                        <p>No generated messages found. Messages will appear here after you generate them from LinkedIn profiles.</p>
                    </div>
                </div>
            `;
        } else {
            // Group messages by recipient
            const messagesByRecipient = filteredMessages.reduce((acc, message) => {
                if (!acc[message.RecipientName]) {
                    acc[message.RecipientName] = [];
                }
                acc[message.RecipientName].push(message);
                return acc;
            }, {});

            // Display messages grouped by recipient
            messagesContainer.innerHTML = Object.entries(messagesByRecipient).map(([recipient, messages]) => `
                <div class="message-group">
                    <div class="message-group-header">
                        <h3>${recipient}</h3>
                        <button class="delete-all-btn secondary-button" data-recipient="${recipient}">
                            <i class="fas fa-trash-alt"></i> Delete All Messages
                        </button>
                    </div>
                    ${messages.map(message => `
                        <div class="message-card">
                            <div class="message-header">
                                <div class="message-header-left">
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
                    `).join('')}
                </div>
            `).join('');

            // Add event listeners for delete all buttons
            document.querySelectorAll('.delete-all-btn').forEach(button => {
                button.addEventListener('click', async () => {
                    const recipient = button.getAttribute('data-recipient');
                    if (confirm(`Are you sure you want to delete all messages for ${recipient}?`)) {
                        await deleteGeneratedMessage(recipient);
                        loadGeneratedMessage(); // Reload messages
                    }
                });
            });
        }
    }
    
    // Add event listeners to filters
    recipientFilter.addEventListener('change', filterAndDisplayMessages);
    typeFilter.addEventListener('change', filterAndDisplayMessages);
    
    // Initial display
    filterAndDisplayMessages();
}

async function loadSettings() {
    const clientProfile = await getClientProfile();
    const clientProfileSection = document.getElementById('clientProfileSection');
    
    clientProfileSection.innerHTML = `
        <div class="client-profile-header">
            <h2><i class="fas fa-user-circle"></i> Your LinkedIn Profile</h2>
            <button id="refreshProfileBtn" class="secondary-button">
                <i class="fas fa-sync-alt"></i> Refresh Profile Data
            </button>
        </div>
        <div class="client-profile-card">
            <div class="profile-header">
                <div class="profile-info">
                    <h3>${clientProfile.name || 'Unknown Name'}</h3>
                    <p class="headline"><i class="fas fa-briefcase"></i> ${clientProfile.headline || 'No title'}</p>
                    <p class="location"><i class="fas fa-map-marker-alt"></i> ${clientProfile.location || 'No location'}</p>
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
        if (apiKey.length > 0) {
            saveAIApiKey(selectedApi, apiKey);
            document.getElementById('aiApiKey').value = '';
            document.getElementById('aiApiSelect').value = 'gemini';
        } else {
            console.error('Cannot save empty API key');
            alert('Cannot save empty API key');
        }
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

    // Add refresh profile event listener
    document.getElementById('refreshProfileBtn').addEventListener('click', async () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.runtime.sendMessage({ 
                action: "OPEN_LINKEDIN",
                tabId: tabs[0].id 
            }, async (response) => {
                if (response && response.success) {
                    console.log("Profile scraped successfully");
                    await saveClientProfile(response.profileData);
                    loadSettings(); // Reload the settings section
                } else {
                    console.error("Failed to scrape profile");
                    alert("Failed to update profile. Please make sure you're logged into LinkedIn.");
                }
            });
        });
    });
}

async function loadProfiles() {
    const profiles = await getProfiles();
    const profilesContainer = document.querySelector('.profiles-container');

    // Function to filter profiles
    function filterProfiles(searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase();
        return profiles.filter(profile => 
            profile.name.toLowerCase().includes(normalizedSearch)
        );
    }

    // Function to render profiles
    function renderProfiles(filteredProfiles) {
        if (filteredProfiles.length === 0) {
            profilesContainer.innerHTML = `
                <div class="message-card empty-state">
                    <div class="message-header">
                        <div class="message-header-left">
                            <h3><i class="fas fa-user-circle"></i> No Matching Profiles</h3>
                        </div>
                    </div>
                    <div class="message-body">
                        <p>No profiles match your search criteria.</p>
                    </div>
                </div>`;
            return;
        }

        // Group profiles by connection type
        const groupedProfiles = filteredProfiles.reduce((acc, profile) => {
            const type = profile.connectionType || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(profile);
            return acc;
        }, {});

        // Create HTML for each group
        const groupsHTML = Object.entries(groupedProfiles).map(([type, profiles]) => `
            <div class="profile-group">
                <div class="profile-group-header" data-type="${type}">
                    <h2>
                        <i class="fas ${getConnectionTypeIcon(type)}"></i>
                        ${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                        <span class="profile-count">(${profiles.length})</span>
                    </h2>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
                <div class="profile-group-content" id="group-${type}">
                    ${profiles.map(profile => `
                        <div class="client-profile-card">
                            <div class="profile-header">
                                <div class="profile-info">
                                    <h3><i class="fas fa-user"></i> ${profile.name || 'Unknown Name'}</h3>
                                    <p class="headline"><i class="fas fa-briefcase"></i> ${profile.headline || 'No title'}</p>
                                    <p class="location"><i class="fas fa-map-marker-alt"></i> ${profile.location || 'No location'}</p>
                                </div>
                                <div class="profile-meta">
                                    <p class="timestamp"><i class="far fa-clock"></i> Saved: ${new Date(profile.savedAt).toLocaleDateString()}</p>
                                    <div class="profile-actions">
                                        <div class="profile-actions-top">
                                            <button class="update-profile-btn primary-button" data-timestamp="${profile.savedAt}">
                                                <i class="fas fa-sync-alt"></i> Update
                                            </button>
                                            <button class="open-profile-btn primary-button" data-timestamp="${profile.savedAt}">
                                                <i class="fas fa-external-link-alt"></i> View on LinkedIn
                                            </button>
                                        </div>
                                        <div class="profile-actions-bottom">
                                            <button class="delete-profile-btn secondary-button" data-timestamp="${profile.savedAt}">
                                                <i class="fas fa-trash-alt"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="profile-about">
                                <h4>About</h4>
                                <p>${profile.about || 'No about section available'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        profilesContainer.innerHTML = groupsHTML;

        // Add event listeners for group toggles
        document.querySelectorAll('.profile-group-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.toggle-icon');
                
                content.classList.toggle('collapsed');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });

        // Add event listeners for profile actions
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
                try {
                    deleteProfile(button.getAttribute('data-timestamp'));
                    window.location.reload();
                } catch (error) {
                    console.error('Error deleting profile:', error);
                }
            });
        });

        // Add event listener for update button
        document.querySelectorAll('.update-profile-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const timestamp = button.getAttribute('data-timestamp');
                const profile = await getSpecificProfile(timestamp);
                
                if (profile && profile.profileURL) {
                    // Show loading state
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                    button.disabled = true;

                    // Send message to background script to scrape profile
                    chrome.runtime.sendMessage({ 
                        action: "UPDATE_PROFILE",
                        profileUrl: profile.profileURL,
                        timestamp: timestamp
                    }, async (response) => {
                        if (response && response.success) {
                            // Update the profile with new data while preserving timestamp and URL
                            await updateProfile(timestamp, response.profileData);
                            loadProfiles(); // Reload all profiles
                        } else {
                            console.error("Failed to update profile");
                            alert("Failed to update profile. Please make sure you're logged into LinkedIn.");
                            // Reset button state
                            button.innerHTML = '<i class="fas fa-sync-alt"></i> Update';
                            button.disabled = false;
                        }
                    });
                }
            });
        });
    }

    // Add search input event listener
    const searchInput = document.getElementById('profileSearchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        const filteredProfiles = filterProfiles(searchTerm);
        renderProfiles(filteredProfiles);
    });

    // Initial render
    renderProfiles(profiles);
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

function getConnectionTypeIcon(type) {
    const iconMap = {
        'first': 'fa-user-friends',
        'second': 'fa-users',
        'third': 'fa-user-plus',
        'recruiter': 'fa-headhunter',
        'other': 'fa-user-circle'
    };
    return iconMap[type] || 'fa-user';
}