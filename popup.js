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

  const profileURL = window.location.href;
  const profileData = {
    name: '',
    headline: '',
    location: '',
    about: '',
    experience: [],
    education: [],
    educationDegree: '',
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

  // Get education section (DONE)
  const educationSectionList = document.querySelector('#education')?.closest('section')?.querySelectorAll('li');

  for (const educationItem of educationSectionList) {
    const educationTitle = educationItem.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
    const educationDegree = educationItem.querySelector('.t-14.t-normal span[aria-hidden="true"]');
    const educationDate = educationItem.querySelector('.pvs-entity__caption-wrapper[aria-hidden="true"]');
    const descriptionList = educationItem.querySelectorAll('.jupmsBwuUWszwbchXgddxkzuKsEiiKjs li span[aria-hidden="true"]');
    let educationDescription = '';
    for (const descriptionItem of descriptionList) {
      educationDescription += descriptionItem.textContent.trim() + '\n';
    }
            
    if (educationTitle && educationDegree && educationDate) {
      profileData.education.push({
        schoolName: educationTitle.textContent.trim(),
        degree: educationDegree.textContent.trim(),
        date: educationDate.textContent.trim(),
        description: educationDescription
      });
    } else {
      console.error('Education title, degree, or date not found');
    }
  }

  //open skills page
  /*if (!window.location.href.includes('/details/skills')) {
    // If not on skills page, navigate to it
    window.location.href = profileURL + '/details/skills';
    return null;
  }

  // Get skills section (Open go to (user.url)/details/skills to see the whole skills section to scrape)
  const skillsPage = document.querySelector('a[href="/details/skills"]');
  const skillsList = skillsPage?.closest('.MzcESiLIKvHKWArcmskFayUaFtNohnClzMPnc')?.querySelectorAll('li span[aria-hidden="true"]');
  if (skillsList) {
    for (const skill of skillsList) {
      profileData.skills.push(skill.textContent.trim());
    }
  }

  completed = true;

  //close skills page
  if (completed) {
    window.location.href = profileURL.split('/details/skills')[0];
    return null;
  }*/

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
      if (key === 'education') {
        element.textContent = data[key].map(edu => `${edu.schoolName} - ${edu.degree}`).join('\n');
      } else {
        element.textContent = data[key];
      }
    }
  });

  // Special handling for education array
  const educationElement = document.getElementById('education');
  if (educationElement && data.education?.length) {
    educationElement.innerHTML = data.education
      .map(edu => `
        <div class="education-entry">
          <h3>${edu.schoolName ? `${edu.schoolName} - ` : 'Error: School name not found'}</h3>
          <p>${edu.degree ? `${edu.degree}` : 'Error: Degree not found'}</p>
          <p>${edu.date ? `${edu.date}` : 'Error: Date not found'}</p>
          ${edu.description ? `<p>description: ${edu.description}</p>` : '<p>description: N/A</p>'}
        </div>
      `)
      .join('');
  }

  // Special handling for skills array
  const skillsElement = document.getElementById('skills');
  if (skillsElement && data.skills?.length) {
    skillsElement.innerHTML = data.skills.join(', ');
  }

}

