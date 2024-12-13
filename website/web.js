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
        document.getElementById('mainContentHeader').innerHTML = '';
    });
    document.getElementById('Messages').addEventListener('click', () => {
        document.getElementById('mainContent').classList.remove('hidden');
        setActive('Messages');
        console.log("switched to messages");
        document.getElementById('mainContentHeader').innerHTML = '';
        document.getElementById('data').textContent = "Messages page";
    });
    document.getElementById('Settings').addEventListener('click', () => {
        document.getElementById('mainContent').classList.remove('hidden');
        setActive('Settings');
        console.log("switched to settings");
        document.getElementById('mainContentHeader').innerHTML = '';
        document.getElementById('data').textContent = "Settings page";
    });
});

async function loadProfiles() {
    const profiles = await getProfiles();
    const mainContent = document.getElementById('mainContentHeader');
    
    if (profiles.length === 0) {
        mainContent.innerHTML = '<p>No profiles saved yet</p>';
        return;
    }

    let profilesHTML = '<div class="profiles-container">';
    profiles.forEach(profile => {
        console.log(profile);
        profilesHTML += `
            <div class="profile-card">
                <h3>${profile.name || 'Unknown Name'}</h3>
                <p>Saved: ${new Date(profile.savedAt).toLocaleDateString()}</p>
                <h3>Title</h3>
                <p>${profile.headline || 'No title'}</p>
                <h3>Location</h3>
                <p>${profile.location || 'No location'}</p>
                <h3>About</h3>
                <p>${profile.about || 'No about'}</p>
                <div class="profile-actions">
                    <button onclick="openProfileUrl('${profile.savedAt}')">Open Profile</button>
                    <button onclick="deleteProfile('${profile.savedAt}').then(loadProfiles)">Delete</button>
                </div>
            </div>
        `;
    });
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