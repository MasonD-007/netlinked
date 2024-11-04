// Add a function to check LinkedIn profile URL pattern
function isLinkedInProfilePage(url) {
  // Match patterns like https://www.linkedin.com/in/username
  return /^https:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/.test(url);
}

// Get the current tab and check if it's a LinkedIn profile
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (tabs[0] && isLinkedInProfilePage(tabs[0].url)) {
    // User is on a LinkedIn profile
    document.getElementById('actionButton').onclick = () => {
      // Execute script to scrape LinkedIn data
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: scrapeLinkedInProfile
      }, (results) => {
        if (results && results[0]) {
          const profileData = results[0].result;
          displayProfileData(profileData);
        }
      });
    };
  } else {
    // User is not on a LinkedIn profile
    document.getElementById('actionButton').onclick = () => {
      alert("Please navigate to a LinkedIn profile page");
      // Open user's LinkedIn profile in a new tab
      chrome.tabs.create({ url: 'https://www.linkedin.com/in/me' });
    };
  }
});

// Profile scraping function that will run in the context of the LinkedIn page
function scrapeLinkedInProfile() {
  const profileData = {
    name: '',
    headline: '',
    location: '',
    about: '',
    experience: [],
    education: '',
    skills: [],
    projects: [],
    licenses: []
  };

  // Updated name selector
  const nameElement = document.querySelector('h1.RIbnCAsTbWzbdDScQkPGXRrQHSaITKZWQhh');
  if (nameElement) profileData.name = nameElement.textContent.trim();

  // Get headline
  const headlineElement = document.querySelector('.text-body-medium');
  if (headlineElement) profileData.headline = headlineElement.textContent.trim();

  // Get location
  const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
  if (locationElement) profileData.location = locationElement.textContent.trim();

  // Get about section
  const aboutElement = document.querySelector('#about')
    ?.closest('section')
    ?.querySelector('.display-flex.ph5.pv3 .full-width[dir="ltr"] span[aria-hidden="true"]');
  if (aboutElement) profileData.about = aboutElement.textContent.trim();

  // Get experience section
  // const experienceElement = document.querySelector('#experience-section'); // TODO: Add selector for experience section
  // if (experienceElement) profileData.experience = experienceElement.textContent.trim();

  // Get education section
  const educationSection = document.querySelector('#education')?.closest('section');
  if (educationSection) {
    const educationTitle = educationSection.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
    
    if (educationTitle) {
      profileData.education = educationTitle.textContent.trim();
    }
  }

  // Get skills section
  const skillsElement = document.querySelector('#skills-section'); // TODO: Add selector for skills section
  if (skillsElement) profileData.skills = skillsElement.textContent.trim();

  // Get Projects section
  const projectsElement = document.querySelector('#projects-section'); // TODO: Add selector for projects section
  if (projectsElement) profileData.projects = projectsElement.textContent.trim();

  // Get Licenses & Certifications section
  const licensesElement = document.querySelector('#licenses-section'); // TODO: Add selector for licenses section
  if (licensesElement) profileData.licenses = licensesElement.textContent.trim();

  return profileData;
}

// Add this new function to display the data
function displayProfileData(data) {
  // Send the profile data to the background script
  chrome.runtime.sendMessage({ type: 'PROFILE_DATA', data }, (response) => {
    console.log('Response from background script:', response);
  });

  // Show the profile data container
  document.getElementById('profileData').classList.remove('hidden');
  
  // Update each field with scraped data
  Object.keys(data).forEach(key => {
    const element = document.getElementById(key);
    if (element && data[key]) {
      element.textContent = data[key];
    }
  });

  // Special handling for education array
  const educationElement = document.getElementById('education');
  if (educationElement && data.education?.length) {
    educationElement.innerHTML = data.education
      .map(edu => `
        <div class="education-entry">
          <h3>${edu.schoolName}</h3>
          <p>${edu.degree}</p>
          <p>${edu.date}</p>
          ${edu.activities ? `<p>Activities: ${edu.activities}</p>` : ''}
        </div>
      `)
      .join('');
  }
}
