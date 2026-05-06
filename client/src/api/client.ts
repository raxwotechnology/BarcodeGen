import axios from 'axios';

export const API_BASE_URL = 'https://barcodegen-4n5g.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});


