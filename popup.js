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

  // Get name
  const nameElement = document.querySelector('h1.text-heading-xlarge');
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
  
  const educationList = document.querySelector('#education')?.closest('section')?.querySelector('.display-flex.ph5.pv3 .full-width[dir="ltr"] span[aria-hidden="true"]');

  console.log('educationList: ', educationList);
  
  if (educationList) {
    profileData.education = educationList.textContent.trim();
  }

  

  /*if (educationList?.length) {
    profileData.education = Array.from(educationList).map(item => {
      const schoolName = item.querySelector('.hoverable-link-text.t-bold')?.textContent.trim();
      const degree = item.querySelector('.t-14.t-normal span')?.textContent.trim();
      const date = item.querySelector('.t-14.t-normal.t-black--light span')?.textContent.trim();
      const activities = item.querySelector('.inline-show-more-text--is-collapsed')?.textContent.trim();
      
      return {
        schoolName,
        degree,
        date,
        activities
      };
    }).filter(edu => edu.schoolName); // Filter out any empty entries
  }*/

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
