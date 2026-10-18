# Install Meta Black 1.1.0

Verified on **Safari 26.6.2 (21624.5.1.11.3)** and **macOS 26.6.2**. Safari's **Add Temporary Extension…** control was verified in its Developer settings. The temporary workflow needs no Xcode or signing certificate.

## Install now — no build or signing needed

1. Open Safari → **Settings…**. If the Developer tab is missing, open **Advanced** and turn on **Show features for web developers**.
2. Open **Developer** → **Add Temporary Extension…**.
3. Select the repository's `extension` folder containing `manifest.json`. Alternatively, run `python3 scripts/package.py` from the repository directory and select the generated `MetaBlack-Safari.zip` in its parent directory. Do not select the whole project or a GitHub source archive.
4. Complete Safari's unsigned-extension authentication prompt yourself if it appears. Safari may ask you to authenticate using your Mac account. No account credentials belong in the extension.
5. In **Settings → Extensions**, select **Meta Black** and enable it. Grant website access to **business.facebook.com** and **adsmanager.facebook.com**. Use the per-site Allow/Always Allow choice for these hosts; there is no need to allow all websites.
6. If you use profiles, open **Settings → Profiles → your Meta profile → Extensions** and enable Meta Black there as well.
7. Refresh any Meta tabs already open at installation once. Newly opened supported pages load the extension automatically. Open the **Meta Black** toolbar button and use **True-black theme** to turn it off/on. The theme is on by default; changes apply immediately to all already-initialized supported tabs with website access.

If the toolbar button is absent, check that the extension is enabled for the current profile, then use Safari's toolbar customization to add its button if necessary.

**Temporary-install lifetime:** Safari removes this installation after 24 hours or when Safari quits. Re-add the ZIP to use it again. Preference storage belongs to the installed extension identity; a newly assigned temporary identity may start with the default on setting. For an app-backed installation, use the next workflow.

## Optional — create a signed macOS containing app

This avoids the temporary-extension lifetime. It requires full Xcode and your signing identity. No signed app or Xcode build is claimed to have been produced on this Mac.

1. Install **Xcode** from the Mac App Store. Launch it and complete Apple's first-run setup, components and license prompts yourself.
2. In Terminal, change into the cloned repository directory and run (assuming Xcode is installed at `/Applications/Xcode.app`):

   ```sh
   DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer bash scripts/package-safari.sh
   ```

3. The script finds Apple's `safari-web-extension-packager`, or its earlier name `safari-web-extension-converter`. Follow the tool's prompts: choose **macOS**, **Swift**, app name **Meta Black**, and an identifier unique to you, such as `com.yourname.MetaBlack`. Keep the generated project under `MetaBlack/build/Safari` or the location the tool reports.
4. Open the generated `.xcodeproj`. Select the containing **macOS app** target and the **Safari Web Extension** target. For both, open **Signing & Capabilities**, choose your Apple Developer team/identity, and resolve signing prompts. Use automatic signing if appropriate for your account. Xcode may require you to sign into your Apple account.
5. Select the macOS containing-app scheme and **My Mac**, then choose **Product → Run**. Running the containing app registers the embedded extension with Safari. Resolve any manifest compatibility warnings reported by your installed packager before relying on the build.
6. Enable the app-backed Meta Black in Safari and grant access to the two sites as above. Remove the temporary copy first so two copies do not theme the page simultaneously. Keep the containing app installed in a stable location; configure its profile access.

For local development without a certificate, Apple's sample supports **Signing Certificate → Sign to Run Locally**, with **Team → None**, on both targets. Safari then needs **Settings → Developer → Allow unsigned extensions**, authenticated by you. That setting resets when Safari quits. Use a valid signed build for routine use. App Store/TestFlight distribution requires the applicable Apple Developer Program membership and Apple's distribution/signing steps; it is optional for the temporary workflow above.

## Upgrade an existing temporary installation to 1.1.0

The updated ZIP is `MetaBlack-Safari.zip`. In Safari Settings → Extensions, select Meta Black and use Reload if it reloads your original source folder/archive. Check that the displayed version (or popup footer) is 1.1.0. If it remains 1.0.0, remove the temporary copy and use Developer → Add Temporary Extension… with the updated ZIP. Enable it for the same profile/hosts. Refresh supported tabs once to dispose of the old observer and styling. Do not run both versions at once.

## Disable, restore, update or remove

- **Restore Meta immediately:** turn the toolbar toggle off. This removes the theme from supported open tabs and stops its observer. Images and page state remain untouched.
- **Disable/uninstall in Safari Settings:** refresh any already-open Meta pages afterward. Safari can remove an extension's script context before it can clean an existing document, so a page reload is the reliable final cleanup after uninstalling.
- **Update a temporary copy:** rebuild the ZIP, use the extension's Reload control in Safari Settings, and refresh the Meta tabs once.
- **Update an app-backed copy:** rebuild the containing app in Xcode, then reload the Meta pages.

## If it stays light

Check the popup is on, both host permissions are allowed, the extension is enabled for the active profile, and the page was refreshed once after installing. Login/checkpoint pages, unsupported domains and embedded previews intentionally stay native. Disable another dark-theme extension for these two sites if its rules conflict. If a specific preview or control looks wrong, turn Meta Black off immediately and update the adapters described in SELECTORS.md.

Apple references: [Run and temporarily install a Safari web extension](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension), [Package a web extension for Safari](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari), [Build and test a Safari web extension](https://developer.apple.com/documentation/safariservices/building-and-testing-a-safari-web-extension).
