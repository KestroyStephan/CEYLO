# Set the hostname environment variable for Expo
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "10.78.119.3"

# Start Expo with LAN and Expo Go mode
# (Note: --host only accepts 'lan', 'tunnel', or 'localhost')
npx expo start --clear --go --host lan
