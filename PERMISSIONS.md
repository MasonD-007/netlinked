# NetLinked Extension Permissions Justification

This document provides detailed justification for each permission requested by the NetLinked Chrome extension.

## Manifest Permissions

### Core Permissions

1. `"activeTab"`
   - **Justification**: Required to access and interact with the active LinkedIn tab
   - **Usage**: Reads profile information and modifies the connection UI when the user is on a LinkedIn profile
   - **Why Necessary**: This is the most privacy-friendly way to interact with tabs, as it only grants access when the user is actively using the extension

2. `"scripting"`
   - **Justification**: Required for content script injection into LinkedIn pages
   - **Usage**: Enables the extension to read profile data and modify the connection interface
   - **Why Necessary**: Without this permission, the extension cannot interact with LinkedIn page content

3. `"storage"`
   - **Justification**: Required for saving user preferences and extension data
   - **Usage**: Stores user settings, API keys, and potentially cached data
   - **Why Necessary**: Ensures persistence of user preferences and improves extension functionality

4. `"clipboardWrite"`
   - **Justification**: Required for copying generated connection messages
   - **Usage**: Allows users to easily copy AI-generated messages to clipboard
   - **Why Necessary**: Enhances user experience by providing quick access to generated content

### Host Permissions

1. `"https://*.linkedin.com/*"`
   - **Justification**: Required for core extension functionality
   - **Usage**: Allows the extension to operate on LinkedIn website
   - **Why Necessary**: Essential for accessing LinkedIn profiles and connection features

2. `"https://api.emailjs.com/*"`
   - **Justification**: Required for EmailJS API integration
   - **Usage**: Enables email-related functionality
   - **Note**: If EmailJS is not being used, this permission should be removed

## Content Security Policy

The CSP includes:
- `script-src 'self'`: Ensures scripts only run from extension source
- `object-src 'self'`: Restricts object sources to extension
- `connect-src`: Allows connections to:
  - EmailJS API
  - Google's Generative Language API

## Notes

- All permissions are minimal and necessary for core functionality
- Permissions follow the principle of least privilege
- No broad host permissions are requested beyond what's needed
- The extension does not request unnecessary permissions like `webRequest` 