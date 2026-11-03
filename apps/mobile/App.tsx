import { StatusBar, Text, View } from "react-native";
import "./global.css";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-[#f7f9fc] px-6">
      <Text className="text-2xl font-semibold text-[#142d4e]">Interlink</Text>
      <Text className="mt-3 text-center text-base text-[#748094]">
        Mobile application foundation
      </Text>
      <StatusBar barStyle="dark-content" />
    </View>
  );
}
