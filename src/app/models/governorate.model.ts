export interface Governorate {
  id: number;
  nameAr: string;
  nameEn: string;
  name: string;
  descriptionAr: string;
  descriptionEn: string;
  description: string;
  imageUrl: string;
  coordinates?: { lat: number; lng: number };
}
