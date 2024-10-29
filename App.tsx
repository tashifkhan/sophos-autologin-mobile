import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { XMLParser } from 'react-xml-parser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';

import './global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { NativeWindStyleSheet } from 'nativewind';
import DraggableFlatList, {
  RenderItemParams,
  DragEndParams,
} from 'react-native-draggable-flatlist';

// Type definitions
interface Credential {
  username: string;
  password: string;
}

interface LoginPayload {
  mode: string;
  username: string;
  password: string;
  a: string;
}

interface XMLResponse {
  getElementsByTagName: (tagName: string) => Array<{
    value: string;
  }>;
}

type StatusType = 'Idle' | 'Connected';

// NativeWindStyleSheet.setOutput({
//   default: 'native',
// });

const App: React.FC = () => {
  const [status, setStatus] = useState<StatusType>('Idle');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [sophosUrl, setSophosUrl] = useState<string>('http://172.16.68.6:8090/httpclient.html');

  useEffect(() => {
    loadCredentials();
    loadSophosUrl();
  }, []);

  const loadCredentials = async (): Promise<void> => {
    try {
      const storedCredentials = await AsyncStorage.getItem('credentials');
      if (storedCredentials) {
        setCredentials(JSON.parse(storedCredentials));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const loadSophosUrl = async (): Promise<void> => {
    try {
      const storedUrl = await AsyncStorage.getItem('sophosUrl');
      if (storedUrl) {
        setSophosUrl(storedUrl);
      }
    } catch (error) {
      console.error('Error loading Sophos URL:', error);
    }
  };

  const saveCredentials = async (newCredentials: Credential[]): Promise<void> => {
    try {
      await AsyncStorage.setItem('credentials', JSON.stringify(newCredentials));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const saveSophosUrl = async (url: string): Promise<void> => {
    try {
      await AsyncStorage.setItem('sophosUrl', url);
    } catch (error) {
      console.error('Error saving Sophos URL:', error);
    }
  };

  const addCredential = (): void => {
    if (newUsername && newPassword) {
      const newCredentials = [...credentials, { username: newUsername, password: newPassword }];
      setCredentials(newCredentials);
      saveCredentials(newCredentials);
      setNewUsername('');
      setNewPassword('');
    } else {
      Alert.alert('Invalid Input', 'Please enter both username and password.');
    }
  };

  const removeCredential = (index: number): void => {
    const newCredentials = credentials.filter((_, i) => i !== index);
    setCredentials(newCredentials);
    saveCredentials(newCredentials);
  };

  const addLog = (message: string): void => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const login = async (credential: Credential): Promise<boolean> => {
    const payload: LoginPayload = {
      mode: '191',
      username: credential.username,
      password: credential.password,
      a: new Date().getTime().toString(),
    };

    try {
      const response = await fetch(sophosUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: Object.entries(payload)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&'),
      });

      if (response.ok) {
        const xmlText = await response.text();
        const parser = new XMLParser();
        const xml: XMLResponse = parser.parseFromString(xmlText);
        const messageElement = xml.getElementsByTagName('message')[0];

        if (messageElement) {
          const messageText = messageElement.value;
          if (messageText === `You are signed in as ${credential.username}`) {
            setStatus('Connected');
            setCurrentUser(credential.username);
            addLog(`Connected using ${credential.username}`);
            return true;
          } else if (
            messageText === 'Login failed. You have reached the maximum login limit.' ||
            messageText === 'Your data transfer has been exceeded, Please contact the administrator'
          ) {
            addLog(`Login failed for ${credential.username}. Trying next credentials.`);
          } else {
            addLog(`Unknown response: ${messageText}`);
          }
        } else {
          addLog('Message element not found in response');
        }
      } else {
        addLog(`Error Response: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        addLog(`Network error: ${error.message}`);
      } else {
        addLog('An unknown error occurred');
      }
    }

    return false;
  };

  const logout = async (credential: Credential): Promise<boolean> => {
    const payload: LoginPayload = {
      mode: '193',
      username: credential.username,
      password: credential.password,
      a: new Date().getTime().toString(),
    };

    try {
      const response = await fetch(sophosUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: Object.entries(payload)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&'),
      });

      if (response.ok) {
        const xmlText = await response.text();
        const parser = new XMLParser();
        const xml: XMLResponse = parser.parseFromString(xmlText);
        const messageElement = xml.getElementsByTagName('message')[0];

        if (messageElement) {
          const messageText = messageElement.value;
          if (messageText === "You've signed out") {
            addLog(`Logged out ${credential.username}`);
            setStatus('Idle');
            setCurrentUser(null);
            return true;
          }
        } else {
          addLog('Message element not found in logout response');
        }
      } else {
        addLog(`Error Response during logout: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        addLog(`Network error during logout: ${error.message}`);
      } else {
        addLog('An unknown error occurred during logout');
      }
    }

    return false;
  };

  const runAutoLogin = async (): Promise<void> => {
    setIsRunning(true);
    setStartTime(new Date());
    let loginAttempt = 0;

    while (isRunning) {
      loginAttempt++;
      addLog(`Login attempt ${loginAttempt}`);

      for (const credential of credentials) {
        if (await login(credential)) {
          await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000)); // Wait for 2 minutes
          break;
        }
      }

      if (!isRunning) break;
    }

    setIsRunning(false);
    setStatus('Idle');
    setCurrentUser(null);
  };

  const stopAutoLogin = async (): Promise<void> => {
    setIsRunning(false);
    if (currentUser) {
      const credential = credentials.find((cred) => cred.username === currentUser);
      if (credential) {
        await logout(credential);
      }
    }
  };

  const handleManualLogout = async (): Promise<void> => {
    if (currentUser) {
      const credential = credentials.find((cred) => cred.username === currentUser);
      if (credential) {
        await logout(credential);
      }
    } else {
      addLog('No user currently logged in');
    }
  };

  const handleRelogin = async (): Promise<void> => {
    if (currentUser) {
      const credential = credentials.find((cred) => cred.username === currentUser);
      if (credential) {
        await logout(credential);
        await login(credential);
      }
    } else {
      addLog('No user currently logged in. Attempting to log in...');
      for (const credential of credentials) {
        if (await login(credential)) {
          break;
        }
      }
    }
  };

  const handleDragEnd = ({ data }: DragEndParams<Credential>): void => {
    setCredentials(data);
    saveCredentials(data);
  };

  useEffect(() => {
    return () => {
      if (isRunning && currentUser) {
        const credential = credentials.find((cred) => cred.username === currentUser);
        if (credential) {
          logout(credential);
        }
      }
    };
  }, [isRunning, currentUser]);

  const getRunningTime = (): string => {
    if (!startTime) return '';
    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderCredentialItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Credential>): React.ReactElement => (
    <TouchableOpacity
      className={`mb-2 flex-row items-center justify-between rounded bg-white p-2 ${isActive ? 'bg-gray-200' : ''}`}
      onLongPress={drag}>
      <Text>{item.username}</Text>
      <TouchableOpacity
        className="rounded bg-red-500 p-2"
        onPress={() => removeCredential(credentials.indexOf(item))}>
        <Text className="text-white">Remove</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      {/* <View className="flex-1 justify-center bg-black">
        <Text className="mx-auto text-2xl text-pink-200">Native Wind</Text>
      </View> */}
      <GestureHandlerRootView className="flex-1">
        <View className="flex-1 bg-gray-100 p-4">
          <Text className="mb-4 pt-12 text-2xl font-bold">Sophos Auto-Login</Text>
          <Text className="mb-2 text-lg">Status: {status}</Text>
          {currentUser && <Text className="mb-2 text-base">Current User: {currentUser}</Text>}
          {isRunning && <Text className="mb-2 text-base">Running Time: {getRunningTime()}</Text>}

          <View className="mb-4">
            <TextInput
              className="mb-2 rounded bg-white p-2"
              placeholder="Sophos URL"
              value={sophosUrl}
              onChangeText={(text: string) => {
                setSophosUrl(text);
                saveSophosUrl(text);
              }}
            />
          </View>

          <View className="mb-4">
            <TextInput
              className="mb-2 rounded bg-white p-2"
              placeholder="Username"
              value={newUsername}
              onChangeText={setNewUsername}
            />
            <TextInput
              className="mb-2 rounded bg-white p-2"
              placeholder="Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TouchableOpacity className="rounded bg-blue-500 p-2" onPress={addCredential}>
              <Text className="text-center text-white">Add Credential</Text>
            </TouchableOpacity>
          </View>

          <DraggableFlatList
            data={credentials}
            renderItem={renderCredentialItem}
            keyExtractor={(item, index) => `draggable-item-${item.username}-${index}`}
            onDragEnd={handleDragEnd}
            className="mb-4"
          />

          <View className="mb-4 flex-row justify-between">
            <TouchableOpacity
              className={`mr-2 flex-1 rounded p-2 ${isRunning ? 'bg-red-500' : 'bg-green-500'}`}
              onPress={isRunning ? stopAutoLogin : runAutoLogin}>
              <Text className="text-center text-white">
                {isRunning ? 'Stop Auto-Login' : 'Start Auto-Login'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mr-2 flex-1 rounded bg-yellow-500 p-2"
              onPress={handleRelogin}>
              <Text className="text-center text-white">Relogin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 rounded bg-purple-500 p-2"
              onPress={handleManualLogout}>
              <Text className="text-center text-white">Logout</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 rounded bg-white p-2">
            <Text className="mb-2 font-bold">Logs:</Text>
            {logs.map((log, index) => (
              <Text key={index} className="mb-1 text-sm">
                {log}
              </Text>
            ))}
          </View>
        </View>
      </GestureHandlerRootView>
    </>
  );
};

export default App;
