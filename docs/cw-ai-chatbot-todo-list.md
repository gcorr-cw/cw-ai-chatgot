ai-chatbot-3-Todos


# What new for staff?

Modern features - canvas, attachments, image creation, reasoning models, sensitive information, ability to scoll up during ai responses

What's coming: SAML


# Todos:

!! Document key procedures for EB deploy before I forget

## Beta punch list
* Implement email OTP and Forgot password
* IP Allowlist
* Communcation RE senstive info and only authorized beta testers
* Where to house beta/production site
* Create dev sandbox backend resources (S3/RDS)

## Misc todos:
* small code blocks are being rendered as full-width and force a line wrap
* Add function to remember last model used with each prior chat history (maybe extend DB scheme?)
* Add a copy URL to clipboard function and/or mailto link when selecting for "public" (if neither than a toast message to copy and share URL and user must be CW employee signed in to app)
* [done, but confirming] Fix code artifact prompt that thinks it can only code in python
* Auto scroll users submission to top of page on subsequent submission
* Allow the chat messages area to grow a little wider if the window is wide.
* Add paste to markdown page in app (and maybe a markdown editor)
* Add a floating feedback option for staff to provide feedback on the app
* The document artifact doesn't work great when the user requests modifications to specific section of the generated content, it frequently will only generate that section instead of the full document. - Compare behavior with ChatGPT. It seem that the system instructions for this feature need to be updated.
* Fix mic text output line wrap below attach and mic icons
* Add delete all chats option at the bottom of the sidebar? i don't think so, chatgpt doesn't have that feature.


## Long term
* Search chat history (full text as phase II)


## Completed enhancements:

* Enable file attachments (images and text for 4o and PDFs for Sonnet)
* Moved avatar menu and moved username into the menu
* Improved app styling to look more like ChatGPT
* Added copy to clipboard icons for AI response message code block
* Allow user to stop auto-scroll-down during AI responses by scrolling up
* Added fade-in resume-auto-scroll-down button when scrolled up
* Forced auto-scroll-down on every new submitted chat
* Restrict Cognito auth to @centralwcu.org email domain
* Added simple speech to text input (mic icon) via Web Speech API (15 sec timeout, auto stop on keyboard/mouse input or chat submit)
* Add chat rename
* Hid AI Assistant avatar
* Hid voting buttons
* Display full chat title on hover (tool tip)
* Change "public" to "shared" (require any user auth)

Fixed:


# Dev notes:
===========

### EB ai-chatbot install notes:

### Critical pre-build scripts that override EB's default NPM commands, one is for deployments (code updates) and the other is redeployments (EB config changes, scaling, etc.)
* .platform\confighooks\prebuild\01_pnpm.sh
* .platform\hooks\prebuild\01_pnpm.sh

		exec > /tmp/01_pnpm.log 2>&1
		set -x
		echo "Starting prebuild hook: Installing pnpm globally..."
		npm install -g pnpm --verbose
		echo "Removing any existing node_modules..."
		rm -rf node_modules
		echo "Installing dependencies with pnpm..."
		pnpm install
		echo "Building the app with pnpm build..."
		pnpm build
		echo "Prebuild hook completed."
		
Edit package.json


pnpm add @aws-sdk/client-s3
pnpm add @aws-sdk/s3-request-presigner
pnpm add @ai-sdk/anthropic


old: pnpm install pdf-parse


### misc commands
npx tsc --noEmit

### SSH server commands
ssh.exe -i BeanStalk.pem ec2-user@cw-ai-chatbot-4.us-west-2.elasticbeanstalk.com

### EB build output
tail -f /var/log/eb-engine.log
less /var/log/eb-engine.log

### App web server console output
sudo less /var/log/web.stdout.log
sudo tail -f /var/log/web.stdout.log

### view prebuild hook script output
less /tmp/01_pnpm.log
tail -f /tmp/01_pnpm.log