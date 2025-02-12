// Storage helper functions
async function saveProfile(profileData, connectionType) {
  try {
    // Validate connection type
    const validTypes = ['fellow-students', 'alumni', 'industry', 'recruiters', 'other'];
    if (!validTypes.includes(connectionType)) {
      console.error('Invalid connection type');
      return false;
    }

    // Get the profile URL consistently
    const profileUrl = profileData.profileUrl || profileData.linkedinUrl || profileData.profileURL || profileData.url || window.location.href;

    // Check if profile already exists
    const existingProfiles = await getProfiles();
    const isDuplicate = existingProfiles.some(profile => 
      profile.profileURL === profileUrl
    );

    if (isDuplicate) {
      console.log('Profile already exists');
      return { success: false, reason: 'duplicate' };
    }
    
    // Save the new profile
    await chrome.storage.local.set({
      [`profile_${Date.now()}`]: {
        ...profileData,
        savedAt: new Date().toISOString(),
        profileURL: profileUrl,
        connectionType: connectionType // Add connection type to stored data
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { success: false, reason: 'error' };
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

async function updateProfile(savedAt, updatedData) {
  try {
    const key = `profile_${new Date(savedAt).getTime()}`;
    const result = await chrome.storage.local.get(key);
    const existingProfile = result[key];
    
    if (!existingProfile) {
      console.error('Profile not found');
      return false;
    }

    // Merge existing profile with updated data, maintaining the original savedAt and profileURL
    const updatedProfile = {
      ...existingProfile,
      ...updatedData,
      savedAt: existingProfile.savedAt, // Keep original savedAt
      profileURL: existingProfile.profileURL // Keep original profileURL
    };

    await chrome.storage.local.set({ [key]: updatedProfile });
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
}

async function isProfileSaved(profileUrl) {
  const profiles = await getProfiles();
  const savedProfile = profiles.find(profile => profile.profileURL === profileUrl);
  return savedProfile || null;
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

async function deleteGeneratedMessage(RecipientName) {
  try {
    const existingMessages = await getGeneratedMessage();
    const updatedMessages = existingMessages.filter(message => message.RecipientName !== RecipientName);
    await chrome.storage.local.set({ generatedMessages: updatedMessages });
    return true;
  } catch (error) {
    console.error('Error deleting generated message:', error);
    return false;
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

// Template management functions
async function saveTemplate(template) {
  try {
    // Get existing templates
    const result = await chrome.storage.local.get('messageTemplates');
    const existingTemplates = result.messageTemplates || [];
    
    // Create new template object with ID and timestamp
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    // Add new template to the array
    existingTemplates.push(newTemplate);
    
    // Store the updated templates array
    await chrome.storage.local.set({ messageTemplates: existingTemplates });
    return true;
  } catch (error) {
    console.error('Error saving template:', error);
    return false;
  }
}

async function getTemplates() {
  try {
    const result = await chrome.storage.local.get('messageTemplates');
    return result.messageTemplates || [];
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
}

async function deleteTemplate(templateId) {
  try {
    const result = await chrome.storage.local.get('messageTemplates');
    const templates = result.messageTemplates || [];
    const updatedTemplates = templates.filter(template => template.id !== templateId);
    await chrome.storage.local.set({ messageTemplates: updatedTemplates });
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

async function updateTemplate(templateId, updatedData) {
  try {
    const result = await chrome.storage.local.get('messageTemplates');
    const templates = result.messageTemplates || [];
    const updatedTemplates = templates.map(template => 
      template.id === templateId ? { ...template, ...updatedData } : template
    );
    await chrome.storage.local.set({ messageTemplates: updatedTemplates });
    return true;
  } catch (error) {
    console.error('Error updating template:', error);
    return false;
  }
}

// Add this function to get a specific template
async function getSpecificTemplate(templateId) {
  try {
    const result = await chrome.storage.local.get('messageTemplates');
    const templates = result.messageTemplates || [];
    return templates.find(template => template.id === templateId) || null;
  } catch (error) {
    console.error('Error getting specific template:', error);
    return null;
  }
}

// Chat conversation history functions
async function saveChatHistory(profileId, history) {
  try {
    const key = `chat_history_${profileId}`;
    await chrome.storage.local.set({ [key]: history });
    return true;
  } catch (error) {
    console.error('Error saving chat history:', error);
    return false;
  }
}

async function getChatHistory(profileId) {
  try {
    const key = `chat_history_${profileId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

async function clearChatHistory(profileId) {
  try {
    const key = `chat_history_${profileId}`;
    await chrome.storage.local.remove(key);
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
}

// Feedback management functions
async function saveFeedback(feedback) {
  try {
    // Get existing feedback
    const result = await chrome.storage.local.get('userFeedback');
    const existingFeedback = result.userFeedback || [];
    
    // Add new feedback to array
    existingFeedback.push(feedback);
    
    // Store updated feedback array
    await chrome.storage.local.set({ userFeedback: existingFeedback });

    // Also send feedback to your server or email if you want
    try {
      await sendFeedbackToServer(feedback);
    } catch (error) {
      console.error('Error sending feedback to server:', error);
      // Still return true since we saved locally
    }
    
    return true;
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
}

// Encrypted EmailJS credentials
const ENCRYPTION_KEY = 'NetLinked_Secure_Key_2024';

const ENCRYPTED_CREDENTIALS = {
  key: "KWtOOjd8eDU9me+d/sDsetILog9Eg1N2Ar7u06nxkBQPPImr/cJSEbKr1nTb",
  template: "D/QyYQ9VNIq9IXXQ6cLKkGkTQ1hBMOMz6/kYKA4XRtfx3+MZ2BJ9ICixSw==",
  service: "61Az8ad8IuaESDeRUN/qJ5oNTTws23OQbOVSZ+VK9T43fkWUmGDlQishWOI="
};

// Function to decrypt credentials at runtime
async function getEmailJSCredentials() {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_KEY),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('NetLinkedSalt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt each credential
    const decryptCredential = async (encryptedData) => {
      // Base64 decode and split into parts
      const decoded = atob(encryptedData);
      const data = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        data[i] = decoded.charCodeAt(i);
      }

      // First 12 bytes are IV, rest is encrypted data
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    };

    // Decrypt all credentials
    const publicKey = await decryptCredential(ENCRYPTED_CREDENTIALS.key);
    const templateId = await decryptCredential(ENCRYPTED_CREDENTIALS.template);
    const serviceId = await decryptCredential(ENCRYPTED_CREDENTIALS.service);

    return {
      publicKey,
      serviceId: templateId,  // These are swapped intentionally
      templateId: serviceId   // These are swapped intentionally
    };
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    return null;
  }
}

async function sendFeedbackToServer(feedback) {
  try {
    // Get decrypted credentials
    const credentials = await getEmailJSCredentials();
    if (!credentials) {
      throw new Error('Failed to get EmailJS credentials');
    }

    console.log('Sending feedback to server...');
    const requestBody = {
      service_id: credentials.serviceId,
      template_id: credentials.templateId,
      user_id: credentials.publicKey,
      template_params: {
        rating: feedback.rating,
        features: feedback.features.join(', '),
        improvements: feedback.improvements || 'No improvements suggested',
        issues: feedback.issues || 'No issues reported',
        additional: feedback.additional || 'No additional comments',
        timestamp: feedback.timestamp,
        version: feedback.version,
        user_name: feedback.clientProfile?.name || 'Anonymous',
        user_email: feedback.clientProfile?.email || 'Not provided'
      }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to send feedback email: ${response.status} ${responseText}`);
    }

    console.log('Feedback sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending feedback:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to send feedback email: ${error.message}`);
  }
}

async function getFeedback() {
  try {
    const result = await chrome.storage.local.get('userFeedback');
    return result.userFeedback || [];
  } catch (error) {
    console.error('Error getting feedback:', error);
    return [];
  }
}