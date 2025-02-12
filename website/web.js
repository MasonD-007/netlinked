chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    loadTheme();
    setActive('Profiles');
    loadProfiles();

    document.getElementById('Profiles').addEventListener('click', () => {
        setActive('Profiles');
        showSection('ProfilesSection');
        loadProfiles();
    });
    document.getElementById('Chat').addEventListener('click', async () => {
        setActive('Chat');
        showSection('ChatSection');
        await loadChatProfiles();
    });
    document.getElementById('Messages').addEventListener('click', () => {
        setActive('Messages');
        showSection('MessagesSection');
        loadGeneratedMessage();
    });
    document.getElementById('Templates').addEventListener('click', () => {
        setActive('Templates');
        showSection('TemplatesSection');
        loadTemplates();
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
    chrome.storage.local.get(['theme', 'darkMode'], function(result) {
        if (result.theme) {
            document.getElementById('themeSelect').value = result.theme;
            changeTheme(result.theme);
        }
        if (result.darkMode) {
            document.getElementById('darkModeToggle').checked = result.darkMode;
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    });

    // Add dark mode toggle listener
    document.getElementById('darkModeToggle').addEventListener('change', function(e) {
        const isDarkMode = e.target.checked;
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        chrome.storage.local.set({ 'darkMode': isDarkMode });
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

    // Add delete profiles event listener
    document.getElementById('deleteProfilesBtn').addEventListener('click', async () => {
        const confirmDelete = confirm('Are you sure you want to delete all saved LinkedIn profiles? This action cannot be undone.');
        if (confirmDelete) {
            try {
                // Get all keys from storage
                const result = await chrome.storage.local.get(null);
                const keys = Object.keys(result);
                
                // Filter keys to delete (only profiles)
                const keysToDelete = keys.filter(key => key.startsWith('profile_'));
                
                // Delete the filtered keys
                await chrome.storage.local.remove(keysToDelete);
                
                // Show success message
                alert('All profiles have been deleted successfully.');
                
                // Reload the page to reflect changes
                window.location.reload();
            } catch (error) {
                console.error('Error deleting profiles:', error);
                alert('An error occurred while deleting profiles. Please try again.');
            }
        }
    });

    // Add delete messages event listener
    document.getElementById('deleteMessagesBtn').addEventListener('click', async () => {
        const confirmDelete = confirm('Are you sure you want to delete all generated messages? This action cannot be undone.');
        if (confirmDelete) {
            try {
                await chrome.storage.local.remove('generatedMessages');
                
                // Show success message
                alert('All messages have been deleted successfully.');
                
                // Reload the page to reflect changes
                window.location.reload();
            } catch (error) {
                console.error('Error deleting messages:', error);
                alert('An error occurred while deleting messages. Please try again.');
            }
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

    // Add feedback button event listener
    document.getElementById('openFeedbackBtn').addEventListener('click', showFeedbackDialog);
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
                console.log("Profile:", profile);
                console.log("Profile URL:", profile.profileURL);
                
                if (profile && profile.profileURL) {
                    // Show loading state
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
                    button.disabled = true;

                    chrome.tabs.create({ url: profile.profileURL }, function(tab) {
                        // Send message to background script to scrape profile
                        chrome.runtime.sendMessage({ 
                            action: "scrapeProfile",
                            tabId: tab.id
                        }, async (response) => {
                            if (response && response.success) {
                                // Update the profile with new data while preserving timestamp and URL
                                console.log("Updated profile data:", response.profileData);
                                await updateProfile(timestamp, response.profileData);
                                loadProfiles(); // Reload all profiles
                            } else {
                                console.error("Failed to update profile");
                                alert("Failed to update profile. I don't know what you can do about this.");
                                // Reset button state
                                button.innerHTML = '<i class="fas fa-sync-alt"></i> Update';
                                button.disabled = false;
                            }
                            chrome.tabs.remove(tab.id);
                        });
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
    dialog.className = 'welcome-dialog';
    
    dialog.innerHTML = `
        <div class="welcome-step" id="welcomeStep1">
            <h2>Welcome to NetLinked!</h2>
            <p>Let's get you set up with everything you need to use NetLinked effectively.</p>
            <button id="welcomeNextButton" class="welcome-button">Get Started</button>
        </div>
        
        <div class="welcome-step hidden" id="welcomeStep2">
            <h2>Set Up Your API Key</h2>
            <p>NetLinked uses Google's Gemini AI to generate personalized messages. You'll need a Gemini API key to continue.</p>
            <div class="api-input-container">
                <input type="password" id="welcomeApiKeyInput" placeholder="Enter your Gemini API key" class="welcome-input">
                <a href="https://makersuite.google.com/app/apikey" target="_blank" class="get-key-link">Get an API key</a>
            </div>
            <button id="saveWelcomeApiKey" class="welcome-button">Save & Continue</button>
        </div>

        <div class="welcome-step hidden" id="welcomeStep3">
            <h2>Let's Get Your Profile</h2>
            <p>Now we'll need to get your LinkedIn profile information to personalize your messages.</p>
            <button id="welcomeProfileButton" class="welcome-button">Get My Profile</button>
        </div>
    `;

    document.body.appendChild(dialog);

    // Step 1 to Step 2
    document.getElementById('welcomeNextButton').addEventListener('click', () => {
        document.getElementById('welcomeStep1').classList.add('hidden');
        document.getElementById('welcomeStep2').classList.remove('hidden');
    });

    // Step 2 to Step 3
    document.getElementById('saveWelcomeApiKey').addEventListener('click', async () => {
        const apiKey = document.getElementById('welcomeApiKeyInput').value;
        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }

        try {
            await saveAIApiKey('gemini', apiKey);
            document.getElementById('welcomeStep2').classList.add('hidden');
            document.getElementById('welcomeStep3').classList.remove('hidden');
        } catch (error) {
            console.error('Error saving API key:', error);
            alert('Failed to save API key. Please try again.');
        }
    });

    // Step 3: Get LinkedIn Profile
    document.getElementById('welcomeProfileButton').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.runtime.sendMessage({ 
                action: "OPEN_LINKEDIN",
                tabId: tabs[0].id 
            }, async (response) => {
                if (response && response.success) {
                    console.log("Profile scraped successfully");
                    await saveClientProfile(response.profileData);
                    dialog.remove();
                    loadProfiles();
                } else {
                    console.error("Failed to scrape profile");
                    alert("Failed to get your profile. Please make sure you're logged into LinkedIn.");
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
    updateNewTemplateButton(sectionId);
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

async function loadTemplates() {
    const templates = await getTemplates();
    const templatesContainer = document.querySelector('.templates-container');
    
    // Function to filter templates
    function filterTemplates(typeFilter, lengthFilter) {
        return templates.filter(template => {
            const typeMatch = !typeFilter || template.type === typeFilter;
            const lengthMatch = !lengthFilter || template.length === lengthFilter;
            return typeMatch && lengthMatch;
        });
    }

    // Function to render templates
    function renderTemplates(filteredTemplates) {
        if (filteredTemplates.length === 0) {
            templatesContainer.innerHTML = `
                <div class="message-card empty-state">
                    <div class="message-header">
                        <div class="message-header-left">
                            <h3><i class="fas fa-file-alt"></i> No Templates</h3>
                        </div>
                    </div>
                    <div class="message-body">
                        <p>No message templates found. Add templates to quickly send personalized messages on LinkedIn.</p>
                    </div>
                </div>`;
            return;
        }

        templatesContainer.innerHTML = filteredTemplates.map(template => `
            <div class="template-card" data-id="${template.id}">
                <div class="template-header">
                    <div class="template-info">
                        <h3>${template.name}</h3>
                        <div class="template-meta">
                            <span><i class="fas fa-tag"></i> ${template.type}</span>
                            <span><i class="fas fa-ruler"></i> ${template.length}</span>
                            <span><i class="fas fa-clock"></i> Created ${new Date(template.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="template-content">
                    ${template.content}
                </div>
                <div class="template-actions">
                    <button class="edit-template-btn secondary-button" data-id="${template.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-template-btn secondary-button" data-id="${template.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                    <button class="use-template-btn primary-button" data-id="${template.id}">
                        <i class="fas fa-paper-plane"></i> Use Template
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for template actions
        document.querySelectorAll('.delete-template-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const templateId = button.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this template?')) {
                    await deleteTemplate(templateId);
                    loadTemplates();
                }
            });
        });

        document.querySelectorAll('.edit-template-btn').forEach(button => {
            button.addEventListener('click', () => {
                const templateId = button.getAttribute('data-id');
                const template = filteredTemplates.find(t => t.id === templateId);
                if (template) {
                    showTemplateEditDialog(template);
                }
            });
        });

        document.querySelectorAll('.use-template-btn').forEach(button => {
            button.addEventListener('click', () => {
                const templateId = button.getAttribute('data-id');
                const template = filteredTemplates.find(t => t.id === templateId);
                if (template) {
                    // Copy template content to clipboard
                    navigator.clipboard.writeText(template.content).then(() => {
                        alert('Template copied to clipboard!');
                    });
                }
            });
        });
    }

    // Get unique template types for filter
    const templateTypes = [...new Set(templates.map(t => t.type))];
    const typeFilter = document.getElementById('templateTypeFilter');
    typeFilter.innerHTML = `
        <option value="">All Template Types</option>
        ${templateTypes.map(type => `
            <option value="${type}">${type}</option>
        `).join('')}
    `;

    // Add filter event listeners
    const lengthFilter = document.getElementById('templateLengthFilter');
    typeFilter.addEventListener('change', () => {
        const filteredTemplates = filterTemplates(typeFilter.value, lengthFilter.value);
        renderTemplates(filteredTemplates);
    });
    lengthFilter.addEventListener('change', () => {
        const filteredTemplates = filterTemplates(typeFilter.value, lengthFilter.value);
        renderTemplates(filteredTemplates);
    });

    // Initial render
    renderTemplates(templates);
}

function showTemplateEditDialog(template = null) {
    const dialog = document.createElement('div');
    dialog.className = 'template-dialog';
    
    dialog.innerHTML = `
        <h2>${template ? 'Edit Template' : 'New Template'}</h2>
        <div class="template-dialog-field">
            <label>Name</label>
            <input type="text" id="templateName" value="${template?.name || ''}">
        </div>
        <div class="template-dialog-field">
            <label>Type</label>
            <input type="text" id="templateType" value="${template?.type || ''}" placeholder="e.g., Connection Request, Follow-up, etc.">
        </div>
        <div class="template-dialog-field">
            <label>Length</label>
            <select id="templateLength">
                <option value="short" ${template?.length === 'short' ? 'selected' : ''}>Short</option>
                <option value="medium" ${template?.length === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="long" ${template?.length === 'long' ? 'selected' : ''}>Long</option>
            </select>
        </div>
        <div class="template-dialog-field">
            <label>Content</label>
            <textarea id="templateContent" placeholder="Enter your message template here...">${template?.content || ''}</textarea>
        </div>
        <div class="template-dialog-actions">
            <button id="cancelTemplateBtn" class="secondary-button">Cancel</button>
            <button id="saveTemplateBtn" class="primary-button">Save Template</button>
        </div>
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    document.getElementById('cancelTemplateBtn').addEventListener('click', () => {
        dialog.remove();
    });

    document.getElementById('saveTemplateBtn').addEventListener('click', async () => {
        const templateData = {
            name: document.getElementById('templateName').value,
            type: document.getElementById('templateType').value,
            length: document.getElementById('templateLength').value,
            content: document.getElementById('templateContent').value
        };

        if (!templateData.name || !templateData.type || !templateData.content) {
            alert('Please fill in all required fields');
            return;
        }

        if (template) {
            await updateTemplate(template.id, templateData);
        } else {
            await saveTemplate(templateData);
        }

        dialog.remove();
        loadTemplates();
    });
}

// Add floating action button for creating new templates
function addNewTemplateButton() {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-plus"></i>';
    button.className = 'new-template-button';
    
    // Add click event listener
    button.addEventListener('click', () => {
        showTemplateEditDialog(); // Call without parameters for new template
    });

    document.body.appendChild(button);
    return button;
}

let newTemplateButton = null;

// Show/hide new template button based on active section
function updateNewTemplateButton(sectionId) {
    if (sectionId === 'TemplatesSection') {
        if (!newTemplateButton) {
            newTemplateButton = addNewTemplateButton();
        }
        newTemplateButton.style.display = 'flex';
    } else if (newTemplateButton) {
        newTemplateButton.style.display = 'none';
    }
}

// Add these new functions for chat functionality
async function loadChatProfiles() {
    const profiles = await getProfiles();
    const select = document.getElementById('chatProfileSelect');
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add profiles to select
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.savedAt; // Use timestamp as value
        option.textContent = `${profile.name} - ${profile.headline || 'No headline'}`;
        select.appendChild(option);
    });

    // Initialize chat UI
    await initializeChat();

    // Add profile select change handler to clear conversation when profile changes
    select.addEventListener('change', async () => {
        if (select.value) {
            await clearChatHistory(select.value);
        }
        chatMessages.innerHTML = '';
        initializeChat();
    });
}

async function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendChatButton');
    const profileSelect = document.getElementById('chatProfileSelect');

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Load existing chat history if a profile is selected
    if (profileSelect.value) {
        const history = await getChatHistory(profileSelect.value);
        
        // Display existing messages
        for (const msg of history) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.role === 'user' ? 'user' : 'ai'}`;
            const contentDiv = document.createElement('div');
            contentDiv.className = 'chat-message-content visible';
            contentDiv.textContent = msg.content;
            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
        }
    }

    // Add welcome message if no history exists
    if (chatMessages.children.length === 0) {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'chat-message ai';
        const welcomeContentDiv = document.createElement('div');
        welcomeContentDiv.className = 'chat-message-content typing-animation';
        welcomeMessage.appendChild(welcomeContentDiv);
        chatMessages.appendChild(welcomeMessage);

        // Type out welcome message
        const welcomeText = `Hello! Select a profile from the dropdown and ask me anything about them. I can help you:

- Analyze their background and experience
- Compare their skills with yours
- Suggest talking points for conversations
- Identify potential collaboration opportunities`;

        await typeText(welcomeContentDiv, welcomeText);
        welcomeContentDiv.classList.remove('typing-animation');

        // Save welcome message to history if a profile is selected
        if (profileSelect.value) {
            await saveChatHistory(profileSelect.value, [{
                role: 'assistant',
                content: welcomeText
            }]);
        }
    }

    // Handle send button click
    sendButton.onclick = () => sendChatMessage();

    // Handle enter key in textarea
    chatInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const profileSelect = document.getElementById('chatProfileSelect');
    const message = chatInput.value.trim();

    if (!message) return;

    if (!profileSelect.value) {
        // Show error if no profile is selected
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-error';
        errorDiv.textContent = 'Please select a profile to chat about first.';
        chatMessages.appendChild(errorDiv);
        return;
    }

    // Get existing chat history
    const history = await getChatHistory(profileSelect.value);

    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user';
    userMessageDiv.innerHTML = `
        <div class="chat-message-content visible">${message}</div>
    `;
    chatMessages.appendChild(userMessageDiv);

    // Add user message to history
    history.push({
        role: 'user',
        content: message
    });

    // Clear input
    chatInput.value = '';

    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-loading';
    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is thinking...';
    chatMessages.appendChild(loadingDiv);

    try {
        // Get profiles
        const selectedProfile = await getSpecificProfile(profileSelect.value);
        const clientProfile = await getClientProfile();
        
        // Get API key
        const apiKey = await getAIApiKey('gemini');
        
        if (!apiKey) {
            throw new Error('Please set up your Gemini API key in the Settings tab first.');
        }

        // Call Gemini API with conversation history
        const response = await callGeminiChat(message, selectedProfile, clientProfile, apiKey, history);

        // Remove loading indicator
        loadingDiv.remove();

        // Add AI response with typing animation
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-message-content typing-animation';
        aiMessageDiv.appendChild(contentDiv);
        chatMessages.appendChild(aiMessageDiv);

        // Animate the text
        await typeText(contentDiv, response);

        // Add AI response to history
        history.push({
            role: 'assistant',
            content: response
        });

        // Save updated history
        await saveChatHistory(profileSelect.value, history);

        // Remove typing animation class after text is complete
        contentDiv.classList.remove('typing-animation');
    } catch (error) {
        // Remove loading indicator
        loadingDiv.remove();

        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-error';
        errorDiv.textContent = error.message;
        chatMessages.appendChild(errorDiv);
    }

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function callGeminiChat(message, selectedProfile, clientProfile, apiKey, history) {
    // Format the conversation history for the prompt
    const formattedHistory = history
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

    const prompt = `
    You are a helpful AI assistant analyzing LinkedIn profiles. You have access to two profiles and the conversation history below.

    1. The client's (sender's) profile:
    - Name: ${clientProfile.name}
    - Headline: ${clientProfile.headline}
    - Current Role: ${clientProfile.currentRole}
    - Skills: ${clientProfile.skills ? clientProfile.skills.map(s => s.skill).join(', ') : 'Not provided'}

    2. The profile being discussed:
    - Name: ${selectedProfile.name}
    - Headline: ${selectedProfile.headline}
    - Current Role: ${selectedProfile.currentRole}
    - Location: ${selectedProfile.location}
    - About: ${selectedProfile.about}
    - Experience: ${JSON.stringify(selectedProfile.experience)}
    - Skills: ${selectedProfile.skills ? selectedProfile.skills.map(s => s.skill).join(', ') : 'Not provided'}

    Previous conversation:
    ${formattedHistory}

    The user's latest question is: "${message}"

    Please provide a helpful, professional response that:
    1. Maintains context from the previous conversation
    2. Directly answers the user's question
    3. References specific details from both profiles when relevant
    4. Maintains a friendly, professional tone
    5. Uses bullet points or formatting when it helps clarity
    6. Keeps responses concise but informative

    Format your response in a way that's easy to read and understand.`;

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
        console.error("Error in callGeminiChat:", error);
        throw new Error(`Failed to generate response: ${error.message}`);
    }
}

// Add typewriter function
async function typeText(element, text) {
    element.textContent = '';
    element.classList.add('visible');
    
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
        currentText += words[i] + ' ';
        element.textContent = currentText;
        
        // Adjust the delay based on punctuation
        const delay = words[i].match(/[.!?]$/) ? 150 : 50;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Scroll while typing
        element.parentElement.parentElement.scrollTop = element.parentElement.parentElement.scrollHeight;
    }
}

function showFeedbackDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'feedback-dialog';
    
    dialog.innerHTML = `
        <h2><i class="fas fa-comment-dots"></i> Share Your Feedback</h2>
        <div class="feedback-form">
            <div class="template-dialog-field">
                <label>How satisfied are you with NetLinked? <span style="color: var(--primary-color)">*</span></label>
                <div class="rating-container">
                    <div class="star-rating">
                        ${Array(5).fill(0).map((_, i) => `
                            <span class="star" data-rating="${i + 1}">
                                <i class="far fa-star"></i>
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="template-dialog-field">
                <label>Which features do you find most useful? <span style="color: var(--primary-color)">*</span></label>
                <div class="checkbox-group">
                    <label><input type="checkbox" value="profile-analysis"> Profile Analysis</label>
                    <label><input type="checkbox" value="message-generation"> Message Generation</label>
                    <label><input type="checkbox" value="templates"> Message Templates</label>
                    <label><input type="checkbox" value="chat"> AI Chat</label>
                </div>
            </div>
            
            <div class="template-dialog-field">
                <label>What could be improved?</label>
                <textarea id="improvementsFeedback" placeholder="Share your suggestions for improvements..."></textarea>
            </div>
            
            <div class="template-dialog-field">
                <label>Did you encounter any issues?</label>
                <textarea id="issuesFeedback" placeholder="Describe any problems you experienced..."></textarea>
            </div>
            
            <div class="template-dialog-field">
                <label>Additional comments</label>
                <textarea id="additionalFeedback" placeholder="Any other thoughts or suggestions..."></textarea>
            </div>
            
            <div class="template-dialog-actions">
                <button id="cancelFeedbackBtn" class="secondary-button">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button id="submitFeedbackBtn" class="primary-button">
                    <i class="fas fa-paper-plane"></i> Send Feedback
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Add star rating functionality
    const stars = dialog.querySelectorAll('.star');
    let currentRating = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = this.dataset.rating;
            updateStars(stars, rating);
        });

        star.addEventListener('mouseout', function() {
            updateStars(stars, currentRating);
        });

        star.addEventListener('click', function() {
            currentRating = this.dataset.rating;
            updateStars(stars, currentRating);
        });
    });

    // Add event listeners for buttons
    dialog.querySelector('#cancelFeedbackBtn').addEventListener('click', () => {
        dialog.remove();
    });

    dialog.querySelector('#submitFeedbackBtn').addEventListener('click', async () => {
        // Validate required fields
        if (!currentRating) {
            showErrorMessage('Please provide a rating');
            return;
        }

        const selectedFeatures = Array.from(dialog.querySelectorAll('.checkbox-group input:checked'))
            .map(cb => cb.value);
            
        if (selectedFeatures.length === 0) {
            showErrorMessage('Please select at least one feature');
            return;
        }

        const feedback = {
            rating: currentRating,
            features: selectedFeatures,
            improvements: dialog.querySelector('#improvementsFeedback').value,
            issues: dialog.querySelector('#issuesFeedback').value,
            additional: dialog.querySelector('#additionalFeedback').value,
            timestamp: new Date().toISOString(),
            version: '1.0.0-beta',
            clientProfile: await getClientProfile()
        };

        try {
            await saveFeedback(feedback);
            dialog.remove();
            showSuccessMessage('Thank you for your feedback!');
        } catch (error) {
            console.error('Error saving feedback:', error);
            showErrorMessage('Failed to submit feedback. Please try again.');
        }
    });
}

function updateStars(stars, rating) {
    stars.forEach((star, index) => {
        const starIcon = star.querySelector('i');
        if (index < rating) {
            starIcon.className = 'fas fa-star';
        } else {
            starIcon.className = 'far fa-star';
        }
    });
}

function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message';
    messageDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}