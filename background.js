console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROFILE_DATA') {
    console.log("Profile data received:", message.data);
    // Do something with the profile data
    // For example, store it, process it, or send it to an API
  }
  
  // Always send a response
  sendResponse({ status: 'success', message: "Profile data received" });
});