// Add at the beginning of the file
let currentProfileData = null;

// Add a function to check LinkedIn profile URL pattern
function isLinkedInProfilePage(url) {
  // Match patterns like https://www.linkedin.com/in/username or https://www.linkedin.com/in/username/details/skills/
  return /^https:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/.test(url);
}

// Get the current tab and check if it's a LinkedIn profile
chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
  loadTheme();
  if (tabs[0] && isLinkedInProfilePage(tabs[0].url)) {
    // Check if profile is already saved
    const savedProfile = await isProfileSaved(tabs[0].url);
    if (savedProfile) {
      currentProfileData = savedProfile;
    }

    //generate summary button
    document.getElementById('generateSummaryButton').onclick = async () => {
      showBackButton();
      document.getElementById('buttonContainer').classList.add('hidden');
      document.getElementById('loadingPopup').classList.remove('hidden');

      try {
        // If we don't have profile data yet, scrape it first
        if (!currentProfileData) {
          const scrapedData = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ tabId: tabs[0].id, action: "scrapeProfile" }, (response) => {
              if (!response || !response.success) {
                reject(new Error("Failed to scrape profile data"));
              } else {
                resolve(response.profileData);
              }
            });
          });
          currentProfileData = scrapedData;
        }

        // Get the API key
        const apiKey = await getAIApiKey('gemini');
        if (!apiKey) {
          throw new Error('Gemini API key not found. Please add your API key in settings.');
        }

        // Get client profile data
        const clientProfile = await getClientProfile();
        if (!clientProfile) {
          throw new Error('Please save your profile first to enable profile comparison.');
        }

        // Generate the summary
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: "generateSummary",
            profileData: currentProfileData,
            ClientData: clientProfile,
            apiKey: apiKey
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!response.success) {
              reject(new Error(response.error || 'Failed to generate summary'));
            } else {
              resolve(response);
            }
          });
        });

        // Display the summary
        document.getElementById('summaryText').textContent = response.summary;
        document.getElementById('summaryContainer').classList.remove('hidden');

      } catch (error) {
        console.error('Error generating summary:', error);
        alert(error.message || 'Failed to generate summary. Please try again.');
      } finally {
        document.getElementById('loadingPopup').classList.add('hidden');
      }
    };

    //save profile button
    document.getElementById('saveProfileButton').onclick = async () => {
      if (savedProfile) {
        alert("This profile has already been saved!");
        return;
      }

      showBackButton();
      document.getElementById('loadingPopup').classList.remove('hidden');
      document.getElementById('buttonContainer').classList.add('hidden');
      document.getElementById('connectionTypeSelect').classList.remove('hidden');
      
      try {
        // Wait for the scraping to complete using a Promise
        const scrapedData = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ tabId: tabs[0].id, action: "scrapeProfile" }, (response) => {
            if (response.success) {
              resolve(response.profileData);
            } else {
              reject(new Error("Failed to scrape profile data"));
            }
          });
        });
        
        // Update currentProfileData with the scraped data
        currentProfileData = scrapedData;
        console.log("Scraped profile data:", currentProfileData);
        
        // Show connection type selection
        document.getElementById('connectionTypeSelect').classList.remove('hidden');
        
      } catch (error) {
        console.error(error);
        alert("Failed to save profile data");
      } finally {
        document.getElementById('loadingPopup').classList.add('hidden');
      }
    };

    //generate message button
    document.getElementById('generateMessageButton').onclick = async () => {
      showBackButton();
      document.getElementById('buttonContainer').classList.add('hidden');
      document.getElementById('messageOptions').classList.remove('hidden');
      document.getElementById('messageType').classList.remove('hidden');
    };
    document.getElementById('websiteButton').addEventListener('click', () => {
      chrome.tabs.create({ url: 'website/web.html' });
    });
  } else {
    // User is not on a LinkedIn profile
    document.getElementById('saveProfileButton').onclick = () => {
      if (confirm("You're not on a LinkedIn profile page. Would you like to open your LinkedIn profile?")) {
        chrome.tabs.create({ url: 'https://www.linkedin.com/in/me' });
      }
    };

    document.getElementById('generateMessageButton').onclick = () => {
      if (confirm("You're not on a LinkedIn profile page. Would you like to open your LinkedIn profile?")) {
        chrome.tabs.create({ url: 'https://www.linkedin.com/in/me' });
      }
    }

    document.getElementById('websiteButton').addEventListener('click', () => {
      chrome.tabs.create({ url: 'website/web.html' });
    });
  }
});


