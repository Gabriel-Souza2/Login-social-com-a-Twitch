import { makeRedirectUri, revokeAsync, useAuthRequest, ResponseType, RevokeTokenRequestConfig} from 'expo-auth-session';
import React, { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';

import { api } from '../services/api';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

const AuthContext = createContext({} as AuthContextData);


function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  const { CLIENT_ID } = process.env;

  const REDIRECT_URI = makeRedirectUri({
    useProxy: true
  });

  const SCOPES = ['openid', 'user:read:email', 'user:read:follows'];

  const discovery = {
    authorizationEndpoint: 'https://id.twitch.tv/oauth2/authorize',
    tokenEndpoint: 'https://id.twitch.tv/oauth2/token',
    revocationEndpoint: 'https://id.twitch.tv/oauth2/revoke',
  };

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Token,
      clientId: CLIENT_ID as string,
      redirectUri: REDIRECT_URI,
      scopes: SCOPES,
    },
    discovery
  );

  async function getUsersInfos(){
    const { data } = await api.get('/users');

    const userData = data.data[0];

    setUser({
      id: userData.id,
      display_name: userData.display_name,
      email: userData.email,
      profile_image_url: userData.profile_image_url,
    });
  }

  useEffect(() => {
    if (response?.type === "success" && isLoggingIn) {
      const { access_token } = response.params;

      api.defaults.headers.common['Authorization'] =  `Bearer ${access_token}`;
      api.defaults.headers.common['Client-Id'] = CLIENT_ID

      setUserToken(access_token);
      getUsersInfos();
      
    }
  }, [response, user]);

  async function signIn() {
    try {
      
      setIsLoggingIn(true)

      await promptAsync({useProxy: true});

    } catch (error) {
      console.log(error);
    } finally {
      setIsLoggingIn(false)
    }

  }

  async function signOut() {
    try {
      setIsLoggingOut(true);

      const teste = await revokeAsync(
        {token: userToken, tokenTypeHint: 'access_token'} as RevokeTokenRequestConfig, 
        discovery
      );
    } catch (error) {
      console.log(error)
    } finally {
      // set user state to an empty User object
      setUser({} as User);
      // set userToken state to an empty string
      setUserToken("");
      // remove "access_token" from request's authorization header
      delete api.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Client-Id'];
      
      setIsLoggingOut(false);

      console.log(api.defaults.headers);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}>
      { children }
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };