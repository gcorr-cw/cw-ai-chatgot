ai-chatbot-3-Todos

# What new for staff?
* AUP - Modern features - canvas, attachments, image creation, reasoning models, sensitive information, ability to scoll up during ai responses, web search, speech to text, chat history search
* What's coming: SAML

# Todos:

!! Document key procedures for EB deploy before I forget

## Alpha testers
* Enroll a few more beta testers
* Have a few testers compare results with ChatGPT using the same models and queries
* Need to find and fix bugs RE artifacts getting lost in results and "stuck pending document updates" issue, which may be related to the artifacts getting lost* Communication RE senstive info and only authorized beta testers

## Pilot testing launch punch list
* Enable speech-to-text input.
* Fix issues with attachment uploads failing if the first attempt failed or got blocked.* Implement email OTP and Forgot password.
* Where to house production site, I think we need to start leadership/IT beta in production to allow sensitive info. This will also allow dev to continue in sandbox without conflicting with production services and backend resources (EB/S3/RDS).
* System sizing.
* What URL do we use for production? Internal only with internally signed cert?
* Need time with Bryan to plan production deployment (VPC, ACLs, DNS, Certs, set with broad access out to start, no SSL decryption).
* Make sidebar open by default for new users.
* Remove vote DB queries, this will multiple with more users!
* Fix resume scroll down icon so it doesn't overlap the input box when the input box grows due to long text input.
* Reset model to default on new chat or when selecting an existing chat, if o3mini is selected


## Production todos:
* Move sensitive environment variables to AWS SSM or some secure solution
* Implement Cognito or SAML
* IP Allowlist or non-public VPC subnets

## Misc todos:
* Clear model selector attachment toast error as if a supported model is selected before the toast timeout expires
* The document artifact doesn't work great when the user requests modifications to specific section of the generated content, it frequently will only generate that section instead of the full document. - Compare behavior with ChatGPT. It seem that the system instructions for this feature need to be updated.* Centralize icons and buttons
* ?Add function to remember last model used with each prior chat history (maybe extend DB scheme?)
* Add a copy URL to clipboard function and/or mailto link when selecting for "public" (if neither than a toast message to copy and share URL and user must be CW employee signed in to app)
* Auto scroll users submission to top of page on subsequent submission
* Allow the chat messages area to grow a little wider if the window is wide.
* Add a floating feedback option for staff to provide feedback on the app
* Add delete all chats option at the bottom of the sidebar? i don't think so, chatgpt doesn't have that feature.
* Add "download" image button in the image artifact
* Add "share" image button in the image artifact


## CW-chatgptv2 feeedback 


## Long term


## Completed enhancements:
* Enabled PDF file attachments for 4o and 4o-mini
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
* small code blocks are being rendered as full-width and force a line wrap and generating numerous browser errors
* Add drag drop file upload functionality
* Block use of models if chat has unsupported attachment types, or customize the toast error; block use of file uploads of types not supported by models
* Add paste image to input box functionality
* Improve nodel selection drop down names and descriptions - simplify for staff, but allow full model names for advanced users (maybe an advanced toggle to expand the models and names?)
* Search chat history (full text as phase II)
* Input box had no scroll bar and max height was way too high
* Several elements of Markdown formatting in the document artifact are broken  
* Fix outlines around buttons that appear on occasion, the user-nav, model selector when text is entered into the input box. And fix the generate menu, if you open it and then click outside of it, it will close and create an outline around it and not let you type until you click into the input box a second time. 
* Add paste to markdown page in app (and maybe a markdown editor)
* Fix code artifact prompt that thinks it can only code in python


Fixed:
* Fix chat history menu icon outline after clicking on it
* Fix narrow view right side overflow
* Copy AI assitant message function is broken, it only copies the first word or drops the last word or few words
* Fix mic text output line wrap below attach and mic icons
* Fix o3 mini response markdown rendering w/ `──────────────────────────────`. Find out what is returned by the LLM in the raw response.


# Dev notes:
===========

### EB ai-chatbot install notes:

### Critical pre-build scripts that override EB's default NPM commands, one is for deployments (code updates) and the other is redeployments (EB config changes, scaling, etc.)
* .platform\confighooks\prebuild\01_pnpm.sh
* .platform\hooks\prebuild\01_pnpm.sh
		
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

!! IMPORTANT step: Use Git Bash console to make prebuild hook scripts executable: `chmod +x .platform/confighooks/prebuild/01_pnpm.sh` and `chmod +x .platform/hooks/prebuild/01_pnpm.sh` 

Edit `package.json`; under scripts add: `"start": "next start -p 8080 -H 0.0.0.0"`,

Create `Procfile` in root directory with: `web: pnpm start`

pnpm add @aws-sdk/client-s3
pnpm add @aws-sdk/s3-request-presigner
pnpm add @ai-sdk/anthropic


old: pnpm install pdf-parse


### misc commands
npx tsc --noEmit
npx eslint .

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