// Add this new function to display the data
function displayProfileData(data) {
  currentProfileData = data;
  // Show the profile data container
  document.getElementById('profileData').classList.remove('hidden');

  // Update basic fields with scraped data
  Object.keys(data).forEach(key => {
    const element = document.getElementById(key);
    if (element && data[key] && !['education', 'experience', 'skills'].includes(key)) {
      element.textContent = data[key];
    }
  });

  // Special handling for education array
  const educationElement = document.getElementById('education');
  if (educationElement && data.education?.length) {
    educationElement.innerHTML = data.education.map(edu => `
      <div class="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-bold text-lg">${edu.schoolName}</h3>
        <p class="text-gray-700">${edu.degree}</p>
        <p class="text-gray-600 text-sm">${edu.date}</p>
        ${edu.description ? `<p class="mt-2 text-gray-600">${edu.description}</p>` : ''}
      </div>
    `).join('');
  }

  // Special handling for experience array
  const experienceElement = document.getElementById('experience');
  if (experienceElement && data.experience?.length) {
    experienceElement.innerHTML = data.experience.map(exp => `
      <div class="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-bold text-lg">${exp.title}</h3>
        <p class="font-medium text-gray-800">${exp.company}</p>
        <p class="text-gray-600 text-sm">${exp.date}</p>
        ${exp.location ? `<p class="text-gray-600 text-sm">${exp.location}</p>` : ''}
        ${exp.description ? `<p class="mt-2 text-gray-600">${exp.description}</p>` : ''}
      </div>
    `).join('');
  }

  // Special handling for skills array
  const skillsElement = document.getElementById('skills');
  if (skillsElement && data.skills?.length) {
    skillsElement.innerHTML = `
      <div class="flex flex-wrap gap-2">
        ${data.skills.map(skill => `
          <p class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            - ${skill.skill} 
          </p>
          ${skill.endorsement ? `
            <p class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              by: (${skill.endorsement})
            </p>
          ` : ''}
        `).join('')}
      </div>
    `;
  }

  // Special handling for projects array
  const projectsElement = document.getElementById('projects');
  if (projectsElement && data.projects?.length) {
    projectsElement.innerHTML = data.projects.map(project => `
      <div class="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-bold text-lg">${project.title}</h3>
        <p class="text-gray-600">${project.description}</p>
      </div>
    `).join('');
  }

  // Show save button
  document.getElementById('saveButton').classList.remove('hidden');
}

// Function to display saved profiles
/*async function displaySavedProfiles() {
  const profiles = await getProfiles();
  const container = document.getElementById('savedProfiles');
  
  if (profiles.length === 0) {
    container.innerHTML = '<p>No saved profiles</p>';
    return;
  }

  container.innerHTML = profiles.map(profile => `
    <div class="profile-card" data-profile-id="${profile.savedAt}">
      <h4>${profile.name}</h4>
      <p>${profile.headline || ''}</p>
      <span class="connection-type-badge ${profile.connectionType}">${profile.connectionType}</span>
      <div class="profile-actions">
        <button class="view-profile-btn">View</button>
        <button class="print-profile-btn">Print</button>
        <button class="delete-profile-btn">Delete</button>
      </div>
    </div>
  `).join('');

  // Add event delegation for the buttons
  container.addEventListener('click', async (e) => {
    const profileCard = e.target.closest('.profile-card');
    if (!profileCard) return;

    const profileId = profileCard.dataset.profileId;

    if (e.target.classList.contains('delete-profile-btn')) {
      if (await deleteProfile(profileId)) {
        await displaySavedProfiles();
      } else {
        alert('Failed to delete profile');
      }
    } else if (e.target.classList.contains('view-profile-btn')) {
      const success = await openProfileUrl(profileId);
      if (!success) {
        alert('Could not open profile URL');
      }
    } else if (e.target.classList.contains('print-profile-btn')) {
      const success = await printProfile(profileId);
      if (!success) {
        alert('Failed to print profile');
      }
    }
  });
}
*/
let apiKey = await getAIApiKey('gemini');
console.log("API key:", apiKey);
//if the api key is not set, hide the settings section 
if (apiKey == null) {
  document.getElementById('settings-section').classList.remove('hidden');
}

