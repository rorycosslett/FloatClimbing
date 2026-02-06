# Float Climbing

A React Native mobile app for tracking your climbing sessions, logging sends and attempts, and viewing progress insights.

## Features

- **Log Climbs**: Track sends and attempts for boulder, sport, and trad climbing
- **Session Tracking**: Group climbs by session with start/end times
- **History View**: Browse past climbs organized by date and session
- **Insights**: View analytics and statistics per climb type

## Tech Stack

- React Native with Expo (SDK 54)
- TypeScript
- React Navigation (bottom tabs)
- AsyncStorage for local persistence
- React Context for state management

## Supported Grades

| Type    | Range       |
| ------- | ----------- |
| Boulder | V0 - V17    |
| Sport   | 5.6 - 5.15d |
| Trad    | 5.6 - 5.15d |

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator, or Expo Go app on your device

### Installation

```bash
# Clone the repository
git clone https://github.com/rorycosslett/ClimbTracker.git
cd ClimbTracker

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

## Project Structure

```
FloatClimbing/
├── src/
│   ├── context/       # React Context providers
│   ├── screens/       # App screens (Log, History, Insights)
│   ├── types/         # TypeScript type definitions
│   └── data/          # Grade data and storage utilities
├── assets/            # App icons and images
├── App.tsx            # Root component with navigation
└── index.ts           # Entry point
```

## Scripts

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `npm start`         | Start Expo development server |
| `npm run ios`       | Run on iOS simulator          |
| `npm run android`   | Run on Android emulator       |
| `npm run web`       | Run in web browser            |
| `npm run lint`      | Run ESLint                    |
| `npm run lint:fix`  | Run ESLint with auto-fix      |
| `npm run format`    | Format code with Prettier     |
| `npm run typecheck` | Run TypeScript type checking  |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
