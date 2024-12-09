// Add at the beginning of the file
let currentProfileData = null;

// Add a function to check LinkedIn profile URL pattern
function isLinkedInProfilePage(url) {
  // Match patterns like https://www.linkedin.com/in/username or https://www.linkedin.com/in/username/details/skills/
  return /^https:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/.test(url) || /^https:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/details\/skills\/?$/.test(url);
}

document.getElementById('actionButton').addEventListener('click', () => {
  document.getElementById('buttonContainer').classList.add('hidden');
  document.getElementById('profileData').classList.remove('hidden');
});

document.getElementById('skillButton').addEventListener('click', () => {
  document.getElementById('buttonContainer').classList.add('hidden');
  document.getElementById('profileData').classList.remove('hidden');
});

// Get the current tab and check if it's a LinkedIn profile
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs[0] && isLinkedInProfilePage(tabs[0].url)) {
    // User is on a LinkedIn profile
    document.getElementById('actionButton').onclick = () => {
      // Execute script to scrape LinkedIn data
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['scraper.js']
      }, () => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            return window.scrapeLinkedInProfile();
          }
        }, (results) => {
          if (results && results[0]) {
            const profileData = results[0].result;
            console.log(profileData);
            displayProfileData(profileData);
          }
        });
      });
    };
    document.getElementById('skillButton').onclick = () => {
      // Execute script to scrape LinkedIn data
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['scraper.js']
      }, () => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            return window.scrapeLinkedInProfileSkills();
          }
        }, (results) => {
          if (results && results[0]) {
            const profileData = results[0].result;
            console.log(profileData);
            displayProfileData(profileData);
          }
        });
      });
    };
  } else {
    // User is not on a LinkedIn profile
    document.getElementById('actionButton').onclick = () => {
      if (confirm("You're not on a LinkedIn profile page. Would you like to open your LinkedIn profile?")) {
        chrome.tabs.create({ url: 'https://www.linkedin.com/in/me' });
      }
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
          <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            ${skill}
          </span>
        `).join('')}
      </div>
    `;
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
    }
  });
}