//add event listener to the save api key button
document.getElementById('saveApiKeyButton').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKeyInput').value;
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }
  
  // Save the API key
  const success = await saveAIApiKey('gemini', apiKey);
  if (success) {
    alert('API key saved successfully!');
    document.getElementById('settings-section').classList.add('hidden');

  } else {
    alert('Failed to save API key');
  }
});

// Update the API key check section
let geminiKey = await getAIApiKey('gemini');
let chatgptKey = await getAIApiKey('chatgpt');
let claudeKey = await getAIApiKey('claude');

// Show settings section if Gemini key is not set
if (geminiKey == null) {
  document.getElementById('settings-section').classList.remove('hidden');
}

// Handle all AI API radio buttons (both in buttonContainer and profileData)
document.querySelectorAll('input[name="aiApi"]').forEach(radio => {
  if (radio.value === 'chatgpt' && chatgptKey == null) {
    radio.disabled = true;
    document.querySelectorAll('#chatgpt-key-required').forEach(element => {
      element.classList.remove('hidden');
    });
  }
  
  if (radio.value === 'claude' && claudeKey == null) {
    radio.disabled = true;
    document.querySelectorAll('#claude-key-required').forEach(element => {
      element.classList.remove('hidden');
    });
  }
});

// Update loadTheme function
function loadTheme() {
    chrome.storage.local.get(['theme', 'darkMode'], function(result) {
        const root = document.documentElement;
        
        // Apply color theme
        if (result.theme) {
            root.style.setProperty('--primary-color', result.theme);
            
            // Calculate darker shade for hover states
            const darkerShade = adjustColor(result.theme, -20);
            root.style.setProperty('--primary-color-dark', darkerShade);
            
            // Calculate lighter shade for backgrounds
            root.style.setProperty('--primary-color-light', `${result.theme}1A`);
        }

        // Apply dark mode
        if (result.darkMode) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.setAttribute('data-theme', 'light');
        }
    });
}

// Helper function to adjust color brightness (same as in web.js)
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

// Call loadTheme when the popup opens
document.addEventListener('DOMContentLoaded', loadTheme);

// Add connection type selection handler
document.getElementById('saveWithConnectionType').onclick = async () => {
  const connectionType = document.querySelector('input[name="connectionType"]:checked')?.value;
  if (!connectionType) {
    alert("Please select a connection type");
    return;
  }

  try {
    const result = await saveProfile(currentProfileData, connectionType);
    if (result.success) {
      window.location.reload();
    } else {
      alert("Failed to save profile data");
    }
  } catch (error) {
    console.error(error);
    alert("Failed to save profile data");
  }
};

// Add near the start of your file
function showBackButton() {
  document.getElementById('backButton').classList.remove('hidden');
}

function hideBackButton() {
  document.getElementById('backButton').classList.add('hidden');
}

// Add after your DOMContentLoaded event listener
document.getElementById('backButton').addEventListener('click', () => {
  // Show main buttons
  document.getElementById('buttonContainer').classList.remove('hidden');
  // Hide message options and other panels
  document.getElementById('messageOptions').classList.add('hidden');
  document.getElementById('messageType').classList.add('hidden');
  document.getElementById('messageContainer').classList.add('hidden');
  document.getElementById('connectionTypeSelect').classList.add('hidden');
  document.getElementById('summaryContainer').classList.add('hidden');
  
  // Hide the back button
  hideBackButton();
});

// Add this function to process templates
async function processTemplate(templateContent, clientData, recipientData) {
  // Replace placeholders with actual data
  return templateContent
    .replace(/\{ClientName\}/g, clientData.name)
    .replace(/\{ClientTitle\}/g, clientData.headline)
    .replace(/\{RecipientName\}/g, recipientData.name)
    .replace(/\{RecipientTitle\}/g, recipientData.headline)
    // Add more replacements as needed
    ;
}

