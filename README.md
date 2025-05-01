# PawMoji

A charming kaomoji clipboard for effortlessly adding kawaii faces to your text.

> Version 0.0.6 Beta
---

## 🚀 Features

- **Instant Copy-Paste**  
  Click any kaomoji to automatically copy it to your clipboard with a “Copied!” toast.
- **Tag-Based Filtering**  
  Predefined tag buttons let you filter your collection—no typing needed.  
- **Light & Dark Themes**  
  Toggle between Catppuccin Latte (light) and Mocha (dark) palettes; your choice persists between sessions.  
- **Global Hotkey**  
  Bring PawMoji to front or hide it with `Ctrl + Shift + P` (customizable in `settings.json`).  
- **Database Manager**  
  Under **Settings → KaomojiDB**, open the editor window to add, update, or delete entries.  
- **Auto-Correct Tags**  
  When editing tags, small typos (≤ 1 edit) auto-correct to existing tags.  
- **Responsive & Animated**  
  Window resizes smoothly, and UI elements animate on hover and click.  

---

## 📦 Installation

#### 1. Pre-Compiled Download:

1. **Download the pre-compled binary for your operating system and execute.**


#### 2. Development Setup:

1. **Clone & Install**  
   ```bash
   git clone https://github.com/MrMidnight7331/PawMoji.git
   cd pawmoji
   npm install
   ```
2. **Run in Development**  
   ```bash
   npm start
   ```
3. **Build for Distribution**  
   ```bash
   npm run build
   ```
   Generates installers in `dist/` for your platform.

---

## 🖥️ Usage

- **Open PawMoji**  
  - From your Applications/Start menu or via `npm start`.  
  - Press your global hotkey (`Ctrl + Shift + P` by default) to hide or display the active window.  
- **Copy a Kaomoji**  
  - Click any displayed kaomoji; it’s copied and a “Copied!” bubble appears.  
- **Filter by Tag**  
  - Click “Show All” or any tag button to refresh the list.  
  - Buttons wrap and remain centered up to a 400 px width.  
- **Switch Theme**  
  - Toggle the slider next to “Show All” to switch palettes.  
- **Manage Database**  
  - Go to **Settings → KaomojiDB** to open the DB editor.  
  - Click **＋** to add a row, fill in kaomoji & tags, then save (💾).  
  - Delete unwanted entries with the 🗑️ button.  
  - Editor window auto-resizes (max 800 px tall) and scrolls as needed.

---

## ⚙️ Configuration

- **Data Folder**  
  On first run, choose where to store:  
  - `kaomoji.db` – your kaomoji entries  
  - `settings.json` – stores theme & hotkey  
- **settings.json**  
  Located in your chosen folder, e.g. `~/Documents/PawMoji/settings.json`:
  ```json
  {
    "theme": "dark",
    "hotkey": "CommandOrControl+Shift+P"
  }
  ```
- **styles.css**  
  Template shipped in `src/styles.css` – copy to your data folder and tweak colors, fonts, or animations; PawMoji auto-loads it on launch.

---

## 🎨 Theming

PawMoji leverages [Catppuccin](https://github.com/catppuccin/catppuccin) color palettes:

- **Latte (light)** – rosewater, flamingo, mauve, peach, green, blue…  
- **Mocha (dark)** – rosewater, flamingo, mauve, peach, green, blue…  

Customize these in your local `styles.css` under `:root` (light) and `.dark-theme` (dark) variables.

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch: `git checkout -b feature/my-feature`  
3. Commit changes: `git commit -am "Add my feature"`  
4. Push: `git push origin feature/my-feature`  
5. Open a Pull Request

---

## 📜 License
[MIT](./LICENSE) © MrMidnight

---

Enjoy adding kawaii flair to your text with PawMoji! 🐾✨