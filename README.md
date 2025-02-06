Features:
- Extracts important information from the LinkedIn profile
- Draft a introduction message for a LinkedIn connection request

Future features:
    - Learn about the person you are connecting with and see if 
        they are a good fit for your network
    - Automatically send connection requests
    - Automatically follow-up on connection requests
    - Automatically send messages to your network to increase your visibility 
    - Ask AI questions with the context of you and the person you are connecting with 


## Installation
1. Clone the repository
2. Turn on developer mode in Chrome
3. Open the extension settings page
4. Click on "Load unpacked"
5. Select the "netlinked" folder

## What is this?
This is a tool that helps you connect with people on LinkedIn. It uses the Gemini API to generate a draft of an introduction message for a LinkedIn connection request.

## How does it work?
1. The tool extracts important information from the LinkedIn profile
2. The tool uses the Gemini API to generate a draft of an introduction message for a LinkedIn connection request
3. The tool sends the draft to the user
4. The user can then edit the draft before sending it

## Setup
1. Copy `config.example.js` to `config.js`
2. Add your Gemini API key to `config.js`

## TODO
- somehow keep the given gemini secret key secure
- create the templates for the generated messages
