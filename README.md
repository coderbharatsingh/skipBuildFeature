# Skip Build Feature with Envoyer
This repository have a solution if we are using Envoyer for deployment. So let's understand how that works.

## Envoyer Deployment Flow
Envoyer creates a new release folder with the latest code from git on every deployment and execute the Envoyer hooks command one by one. If all commands execute successfully in the last step it will update the symbolic link from current release to latest release. So in that way there is no downtime with the website.

## Need of Skip Build Feature
If we are working with different technology or we have multiple npm commands for js build. Then this feature really helps us to save the deployment time. For e.g., if we have file change only with one npm command build files envoyer will execute all the npm build commands with every deployment and it will take time for generating build file but we can use the existing build files from the current release folder for those files which do not have code changes. So this feature compare the new release folder and current release folder files and detect the changes for files and if this feature do not found any changes in any files then all npm commands will skip and it will copy the current release files from current to new release path.

## How Skip Build Feature Works
This feature compare the current files to new commit files with the help of current and new release folder. It also uses the typescript alias to get proper import and export path to detect the whole chain of files and directories. And then it will copy the necessary files from public folder (like mix-manifest.json, build js files etc.) for those builds which does not have code changes.

## Benefits
In my current company, we have 10+ different npm commands which consume around 30 mins of time for every deployment but with skip build feature we have reduce the deployment time between 15-25 mins of time that is a huge improvement. Now the deployment complete between 5-15 mins of time which depends on the file changes for npm commands.
