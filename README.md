# Sophos Automatic Login & Authentication Mobile Application

This project provides scripts and applications to automate the login process for Sophos captive portals, specifically targeting mobile platforms (iOS and Android).

## Features

- **Store Multiple Credentials:** Securely store username/password pairs.
- **Automatic Login:** Attempt login using stored credentials until success.
- **Logout Functionality:** Log out currently active sessions.
- **Platform-Specific Implementations:**
  - **iOS:** Uses Scriptable app for running JavaScript-based login/logout scripts. Stores credentials in iCloud Drive.
  - **Android:** Uses Kivy framework for a simple GUI application and a command-line interface (CLI) script. Stores credentials locally.

## Setup

### iOS (Scriptable)

1.  Install the [Scriptable](https://scriptable.app/) app from the App Store.
2.  Copy the `login.js` and `logout.js` files from the `ios/` directory into Scriptable's iCloud Drive folder (`iCloud Drive/Scriptable/`).
3.  Run the `login.js` script once to create the `credentials.json` file and add your credentials when prompted.

### Android (Kivy App / CLI)

1.  **CLI:**
    - Ensure you have Python 3 installed.
    - Navigate to the `android/` directory.
    - Run `python cli.py` to manage credentials and perform login/logout.
2.  **Kivy App (Build):**
    - Install Buildozer: `pip install buildozer`
    - Navigate to the `android/` directory.
    - Run `buildozer android debug` to build the APK. (Requires Android SDK/NDK setup).
    - Install the generated APK on your Android device.

## Usage

### iOS

- Run the `login.js` script from Scriptable to log in.
- Run the `logout.js` script from Scriptable to log out.
- You can create home screen widgets or Siri shortcuts in Scriptable for easier access.

### Android

- **CLI:** Use the commands `l` (login), `o` (logout), `a` (add), `q` (quit) in the interactive prompt.
- **App:** Launch the "SophosAutoLogin" app and use the buttons to Login, Logout, or Add Credentials.
