
# Art-Art-Art Project Setup Guide

## Preparing the Environment

### Step 1: Open VS Code
- Launch Visual Studio Code on the computer.

### Step 2: Open the Art-Art-Art Project
- If the project is already available locally, proceed to step 3.
- If the project is not available locally, it can be cloned from GitHub using one of the following methods:

#### Method 1: Using Command Palette
1. Press `Ctrl + Shift + P` to open the Command Palette.
2. Type `Git: Clone` and select the option.
3. Enter the repository URL and choose the local directory where the repository will be cloned.

#### Method 2: Using Git Command
1. Open the terminal in VS Code.
2. Navigate to the desired local directory before executing the command.
3. Run the following command:
   ```bash
   git clone https://github.com/sui001/Art-Art-Art.git
   ```
   


### Step 3: Checkout to the Wled Branch
- After cloning the repository, switch to the Wled branch using one of the following methods:

#### Method 1: Using Command Palette
1. Press `Ctrl + Shift + P` to open the Command Palette.
2. Type `Git: Checkout to...` and select the option.
3. Select  `Wled` branch, if the branches don't show up, type `Wled` and press Enter to switch to the branch.

#### Method 2: Using Git Command
1. Open the terminal in VS Code.
2. Run the following command:
   ```bash
   git checkout Wled
   ```

### Step 4: Navigate to the Wled Directory
- In the terminal, navigate to the Wled directory by entering:
   ```bash
   cd Wled
   ```

### Step 5: Ensure WiFi Connection
- Ensure that both the LED setup and the computer are connected to the same WiFi network.

### Step 6: Run the Program
- In the terminal, run the following command to start the server:
   ```bash
   node ./server.js
   ```
### Step 7: Additional Operation
- Ensure the `ws` and `serialport` library have been install. If Step 6 results in an error, try:  
   ```bash
   npm install ws
   ```
   and 
   ```bash
   npm install serialport
   ```
### Step 6: Kill the Program
-  Press `Ctrl + C` to end the server:
   
