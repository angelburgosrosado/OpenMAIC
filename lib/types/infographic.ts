/**
 * Types for Grounded Infographic & Visual Knowledge Engine
 */

export type InfographicComplexityLevel = 'Elementary' | 'High School' | 'College' | 'Expert';

export type InfographicVisualStyle =
  | 'Default' // Standard Scientific
  | 'Minimalist'
  | 'Realistic' // Photorealistic
  | 'Cartoon' // Graphic Novel
  | 'Vintage' // Vintage Lithograph
  | 'Futuristic' // Cyberpunk HUD
  | '3D Render' // 3D Isometric
  | 'Sketch'; // Technical Blueprint

export type InfographicLanguage =
  | 'English'
  | 'Spanish'
  | 'French'
  | 'German'
  | 'Mandarin'
  | 'Japanese'
  | 'Hindi'
  | 'Arabic'
  | 'Portuguese'
  | 'Russian';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
}

export interface InfographicResearchResult {
  facts: string[];
  searchResults: SearchResultItem[];
  imagePrompt: string;
}

export interface GeneratedInfographic {
  id: string;
  data: string; // Base64 data URL or asset URL
  prompt: string;
  timestamp: number;
  level: InfographicComplexityLevel;
  style: InfographicVisualStyle;
  language: InfographicLanguage;
  facts?: string[];
  searchResults?: SearchResultItem[];
}
