import axios from 'axios';
import dotenv from 'dotenv';
import { AuthResponse } from '../types/index.js';

dotenv.config();

const IFOOD_API_URL = 'https://merchant-api.ifood.com.br';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('CLIENT_ID ou CLIENT_SECRET não definidos! Verifique seu .env.');
}

let authToken: string | null = null;
let tokenExpiration: Date | null = null;

export async function getClientCredentialsToken(): Promise<string> {
  try {
    console.log('Obtendo novo token de autenticação...');
    console.log('CLIENT_ID:', CLIENT_ID);
    console.log('CLIENT_SECRET (parcial):', CLIENT_SECRET ? CLIENT_SECRET.substring(0, 10) + '...' : 'não definido');

    const AUTH_URL = `${IFOOD_API_URL}/authentication/v1.0/oauth/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID as string);
    params.append('client_secret', CLIENT_SECRET as string);

    console.log('Enviando requisição para:', AUTH_URL);
    console.log('Dados da requisição:', params.toString());

    const response = await axios.post<AuthResponse>(
      AUTH_URL,
      params.toString(), // <- Aqui!
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    console.log('Status da resposta:', response.status);
    console.log('Resposta da requisição de token:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.access_token) {
      authToken = response.data.access_token;
      tokenExpiration = new Date(Date.now() + (response.data.expires_in * 1000) - 300000);
      console.log('Token obtido com sucesso. Expira em:', tokenExpiration);
      return authToken;
    } else {
      console.error('Resposta completa da API:', response.data);
      throw new Error('Resposta da API não contém token de acesso');
    }
  } catch (error) {
    console.error('Erro ao obter token de autenticação:',
      axios.isAxiosError(error) && error.response ? error.response.data :
      error instanceof Error ? error.message : 'Erro desconhecido');
    throw error;
  }
}

/**
 * Verifica se o token atual é válido e retorna um token válido
 */
export async function getValidToken(): Promise<string> {
  if (!authToken || !tokenExpiration || new Date() >= tokenExpiration) {
    return await getClientCredentialsToken();
  }

  return authToken;
}

/**
 * Retorna o cabeçalho de autorização para as requisições
 */
export async function getAuthHeaders(): Promise<{ Authorization: string }> {
  const token = await getValidToken();
  return {
    'Authorization': `Bearer ${token}`
  };
}

export default {
  getClientCredentialsToken,
  getValidToken,
  getAuthHeaders
};
