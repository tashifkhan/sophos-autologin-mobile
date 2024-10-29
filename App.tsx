import { StatusBar } from 'expo-status-bar';

import './global.css';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <>
      {/* <StatusBar style="auto" /> */}
      <View className="flex-1 justify-center bg-black">
        <Text className="mx-auto text-2xl text-pink-200">Native Wind</Text>
      </View>
    </>
  );
}
