// Storage helper functions
async function saveProfile(profileData) {
  try {
    // Ensure we have a consistent URL property
    const profileUrl = profileData.profileUrl || profileData.linkedinUrl || profileData.profileURL || profileData.url || window.location.href;
    
    await chrome.storage.local.set({
      [`profile_${Date.now()}`]: {
        ...profileData,
        savedAt: new Date().toISOString(),
        profileURL: profileUrl // Store URL consistently as profileURL
      }
    });
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
}

async function getSpecificProfile(savedAt) {
  try {
    const key = `profile_${new Date(savedAt).getTime()}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  } catch (error) {
    console.error('Error getting specific profile:', error);
    return null;
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

async function saveClientProfile(profileData) {
  try {
    // Ensure we have a consistent URL property
    const profileUrl = profileData.profileUrl || profileData.linkedinUrl || profileData.profileURL || profileData.url || window.location.href;
    
    await chrome.storage.local.set({ 
      clientProfile: { 
        ...profileData, 
        savedAt: new Date().toISOString(), 
        profileURL: profileUrl // Store URL consistently as profileURL
      } 
    });
    return true;
  } catch (error) {
    console.error('Error saving client profile:', error);
    return false;
  }
}

async function getClientProfile() {
  try {
    const result = await chrome.storage.local.get('clientProfile');
    return result.clientProfile || null;
  } catch (error) {
    console.error('Error getting client profile:', error);
    return null;
  }
}

async function deleteProfile(savedAt) {
  if (savedAt === await getClientProfile().savedAt) {
    console.error("Cannot delete client profile");
    return false;
  }
  try {
    const key = `profile_${new Date(savedAt).getTime()}`;
    await chrome.storage.local.remove(key);
    return true;
  } catch (error) {
    console.error('Error deleting profile:', error);
    return false;
  }
}

async function printProfile(savedAt) {
  try {
    const key = `profile_${new Date(savedAt).getTime()}`;
    const result = await chrome.storage.local.get(key);
    const profile = result[key];
    console.log(profile);
    return true;
  } catch (error) {
    console.error('Error printing profile:', error);
    return false;
  }
}

async function saveGeneratedMessage(message, RecipientData, messageType) {
  try {
    // Get existing messages first
    const result = await chrome.storage.local.get('generatedMessages');
    const existingMessages = result.generatedMessages || [];
    
    // Create new message object with timestamp
    const newMessage = {
      message: message,
      RecipientName: RecipientData.name,
      RecipientUrl: RecipientData.profileURL,
      messageType: messageType,
      timestamp: new Date().toISOString()
    };
    
    // Add new message to the beginning of the array
    existingMessages.unshift(newMessage);
    
    // Store the updated messages array
    await chrome.storage.local.set({ generatedMessages: existingMessages });
    return true;
  } catch (error) {
    console.error('Error saving generated message:', error);
    return false;
  }
}

async function getGeneratedMessage() {
  try {
    const result = await chrome.storage.local.get('generatedMessages');
    return result.generatedMessages || [];
  } catch (error) {
    console.error('Error getting generated messages:', error);
    return [];
  }
}

async function encryptData(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Generate a random key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  );
  
  // Export the key
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  
  return {
    encrypted: Array.from(new Uint8Array(encryptedData)),
    iv: Array.from(iv),
    key: Array.from(new Uint8Array(exportedKey))
  };
}

async function decryptData(encrypted, key, iv) {
  const importedKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    'AES-GCM',
    true,
    ['decrypt']
  );
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    importedKey,
    new Uint8Array(encrypted)
  );
  
  return new TextDecoder().decode(decryptedData);
}

async function saveAIApiKey(AItype, apiKey) {
  const aiList = ["gemini", "chatgpt", "claude"];
  if (!aiList.includes(AItype)) {
    console.error("Invalid AI type");
    return false;
  }
  
  try {
    const encryptedData = await encryptData(apiKey);
    await chrome.storage.local.set({ 
      [AItype]: encryptedData
    });
    return true;
  } catch (error) {
    console.error('Error saving API key:', error);
    return false;
  }
}

async function getAIApiKey(AItype) {
  const aiList = ["gemini", "chatgpt", "claude"];
  if (!aiList.includes(AItype)) {
    console.error("Invalid AI type");
    return null;
  }
  
  try {
    const result = await chrome.storage.local.get(AItype);
    if (!result[AItype]) return null;
    
    const decrypted = await decryptData(
      result[AItype].encrypted,
      result[AItype].key,
      result[AItype].iv
    );
    return decrypted;
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}