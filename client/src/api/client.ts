import axios from 'axios';

export const API_BASE_URL = 'https://barcodegen-urp1.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});


