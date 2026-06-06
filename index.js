/**
 * @format
 */

// Must be the very first import — polyfills globalThis.crypto.getRandomValues
// using the platform's CSPRNG (SecureRandom on Android, SecRandomCopyBytes on iOS).
// Required by @noble/hashes (transitive dep of bitcoin-tx-lib) in the Hermes runtime.
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
