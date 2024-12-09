// Storage helper functions
async function saveProfile(profileData) {
  try {
    await chrome.storage.local.set({
      [`profile_${Date.now()}`]: {
        ...profileData,
        savedAt: new Date().toISOString(),
        linkedinUrl: profileData.profileUrl || window.location.href
      }
    });
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
}

async function getProfiles() {
  try {
    const result = await chrome.storage.local.get(null);
    return Object.entries(result)
      .filter(([key]) => key.startsWith('profile_'))
      .map(([_, value]) => value)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch (error) {
    console.error('Error getting profiles:', error);
    return [];
  }
}

async function deleteProfile(savedAt) {
  try {
    const key = `profile_${new Date(savedAt).getTime()}`;
    await chrome.storage.local.remove(key);
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    return false;
  }
}

async function openProfileUrl(savedAt) {
  try {
    const key = `profile_${new Date(savedAt).getTime()}`;
    const result = await chrome.storage.local.get(key);
    const profile = result[key];
    console.log(profile);
    console.log(profile?.profileURL);
    
    if (profile?.profileURL) {
      chrome.tabs.create({ url: profile.profileURL });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error opening profile URL:', error);
    return false;
  }
} 