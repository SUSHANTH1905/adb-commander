# ⚡ ADB Commander 

### Android Debug Bridge Web UI

ADB Commander Pro is a **web-based interface for controlling Android devices using ADB (Android Debug Bridge)**. It provides an easy-to-use dashboard to manage Android devices directly from a browser without using command-line tools.

## 🚀 Live Deployment

Frontend (Web Interface)
https://adbcommander.onrender.com/

Backend API (FastAPI Server)
https://adb-commander-rqaq.onrender.com/


## 🛠 Technologies Used

* Backend: Python with FastAPI
* Frontend: JavaScript + Vite
* Device Communication: ADB (Android Debug Bridge)
* Deployment Platform: Render


## ✨ Features

📡 Wireless ADB Connection
Connect Android devices using WiFi debugging.

📱 Device Monitoring
View connected Android devices.

📦 App Manager
Install and uninstall applications.

🗂 File Browser
Access and manage device storage.

📞 Call Interface
Interact with device call functions.

💬 Messages Access
View and manage SMS.

🔔 Notifications Viewer
Monitor Android notifications.

📺 Screen Share
Mirror the Android screen.

🎮 Input Controller
Send input commands to the device.

📸 Screenshot Tool
Capture screenshots directly from the browser.

## 📡 Wireless ADB Setup

### Method 1 – TCP/IP Connection

1. Connect the phone via USB.
2. Enable TCP/IP debugging.
3. Disconnect USB.
4. Enter the device IP and port (default: 5555).
5. Click Connect.

### Method 2 – Android 11+ Wireless Pairing

1. Enable **Wireless Debugging** in Developer Options.
2. Select **Pair Device with Code**.
3. Enter pairing IP, port, and 6-digit code.


## ▶ Running Locally

Install frontend dependencies

npm install

Run frontend

npm run dev

Run backend

uvicorn main:app --reload


## ⚠ Requirements

* Android device with USB debugging enabled
* ADB installed (Android SDK Platform Tools)
* Python environment for backend


## 👨‍💻 Author

G V Sushanth

GitHub: https://github.com/SUSHANTH1905