// Add this function to load user templates into the dropdown
async function loadUserTemplates() {
  const templates = await getTemplates();
  const templateSelect = document.getElementById('userTemplateSelect');
  
  templateSelect.innerHTML = `
    <option value="">Select a Template</option>
    ${templates.map(template => `
      <option value="${template.id}">${template.name}</option>
    `).join('')}
  `;
}

// Add this to your existing code
document.querySelectorAll('input[name="templateSource"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const templateContainer = document.getElementById('templateSelectContainer');
    const aiOptions = document.querySelectorAll('.aiApiSelect, .messageType');
    
    if (e.target.value === 'template') {
      templateContainer.classList.remove('hidden');
      aiOptions.forEach(el => el.classList.add('hidden'));
      loadUserTemplates(); // Load templates into dropdown
    } else {
      templateContainer.classList.add('hidden');
      aiOptions.forEach(el => el.classList.remove('hidden'));
    }
  });
});

// Add this function to generate messages using AI
async function generateAIMessage(selectedApi, messageType, profileData) {
  const apiKey = await getAIApiKey(selectedApi);
  if (!apiKey) {
    throw new Error(`${selectedApi} API key not found`);
  }

  const clientProfile = await getClientProfile();
  if (!clientProfile) {
    throw new Error('Client profile not found. Please save your profile first.');
  }

  const response = await chrome.runtime.sendMessage({
    action: "generateMessage",
    ClientData: clientProfile,
    RecipientData: profileData,
    template: messageType,
    apiKey: apiKey
  });

  if (!response.success) {
    throw new Error('Failed to generate message');
  }

  return response.message;
}

// Update the generate button click handler
document.getElementById('generateButton').addEventListener('click', async () => {
  const selectedApi = document.querySelector('input[name="aiApi"]:checked').value;
  const messageType = document.querySelector('input[name="messageType"]:checked').value;
  const templateSource = document.querySelector('input[name="templateSource"]:checked').value;

  // Show loading state
  document.getElementById('loadingPopup').classList.remove('hidden');
  
  try {
    // Get client profile data
    const clientProfile = await getClientProfile();
    if (!clientProfile) {
      throw new Error('Please save your profile first to enable message generation.');
    }

    // Get API key
    const apiKey = await getAIApiKey(selectedApi);
    if (!apiKey) {
      throw new Error(`${selectedApi} API key not found. Please add your API key in settings.`);
    }

    let message;
    if (templateSource === 'template') {
      const templateId = document.getElementById('userTemplateSelect').value;
      if (!templateId) {
        throw new Error('Please select a template');
      }
      
      // Get template
      const template = await getSpecificTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // First process template with basic replacements
      const processedTemplate = await processTemplate(template.content, clientProfile, currentProfileData);
      
      // Then enhance with AI
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: "generateMessage",
          ClientData: clientProfile,
          RecipientData: currentProfileData,
          template: { ...template, content: processedTemplate },
          apiKey: apiKey
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response.success) {
            reject(new Error(response.error || 'Failed to generate message'));
          } else {
            resolve(response);
          }
        });
      });
      
      message = response.message;
    } else {
      // Generate message using AI directly
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: "generateMessage",
          ClientData: clientProfile,
          RecipientData: currentProfileData,
          template: messageType,
          apiKey: apiKey
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response.success) {
            reject(new Error(response.error || 'Failed to generate message'));
          } else {
            resolve(response);
          }
        });
      });
      
      message = response.message;
    }

    if (!message) {
      throw new Error('No message was generated');
    }

    // Save the generated message
    await saveGeneratedMessage(message, currentProfileData, messageType);

    // Display the generated message
    document.getElementById('message').textContent = message;
    document.getElementById('messageContainer').classList.remove('hidden');
    document.getElementById('messageOptions').classList.add('hidden');
    
  } catch (error) {
    console.error('Error generating message:', error);
    alert(error.message || 'Failed to generate message. Please try again.');
  } finally {
    document.getElementById('loadingPopup').classList.add('hidden');
  }
});