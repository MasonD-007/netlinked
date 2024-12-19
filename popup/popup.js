// Add at the beginning of the file
let currentProfileData = null;

// Add a function to check LinkedIn profile URL pattern
function isLinkedInProfilePage(url) {
  // Match patterns like https://www.linkedin.com/in/username or https://www.linkedin.com/in/username/details/skills/
  return /^https:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/.test(url);
}

//document.getElementById('actionButton').addEventListener('click', () => {
//  document.getElementById('buttonContainer').classList.add('hidden');
//  document.getElementById('profileData').classList.remove('hidden');
//});

// Get the current tab and check if it's a LinkedIn profile
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs[0] && isLinkedInProfilePage(tabs[0].url)) {

    //save profile button
    document.getElementById('saveProfileButton').onclick = async () => {
      document.getElementById('loadingPopup').classList.remove('hidden');
      
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
        
        // Now that we have the data, save the profile
        await saveProfile(currentProfileData);
        
        //reload the page
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert("Failed to save profile data");
      } finally {
        document.getElementById('loadingPopup').classList.add('hidden');
      }
    };

    //generate message button
    document.getElementById('generateMessageButton').onclick = async () => {
      document.getElementById('messageType').classList.remove('hidden');
      document.getElementById('loadingPopup').classList.remove('hidden');
      
      try {

        //See what type of message we want to generate
        const messageType = document.querySelector('input[name="messageType"]:checked').value;
        if (!messageType) {
          alert("Please select a message type");
          return;
        }

        //See what ai api we want to use
        const aiApi = document.querySelector('input[name="aiApi"]:checked').value;
        if (!aiApi) {
          alert("Please select an AI API");
          return;
        }

        //get the api key
        const apiKey = await getAIApiKey(aiApi);
        console.log("API key:", apiKey + " for " + aiApi);
        if (!apiKey) {
          alert("Please set up your " + aiApi + " API key in settings first.");
          return;
        }


        //Then make sure we have the clients data
        const clientData = await getClientProfile();
        if (!clientData) {
          alert("No client data available. Please update your profile first.");
          return;
        }

        //if we don't have the recipient data, scrape it
        if (!currentProfileData) {
          //second scrape the current profile data
          currentProfileData = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ tabId: tabs[0].id, action: "scrapeProfile" }, (response) => {
              if (response.success) {
                resolve(response.profileData);
              } else {
                reject(new Error("Failed to scrape profile"));
              }
            });
          });
        }

        //Hide the message type select
        document.getElementById('messageType').classList.add('hidden');
        console.log("Message type selected:", messageType);

        chrome.runtime.sendMessage({ 
          tabId: tabs[0].id, 
          action: "generateMessage", 
          template: messageType, 
          ClientData: clientData, 
          RecipientData: currentProfileData, 
          apiKey: apiKey,
          aiApi: aiApi
        }, async (response) => {
          if (response.success) {
            document.getElementById('buttonContainer').classList.add('hidden');
            document.getElementById('messageContainer').classList.remove('hidden');
            document.getElementById('message').textContent = response.message;
            await saveGeneratedMessage(response.message, currentProfileData, messageType);
          } else {
            alert("Failed to generate message");
          }
        });
        document.getElementById('generateMessageButton').classList.add('hidden');
      } catch (error) {
        console.error(error);
        alert("An error occurred while generating the message");
      } finally {
        document.getElementById('loadingPopup').classList.add('hidden');
      }
    };
    document.getElementById('openWebsiteButton').onclick = () => {
      chrome.tabs.create({ url: 'website/web.html' });
    };
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

    document.getElementById('openWebsiteButton').onclick = () => {
      chrome.tabs.create({ url: 'website/web.html' });
    };
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

// Add event listeners for storage operations
document.addEventListener('DOMContentLoaded', async () => {
  // Add save button listener
  document.getElementById('saveButton').addEventListener('click', async () => {
    if (!currentProfileData) return;
    
    const success = await saveProfile(currentProfileData);
    if (success) {
      alert('Profile saved successfully!');
      await displaySavedProfiles();
      document.getElementById('saveButton').classList.add('hidden');
      document.getElementById('profileData').classList.add('hidden');
      document.getElementById('buttonContainer').classList.remove('hidden');
      document.getElementById('savedProfiles').classList.remove('hidden');
    } else {
      alert('Failed to save profile');
    }
  });

  // Display saved profiles on popup open
  await displaySavedProfiles();
});

// Function to display saved profiles
async function displaySavedProfiles() {
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